use super::{dto::Input, repository as repo};
use crate::{error::AppError, state::AppState};
use serde_json::{json, Value};
use validator::Validate;
fn bad(msg: &str) -> AppError {
    AppError::Validation(msg.into())
}
async fn admin(s: &AppState, u: &str, p: &str) -> Result<(), AppError> {
    crate::features::enterprise::service::authorize(s, u, p, false, true).await?;
    Ok(())
}
pub async fn staff(s: &AppState, u: &str, p: &str) -> Result<bool, AppError> {
    let role = crate::features::enterprise::service::authorize(s, u, p, false, false).await?;
    Ok(matches!(role.as_str(), "owner" | "admin")
        || (role != "viewer"
            && repo::permissions(&s.pool, p, u, None)
                .await?
                .iter()
                .any(|v| v.iter().any(|v| v == "desk_agent"))))
}
fn validate(r: &Input) -> Result<(), AppError> {
    r.validate().map_err(|e| bad(&e.to_string()))
}
pub async fn list(s: &AppState, u: &str, p: &str, k: &str) -> Result<Value, AppError> {
    let agent = staff(s, u, p).await?;
    if k == "session" {
        let role = crate::features::enterprise::service::authorize(s, u, p, false, false).await?;
        return Ok(
            json!({"can_manage":matches!(role.as_str(),"owner"|"admin"),"can_triage":agent}),
        );
    }
    if k == "agents" && !agent {
        return Err(AppError::Forbidden("Desk agent access required".into()));
    }
    if !matches!(k, "tickets" | "articles" | "agents") {
        admin(s, u, p).await?;
    }
    repo::list(&s.pool, p, u, agent, k).await
}
pub async fn save(s: &AppState, u: &str, p: &str, k: &str, r: Input) -> Result<Value, AppError> {
    validate(&r)?;
    let agent = staff(s, u, p).await?;
    if k == "tickets" {
        if r.id.is_some() && !agent {
            return Err(AppError::Forbidden(
                "Only desk agents can triage tickets".into(),
            ));
        }
    } else if k == "articles" {
        if !agent {
            return Err(AppError::Forbidden(
                "Only desk agents can write articles".into(),
            ));
        }
    } else {
        admin(s, u, p).await?;
    }
    let id =
        r.id.clone()
            .unwrap_or_else(|| uuid::Uuid::now_v7().to_string());
    if r.id.is_some()
        && matches!(k, "roles" | "articles" | "plugins")
        && !repo::owned(&s.pool, p, k, &id).await?
    {
        return Err(AppError::NotFound("Item not found in project".into()));
    }
    match k {
        "roles" | "task-permissions" => {
            let ps = r
                .permissions
                .as_ref()
                .ok_or_else(|| bad("Permissions required"))?;
            if ps.len() > 7
                || ps.iter().any(|v| {
                    !crate::features::productivity::policy::CAPABILITIES.contains(&v.as_str())
                        && !(k == "roles" && v == "desk_agent")
                })
            {
                return Err(bad("Unknown permission"));
            }
            if k == "roles" && r.name.trim().is_empty() {
                return Err(bad("Role name required"));
            }
            if k == "task-permissions" {
                crate::features::enterprise::operations::require_card(
                    &s.pool,
                    p,
                    r.card_id.as_deref().ok_or_else(|| bad("Task required"))?,
                )
                .await?;
            }
            if k == "task-permissions" {
                crate::features::enterprise::operations::require_member(
                    &s.pool,
                    p,
                    r.user_id.as_deref().ok_or_else(|| bad("Member required"))?,
                )
                .await?;
            }
        }
        "role-members" => {
            crate::features::enterprise::operations::require_member(
                &s.pool,
                p,
                r.user_id.as_deref().ok_or_else(|| bad("Member required"))?,
            )
            .await?;
            if !repo::role_exists(
                &s.pool,
                p,
                r.role_id.as_deref().ok_or_else(|| bad("Role required"))?,
            )
            .await?
            {
                return Err(bad("Role belongs to another project"));
            }
        }
        "tickets" => {
            if r.id.is_none() {
                if r.title.trim().is_empty() {
                    return Err(bad("Ticket title required"));
                }
            } else {
                repo::ticket(&s.pool, p, &id).await?;
                if !matches!(
                    r.status.as_deref(),
                    Some("new" | "open" | "pending" | "resolved" | "closed")
                ) {
                    return Err(bad("Invalid ticket status"));
                }
            }
            if let Some(priority) = &r.priority {
                crate::features::enterprise::service::validate_priority(priority)?;
            }
            if let Some(assignee) = &r.assignee_id {
                if !staff(s, assignee, p).await? {
                    return Err(bad("Assignee must be a desk agent"));
                }
            }
        }
        "articles" => {
            if r.title.trim().is_empty() || r.body.trim().is_empty() {
                return Err(bad("Article title and content required"));
            }
        }
        "desk-settings" => {
            if !(1..=8760).contains(&r.response_hours.unwrap_or(24))
                || !(1..=8760).contains(&r.resolution_hours.unwrap_or(72))
            {
                return Err(bad("SLA must be between 1 and 8760 hours"));
            }
        }
        "plugins" => {
            validate_manifest(
                r.manifest
                    .as_ref()
                    .ok_or_else(|| bad("Manifest required"))?,
            )?;
        }
        _ => return Err(AppError::NotFound("Unknown local resource".into())),
    }
    let mut tx = s.pool.begin().await?;
    repo::save(&mut tx, p, u, k, &id, &r).await?;
    repo::audit(&mut tx, p, u, &format!("local_{k}_saved"), &id).await?;
    tx.commit().await?;
    s.publish(
        Some(p),
        None,
        if matches!(k, "roles" | "role-members" | "task-permissions") {
            "permissions_changed"
        } else {
            "changed"
        },
    );
    Ok(json!({"id":id}))
}
pub async fn remove(s: &AppState, u: &str, p: &str, k: &str, id: &str) -> Result<Value, AppError> {
    admin(s, u, p).await?;
    let mut tx = s.pool.begin().await?;
    repo::remove(&mut tx, p, k, id).await?;
    repo::audit(&mut tx, p, u, &format!("local_{k}_removed"), id).await?;
    tx.commit().await?;
    s.publish(Some(p), None, "permissions_changed");
    Ok(json!({"success":true}))
}
async fn ticket_access(s: &AppState, u: &str, p: &str, id: &str) -> Result<bool, AppError> {
    let agent = staff(s, u, p).await?;
    let (requester, _) = repo::ticket(&s.pool, p, id).await?;
    if !agent && requester != u {
        return Err(AppError::Forbidden(
            "This request belongs to another user".into(),
        ));
    }
    Ok(agent)
}
pub async fn messages(s: &AppState, u: &str, p: &str, id: &str) -> Result<Value, AppError> {
    let agent = ticket_access(s, u, p, id).await?;
    repo::messages(&s.pool, id, u, agent).await
}
pub async fn message(
    s: &AppState,
    u: &str,
    p: &str,
    id: &str,
    r: Input,
) -> Result<Value, AppError> {
    validate(&r)?;
    let agent = ticket_access(s, u, p, id).await?;
    if r.body.trim().is_empty() {
        return Err(bad("Message required"));
    }
    if r.internal && !agent {
        return Err(AppError::Forbidden(
            "Internal notes are for desk agents".into(),
        ));
    }
    let mut tx = s.pool.begin().await?;
    repo::message(&mut tx, p, id, u, &r, agent).await?;
    repo::audit(&mut tx, p, u, "desk_message", id).await?;
    tx.commit().await?;
    s.publish(Some(p), None, "changed");
    Ok(json!({"success":true}))
}
pub fn validate_manifest(v: &Value) -> Result<(), AppError> {
    if v.to_string().len() > 65536 {
        return Err(bad("Plugin manifest must be at most 64 KiB"));
    }
    let obj = v
        .as_object()
        .ok_or_else(|| bad("Manifest must be a JSON object"))?;
    if obj
        .keys()
        .any(|k| !["schema", "name", "version", "description", "actions"].contains(&k.as_str()))
    {
        return Err(bad("Plugin supports declarative actions only; scripts, URLs and external services are unsupported"));
    }
    if v["schema"] != 1 {
        return Err(bad("Plugin schema must be 1"));
    }
    for key in ["name", "version"] {
        let x = v[key]
            .as_str()
            .ok_or_else(|| bad("Plugin name/version required"))?;
        if x.trim().is_empty() || x.len() > 120 {
            return Err(bad("Invalid plugin name/version"));
        }
    }
    let actions = v["actions"]
        .as_array()
        .ok_or_else(|| bad("Actions required"))?;
    if actions.is_empty() || actions.len() > 10 {
        return Err(bad("Plugin needs 1 to 10 actions"));
    }
    for a in actions {
        crate::features::enterprise::automation::validate_step(
            a["type"].as_str().unwrap_or(""),
            a["value"].as_str().unwrap_or(""),
        )?;
    }
    Ok(())
}
pub async fn run(s: &AppState, u: &str, p: &str, id: &str, r: Input) -> Result<Value, AppError> {
    admin(s, u, p).await?;
    let raw = repo::plugin(&s.pool, p, id).await?;
    let manifest: Value = serde_json::from_str(&raw).map_err(|_| bad("Invalid manifest"))?;
    validate_manifest(&manifest)?;
    let card = r.card_id.as_deref().ok_or_else(|| bad("Choose a task"))?;
    crate::features::enterprise::operations::require_card(&s.pool, p, card).await?;
    let rule = crate::features::enterprise::automation_repository::rule(&s.pool, p, id)
        .await?
        .ok_or_else(|| bad("Plugin rule not found"))?;
    crate::features::enterprise::automation_repository::execute(
        &s.pool,
        p,
        card,
        &rule,
        "local_plugin",
        Some(u),
    )
    .await?;
    s.publish(Some(p), None, "changed");
    Ok(json!({"success":true}))
}

pub async fn convert(
    s: &AppState,
    u: &str,
    p: &str,
    id: &str,
    r: Input,
) -> Result<Value, AppError> {
    if !ticket_access(s, u, p, id).await? {
        return Err(AppError::Forbidden(
            "Only agents can convert requests".into(),
        ));
    }
    crate::features::productivity::policy::enforce(s, u, p, "create").await?;
    let column = r
        .column_id
        .as_deref()
        .ok_or_else(|| bad("Choose a destination column"))?;
    crate::features::enterprise::operations::require_column(&s.pool, p, column).await?;
    let card = repo::convert(&s.pool, p, u, id, column).await?;
    s.publish(Some(p), None, "changed");
    Ok(json!({"id":card}))
}
