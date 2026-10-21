use super::access_repository as repo;
use crate::{error::AppError, extractors::auth::AuthUser, state::AppState};
use axum::{
    body::{to_bytes, Body},
    extract::{FromRequestParts, Request, State},
    http::Method,
    middleware::Next,
    response::Response,
};
use serde_json::Value;
pub async fn guard(
    State(state): State<AppState>,
    request: Request,
    next: Next,
) -> Result<Response, AppError> {
    let path = request.uri().path().to_owned();
    let suffix = path.trim_start_matches("/api/v1/");
    if !path.starts_with("/api/v1/")
        || suffix.starts_with("auth/")
        || suffix == "health"
        || suffix.starts_with("integrations/")
        || suffix.starts_with("realtime/")
        || suffix.starts_with("productivity/")
        || suffix.starts_with("localops/")
    {
        return Ok(next.run(request).await);
    }
    let write = !matches!(
        *request.method(),
        Method::GET | Method::HEAD | Method::OPTIONS
    );
    if request.method() == Method::OPTIONS {
        return Ok(next.run(request).await);
    }
    let (mut parts, body) = request.into_parts();
    let auth = AuthUser::from_request_parts(&mut parts, &state).await?;
    let query: std::collections::HashMap<String, String> = reqwest::Url::parse(&format!(
        "http://local/?{}",
        parts.uri.query().unwrap_or("")
    ))
    .map(|u| {
        u.query_pairs()
            .map(|(k, v)| (k.into_owned(), v.into_owned()))
            .collect()
    })
    .unwrap_or_default();
    let json_type = parts
        .headers
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .is_some_and(|v| v.starts_with("application/json"));
    let mut payload = Value::Null;
    let body = if json_type && write {
        let bytes = to_bytes(body, 2 * 1024 * 1024)
            .await
            .map_err(|_| AppError::Validation("Request body too large".into()))?;
        payload = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
        Body::from(bytes)
    } else {
        body
    };
    let fields = [
        "project_id",
        "card_id",
        "workspace_id",
        "board_id",
        "column_id",
        "checklist_id",
        "field_id",
    ];
    let mut audit_project: Option<String> = None;
    let mut audit_card: Option<String> = None;
    for field in fields {
        if let Some(id) = payload
            .get(field)
            .and_then(Value::as_str)
            .or_else(|| query.get(field).map(String::as_str))
        {
            let resource = match field {
                "project_id" => "projects",
                "card_id" => "cards",
                "board_id" => "boards",
                "column_id" => "columns",
                "checklist_id" => "checklists",
                "field_id" => "custom-fields",
                _ => "workspaces",
            };
            check(&state, &auth.id, resource, id, write, false).await?;
            if audit_card.is_none() {
                audit_card =
                    super::collaboration_repository::card_for_resource(&state.pool, resource, id)
                        .await?;
            }
            if audit_project.is_none() {
                audit_project = repo::project_for(&state.pool, resource, id).await?;
            }
        }
    }
    let segments: Vec<&str> = suffix.split('/').filter(|s| !s.is_empty()).collect();
    if let Some(resource) = segments.first() {
        if let Some(id) = segments.get(1) {
            let (resource, id) = if matches!(
                *id,
                "columns" | "items" | "values" | "definitions" | "project"
            ) && segments.len() > 2
            {
                (
                    if *id == "project" {
                        "projects"
                    } else if *id == "values" {
                        "cards"
                    } else if *id == "definitions" {
                        "custom-fields"
                    } else {
                        *id
                    },
                    segments[2],
                )
            } else {
                (*resource, *id)
            };
            if !matches!(
                id,
                "timer" | "active" | "start" | "stop" | "definitions" | "values"
            ) {
                let admin = (*segments.first().unwrap_or(&"") == "workspaces" && write)
                    || (*segments.first().unwrap_or(&"") == "projects" && write)
                    || (resource == "labels" && write);
                check(&state, &auth.id, resource, id, write, admin).await?;
                if audit_card.is_none() {
                    audit_card = super::collaboration_repository::card_for_resource(
                        &state.pool,
                        resource,
                        id,
                    )
                    .await?;
                }
                if audit_project.is_none() {
                    audit_project = repo::project_for(&state.pool, resource, id).await?;
                }
            }
        }
    }
    if suffix.starts_with("enterprise/projects/") {
        audit_project = segments.get(2).map(|id| id.to_string());
        if segments.get(3) == Some(&"cards") {
            audit_card = segments.get(4).map(|id| id.to_string());
        }
    }
    if write
        && (suffix.starts_with("cards")
            || suffix.starts_with("comments")
            || suffix.starts_with("checklists")
            || suffix.starts_with("time-logs")
            || suffix.starts_with("custom-fields")
            || suffix.contains("/metadata")
            || suffix.contains("/bulk")
            || suffix.contains("/attachments"))
    {
        if let Some(project) = &audit_project {
            let capability = if suffix.contains("/attachments") {
                "upload"
            } else if suffix.starts_with("comments") {
                "comment"
            } else if suffix.ends_with("/move")
                || payload.get("column_id").is_some() && segments.len() > 1
                || payload.get("action").and_then(Value::as_str) == Some("move")
            {
                "move"
            } else if (suffix.starts_with("cards")
                && (parts.method == Method::DELETE || suffix.ends_with("/archive")))
                || payload.get("action").and_then(Value::as_str) == Some("archive")
            {
                "archive"
            } else if suffix == "cards" && parts.method == Method::POST {
                "create"
            } else {
                "edit"
            };
            crate::features::productivity::policy::enforce_pool(
                &state.pool,
                &auth.id,
                project,
                audit_card.as_deref(),
                capability,
            )
            .await?;
        }
    }
    let audit_method = parts.method.to_string();
    let before = if write {
        if let Some(card) = &audit_card {
            crate::features::activity::audit_repository::task_snapshot(&state.pool, card).await?
        } else {
            None
        }
    } else {
        None
    };
    let response = next.run(Request::from_parts(parts, body)).await;
    if write
        && response.status().is_success()
        && !(suffix == "cards" && audit_method == "POST")
        && !(suffix.starts_with("cards/") && suffix.ends_with("/permanent") && audit_method == "DELETE")
        && !suffix.ends_with("/bulk")
        && !(suffix.contains("/rules/") && suffix.ends_with("/run"))
    {
        if let Some(project) = &audit_project {
            let after = if let Some(card) = &audit_card {
                crate::features::activity::audit_repository::task_snapshot(&state.pool, card)
                    .await?
            } else {
                None
            };
            let changes = crate::features::activity::audit_repository::changes(
                before.as_ref().unwrap_or(&Value::Null),
                after.as_ref().unwrap_or(&Value::Null),
            );
            let detail = serde_json::json!({"route":suffix,"method":audit_method,"task_title":after.as_ref().or(before.as_ref()).and_then(|v|v.get("title")),"changes":changes});
            let mut connection = state.pool.acquire().await?;
            super::repository::audit(
                &mut connection,
                &project,
                audit_card.as_deref(),
                Some(&auth.id),
                "api_mutation",
                detail,
            )
            .await?;
        }
    }
    if write && response.status().is_success() {
        state.publish(audit_project.as_deref(), Some(&auth.id), "changed");
        if suffix.starts_with("projects")
            || suffix.starts_with("workspaces/") && suffix.contains("/members")
        {
            state.publish(None, None, "permissions_changed");
        } else if suffix.starts_with("workspaces") {
            state.publish(None, None, "workspace_changed");
        }
    }
    Ok(response)
}
async fn check(
    s: &AppState,
    user: &str,
    resource: &str,
    id: &str,
    write: bool,
    admin: bool,
) -> Result<(), AppError> {
    let workspace = if resource == "workspaces" {
        Some(id.to_string())
    } else if resource == "labels" {
        repo::label_workspace(&s.pool, id).await?
    } else {
        None
    };
    if let Some(workspace) = workspace {
        let role = repo::workspace_role(&s.pool, &workspace, user)
            .await?
            .ok_or_else(|| AppError::Forbidden("Workspace access denied".into()))?;
        if write && (role == "viewer" || admin && !matches!(role.as_str(), "owner" | "admin")) {
            return Err(AppError::Forbidden(
                "Your role does not allow this action".into(),
            ));
        }
        return Ok(());
    }
    if let Some(project) = repo::project_for(&s.pool, resource, id).await? {
        let restricted = resource == "comments" && repo::internal_comment(&s.pool, id).await?;
        super::service::authorize(s, user, &project, write, admin || restricted).await?;
    }
    Ok(())
}
