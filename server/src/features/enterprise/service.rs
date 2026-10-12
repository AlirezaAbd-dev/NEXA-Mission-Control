use super::{dto::*, operations as ops, repository as repo};
use crate::{error::AppError, state::AppState};
use serde_json::{json, Value};
use validator::Validate;

pub async fn authorize(
    state: &AppState,
    user: &str,
    project: &str,
    write: bool,
    admin: bool,
) -> Result<String, AppError> {
    let role = repo::role(&state.pool, project, user)
        .await?
        .ok_or_else(|| AppError::Forbidden("You do not have access to this project".into()))?;
    if (write && role == "viewer") || (admin && !matches!(role.as_str(), "owner" | "admin")) {
        return Err(AppError::Forbidden(
            "Your role does not allow this action".into(),
        ));
    }
    Ok(role)
}
pub async fn list(
    state: &AppState,
    user: &str,
    project: &str,
    resource: &str,
) -> Result<Value, AppError> {
    authorize(
        state,
        user,
        project,
        false,
        matches!(resource, "integrations" | "audit"),
    )
    .await?;
    repo::list(&state.pool, project, user, resource).await
}
pub async fn save(
    state: &AppState,
    user: &str,
    project: &str,
    resource: &str,
    id: Option<&str>,
    r: ResourceRequest,
) -> Result<Value, AppError> {
    r.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;
    authorize(
        state,
        user,
        project,
        resource != "views",
        matches!(resource, "rules" | "integrations"),
    )
    .await?;
    if r.name.trim().is_empty() {
        return Err(AppError::Validation("Name cannot be blank".into()));
    }
    if resource == "views" && !r.config.is_object() {
        return Err(AppError::Validation(
            "A saved view needs an object configuration".into(),
        ));
    }
    if resource == "rules" {
        super::automation::validate(&r)?;
    }
    if resource == "documents" {
        let url = r.url.as_deref().unwrap_or("");
        let parsed = reqwest::Url::parse(url)
            .map_err(|_| AppError::Validation("Use a valid HTTPS document URL".into()))?;
        if parsed.scheme() != "https"
            || parsed.host_str().is_none()
            || !parsed.username().is_empty()
            || parsed.password().is_some()
        {
            return Err(AppError::Validation(
                "Use an HTTPS document URL without embedded credentials".into(),
            ));
        }
        if r.kind.as_deref() == Some("figma")
            && !matches!(parsed.host_str(), Some("figma.com" | "www.figma.com"))
        {
            return Err(AppError::Validation(
                "Figma embeds must use a figma.com URL".into(),
            ));
        }
        if !url.starts_with("https://") || url.len() > 2048 {
            return Err(AppError::Validation(
                "Use a valid HTTPS document URL".into(),
            ));
        }
        if let Some(card) = &r.card_id {
            ops::require_card(&state.pool, project, card).await?;
        }
    }
    if resource == "integrations" {
        crate::features::integrations::service::validate(&r)?;
    }
    for d in [&r.start_date, &r.target_date].into_iter().flatten() {
        validate_date(d)?;
    }
    if resource == "epics"
        && (!r.color.starts_with('#')
            || r.color.len() != 7
            || !r.color[1..].chars().all(|c| c.is_ascii_hexdigit()))
    {
        return Err(AppError::Validation("Choose a valid hex color".into()));
    }
    if (resource == "epics"
        && !r.status.is_empty()
        && !matches!(r.status.as_str(), "planned" | "active" | "completed"))
        || (resource == "releases"
            && !r.status.is_empty()
            && !matches!(r.status.as_str(), "unreleased" | "released"))
    {
        return Err(AppError::Validation("Invalid status".into()));
    }
    let mut tx = state.pool.begin().await?;
    if let Some(id) = id {
        if !repo::owned(&mut tx, project, user, resource, id).await? {
            return Err(AppError::NotFound("Item not found".into()));
        }
    }
    let id = id
        .map(str::to_string)
        .unwrap_or_else(|| uuid::Uuid::now_v7().to_string());
    repo::save(&mut tx, project, user, resource, &id, &r).await?;
    repo::audit(
        &mut tx,
        project,
        None,
        Some(user),
        "saved_resource",
        json!({"resource":resource,"id":id,"name":r.name}),
    )
    .await?;
    tx.commit().await?;
    Ok(json!({"id":id}))
}
pub async fn remove(
    state: &AppState,
    user: &str,
    project: &str,
    resource: &str,
    id: &str,
) -> Result<Value, AppError> {
    authorize(
        state,
        user,
        project,
        resource != "views",
        matches!(resource, "rules" | "integrations"),
    )
    .await?;
    let mut tx = state.pool.begin().await?;
    if !repo::owned(&mut tx, project, user, resource, id).await? {
        return Err(AppError::NotFound("Item not found".into()));
    }
    repo::remove(&mut tx, resource, id).await?;
    repo::audit(
        &mut tx,
        project,
        None,
        Some(user),
        "deleted_resource",
        json!({"resource":resource,"id":id}),
    )
    .await?;
    tx.commit().await?;
    Ok(json!({"success":true}))
}
pub async fn bulk(
    state: &AppState,
    user: &str,
    project: &str,
    r: BulkRequest,
) -> Result<Value, AppError> {
    r.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;
    authorize(state, user, project, true, false).await?;
    if !matches!(
        r.action.as_str(),
        "move" | "priority" | "archive" | "restore" | "assign"
    ) {
        return Err(AppError::Validation("Unsupported bulk action".into()));
    }
    if r.action == "priority" {
        validate_priority(r.value.as_deref().unwrap_or(""))?;
    }
    if r.action == "move" {
        ops::require_column(&state.pool, project, r.value.as_deref().unwrap_or("")).await?;
    }
    if r.action == "assign" {
        ops::require_member(&state.pool, project, r.value.as_deref().unwrap_or("")).await?;
    }
    for card in &r.card_ids {
        let capability = match r.action.as_str() {
            "move" => "move",
            "archive" | "restore" => "archive",
            _ => "edit",
        };
        crate::features::productivity::policy::enforce_pool(
            &state.pool,
            user,
            project,
            Some(card),
            capability,
        )
        .await?;
    }
    let mut tx = state.pool.begin().await?;
    for card in &r.card_ids {
        if !ops::card_in_project(&mut tx, project, card).await? {
            return Err(AppError::NotFound("Task not found in this project".into()));
        }
        if r.action == "move" {
            crate::features::productivity::workflow::check_connection(
                &mut tx,
                project,
                card,
                r.value.as_deref().unwrap_or(""),
                Some(user),
            )
            .await?;
        }
        let before =
            crate::features::activity::audit_repository::task_snapshot_connection(&mut tx, card)
                .await?
                .unwrap_or(Value::Null);
        ops::bulk_update(&mut tx, card, &r).await?;
        let after =
            crate::features::activity::audit_repository::task_snapshot_connection(&mut tx, card)
                .await?
                .unwrap_or(Value::Null);
        crate::features::productivity::repository::status_connection(&mut tx, card).await?;
        repo::audit(
            &mut tx,
            project,
            Some(card),
            Some(user),
            "bulk_action",
            json!({"action":r.action,"value":r.value,"task_title":after.get("title"),"changes":crate::features::activity::audit_repository::changes(&before,&after)}),
        )
        .await?;
    }
    tx.commit().await?;
    if r.action == "move" {
        for card in &r.card_ids {
            super::automation::dispatch(state, project, card, "card_moved", Some(user)).await?;
        }
    }
    Ok(json!({"updated":r.card_ids.len()}))
}
pub async fn metadata(
    state: &AppState,
    user: &str,
    project: &str,
    card: &str,
    r: CardMetadataRequest,
) -> Result<Value, AppError> {
    authorize(state, user, project, true, false).await?;
    ops::require_card(&state.pool, project, card).await?;
    if let Some(parent) = &r.parent_id {
        ops::require_card(&state.pool, project, parent).await?;
        if parent == card || ops::would_cycle(&state.pool, card, parent).await? {
            return Err(AppError::Validation(
                "A task cannot be its own ancestor".into(),
            ));
        }
    }
    for (id, table) in [(&r.epic_id, "epics"), (&r.release_id, "releases")] {
        if let Some(id) = id {
            ops::require_resource(&state.pool, project, table, id).await?;
        }
    }
    for date in [&r.sla_due_at, &r.sla_response_due_at]
        .into_iter()
        .flatten()
    {
        chrono::DateTime::parse_from_rfc3339(date)
            .map_err(|_| AppError::Validation("SLA deadline must include a timezone".into()))?;
    }
    let mut tx = state.pool.begin().await?;
    ops::metadata(&mut tx, card, &r).await?;
    repo::audit(&mut tx,project,Some(card),Some(user),"updated_task_links",json!({"epic_id":r.epic_id,"parent_id":r.parent_id,"release_id":r.release_id,"sla_due_at":r.sla_due_at})).await?;
    tx.commit().await?;
    Ok(json!({"success":true}))
}
pub fn validate_date(date: &str) -> Result<(), AppError> {
    chrono::NaiveDate::parse_from_str(date.get(..10).unwrap_or(""), "%Y-%m-%d")
        .map_err(|_| AppError::Validation("Use an ISO date (YYYY-MM-DD)".into()))?;
    Ok(())
}
pub fn validate_priority(p: &str) -> Result<(), AppError> {
    if !matches!(p, "urgent" | "high" | "medium" | "low" | "no_priority") {
        return Err(AppError::Validation("Invalid priority".into()));
    }
    Ok(())
}
pub async fn preferences(
    state: &AppState,
    user: &str,
    project: &str,
    value: Option<Value>,
) -> Result<Value, AppError> {
    authorize(state, user, project, false, false).await?;
    if value.as_ref().is_some_and(|v| !v.is_object()) {
        return Err(AppError::Validation(
            "Board preferences must be an object".into(),
        ));
    }
    ops::preferences(&state.pool, project, user, value).await
}
pub async fn transition(
    state: &AppState,
    user: &str,
    project: &str,
    sprint: &str,
    r: SprintTransition,
) -> Result<Value, AppError> {
    authorize(state, user, project, true, false).await?;
    if !matches!(r.status.as_str(), "active" | "completed") {
        return Err(AppError::Validation("Choose active or completed".into()));
    }
    if r.status == "active" {
        let start = r
            .start_date
            .as_deref()
            .ok_or_else(|| AppError::Validation("Start date is required".into()))?;
        let end = r
            .end_date
            .as_deref()
            .ok_or_else(|| AppError::Validation("End date is required".into()))?;
        validate_date(start)?;
        validate_date(end)?;
        if start >= end {
            return Err(AppError::Validation(
                "Sprint end must be after its start".into(),
            ));
        }
    }
    let mut tx = state.pool.begin().await?;
    ops::transition(&mut tx, project, sprint, &r).await?;
    repo::audit(
        &mut tx,
        project,
        None,
        Some(user),
        "sprint_transition",
        json!({"sprint_id":sprint,"status":r.status,"carry_to":r.carry_to}),
    )
    .await?;
    tx.commit().await?;
    Ok(json!({"success":true}))
}

pub async fn workspace_metrics(
    state: &AppState,
    user: &str,
    workspace: &str,
) -> Result<Value, AppError> {
    super::access_repository::workspace_role(&state.pool, workspace, user)
        .await?
        .ok_or_else(|| AppError::Forbidden("Workspace access denied".into()))?;
    repo::workspace_metrics(&state.pool, workspace, user).await
}
