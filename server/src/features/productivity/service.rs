use super::{dto::Input, repository as repo};
use crate::{
    error::AppError,
    features::enterprise::{operations, service as access},
    state::AppState,
};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use validator::Validate;
fn validate(r: &Input) -> Result<(), AppError> {
    r.validate()
        .map_err(|e| AppError::Validation(e.to_string()))
}
fn title(r: &Input) -> Result<(), AppError> {
    validate(r)?;
    if r.title.trim().is_empty() {
        return Err(AppError::Validation("Title is required".into()));
    }
    Ok(())
}
pub async fn personal(s: &AppState, u: &str, k: &str) -> Result<Value, AppError> {
    repo::personal(&s.pool, u, k).await
}
pub async fn save_personal(
    s: &AppState,
    u: &str,
    k: &str,
    id: Option<&str>,
    r: Input,
) -> Result<Value, AppError> {
    title(&r)?;
    if k == "planner" {
        let start = chrono::DateTime::parse_from_rfc3339(r.start_at.as_deref().unwrap_or(""))
            .map_err(|_| AppError::Validation("Choose a valid start time".into()))?;
        let end = chrono::DateTime::parse_from_rfc3339(r.end_at.as_deref().unwrap_or(""))
            .map_err(|_| AppError::Validation("Choose a valid end time".into()))?;
        if end <= start || end - start > chrono::Duration::days(7) {
            return Err(AppError::Validation(
                "End must follow start within seven days".into(),
            ));
        }
        if let Some(c) = &r.card_id {
            let p =
                crate::features::enterprise::access_repository::project_for(&s.pool, "cards", c)
                    .await?
                    .ok_or_else(|| AppError::NotFound("Task not found".into()))?;
            access::authorize(s, u, &p, false, false).await?;
        }
    }
    let result = repo::save_personal(&s.pool, u, k, id, &r).await?;
    s.publish(None, Some(u), "changed");
    Ok(result)
}
pub async fn delete_personal(s: &AppState, u: &str, k: &str, id: &str) -> Result<Value, AppError> {
    repo::delete_personal(&s.pool, u, k, id).await?;
    s.publish(None, Some(u), "changed");
    Ok(json!({"success":true}))
}
pub async fn convert(s: &AppState, u: &str, id: &str, r: Input) -> Result<Value, AppError> {
    let p = r.project_id.as_deref().unwrap_or("");
    let col = r.column_id.as_deref().unwrap_or("");
    access::authorize(s, u, p, true, false).await?;
    operations::require_column(&s.pool, p, col).await?;
    super::policy::enforce(s, u, p, "create").await?;
    let c = repo::convert(&s.pool, u, id, p, col).await?;
    repo::status(&s.pool, &c).await?;
    s.publish(Some(p), Some(u), "changed");
    s.publish(None, Some(u), "changed");
    Ok(json!({"id":c}))
}
pub async fn work(s: &AppState, u: &str, w: &str) -> Result<Value, AppError> {
    crate::features::enterprise::access_repository::workspace_role(&s.pool, w, u)
        .await?
        .ok_or_else(|| AppError::Forbidden("Workspace access denied".into()))?;
    Ok(json!(repo::work(&s.pool, u, w).await?))
}
pub async fn resources(s: &AppState, u: &str, p: &str, k: &str) -> Result<Value, AppError> {
    access::authorize(s, u, p, false, false).await?;
    if k == "members" {
        return repo::members(&s.pool, p).await;
    }
    if k == "permissions" {
        return repo::permissions(&s.pool, p).await;
    }
    if k == "mirrors" {
        return repo::mirrors(&s.pool, p, u).await;
    }
    if k == "templates" {
        return repo::templates(&s.pool, p).await;
    }
    if k == "reports" {
        return repo::reports(&s.pool, p).await;
    }
    repo::resources(&s.pool, p, k).await
}
pub async fn save_resource(
    s: &AppState,
    u: &str,
    p: &str,
    k: &str,
    r: Input,
) -> Result<Value, AppError> {
    validate(&r)?;
    access::authorize(s, u, p, true, true).await?;
    if r.name.trim().is_empty() && k != "members" {
        return Err(AppError::Validation("Name is required".into()));
    }
    if k == "members" {
        let target = r.user_id.as_deref().unwrap_or("");
        let workspace = repo::project_workspace(&s.pool, p).await?;
        let wm_role = crate::features::enterprise::access_repository::workspace_role(
            &s.pool, &workspace, target,
        )
        .await?
        .ok_or_else(|| AppError::Validation("Add this user to the workspace first".into()))?;
        if matches!(wm_role.as_str(), "owner" | "admin") {
            return Err(AppError::Validation(
                "Workspace administrator access is inherited".into(),
            ));
        }
        if !matches!(r.allowed_role.as_str(), "admin" | "member" | "viewer")
            || wm_role == "viewer" && r.allowed_role != "viewer"
        {
            return Err(AppError::Validation(
                "Choose an appropriate project role; workspace viewers remain read-only".into(),
            ));
        }
        repo::save_member(&s.pool, p, target, &r.allowed_role).await?;
        s.publish(None, None, "permissions_changed");
        return Ok(json!({"success":true}));
    }
    if k == "templates" {
        template_admin(s, u, p).await?;
        let id = repo::save_template(&s.pool, p, &r.name).await?;
        s.publish(Some(p), None, "changed");
        return Ok(json!({"id":id}));
    }
    if k == "permissions" {
        let allowed = r.permissions.unwrap_or_default();
        if allowed
            .iter()
            .any(|c| !super::policy::CAPABILITIES.contains(&c.as_str()))
        {
            return Err(AppError::Validation("Unknown permission".into()));
        }
        repo::set_permissions(&s.pool, p, &allowed).await?;
        s.publish(None, None, "permissions_changed");
        return Ok(json!({"success":true}));
    }
    if k == "mirrors" {
        let card = r.card_id.as_deref().unwrap_or("");
        let source =
            crate::features::enterprise::access_repository::project_for(&s.pool, "cards", card)
                .await?
                .ok_or_else(|| AppError::NotFound("Source task not found".into()))?;
        access::authorize(s, u, &source, false, false).await?;
        if source == p {
            return Err(AppError::Validation(
                "Choose a task from another project".into(),
            ));
        }
        let id = repo::mirror(&s.pool, p, card).await?;
        s.publish(Some(p), None, "changed");
        return Ok(json!({"id":id}));
    }
    if k == "workflows" {
        for col in [&r.from_column, &r.to_column] {
            operations::require_column(&s.pool, p, col.as_deref().unwrap_or("")).await?;
        }
        if r.from_column == r.to_column {
            return Err(AppError::Validation("Choose different columns".into()));
        }
        if !matches!(r.allowed_role.as_str(), "" | "member" | "admin") {
            return Err(AppError::Validation("Choose member or admin".into()));
        }
    }
    if k == "forms" {
        operations::require_column(&s.pool, p, r.column_id.as_deref().unwrap_or("")).await?;
    }
    let mut bytes = [0u8; 32];
    rand_core::RngCore::fill_bytes(&mut rand_core::OsRng, &mut bytes);
    let token = bytes.iter().map(|b| format!("{b:02x}")).collect::<String>();
    let hash = format!("{:x}", Sha256::digest(token.as_bytes()));
    let id = repo::save_resource(&s.pool, p, k, &r, Some(&hash)).await?;
    s.publish(Some(p), Some(u), "changed");
    Ok(if k == "forms" {
        json!({"id":id,"token":token})
    } else {
        json!({"id":id})
    })
}
pub async fn delete_resource(
    s: &AppState,
    u: &str,
    p: &str,
    k: &str,
    id: &str,
) -> Result<Value, AppError> {
    access::authorize(s, u, p, true, true).await?;
    if k == "templates" {
        template_admin(s, u, p).await?;
    }
    repo::delete_resource(&s.pool, p, k, id).await?;
    if k == "members" {
        s.publish(None, None, "permissions_changed");
    }
    s.publish(Some(p), Some(u), "changed");
    Ok(json!({"success":true}))
}
pub async fn settings(
    s: &AppState,
    u: &str,
    p: &str,
    c: &str,
    r: Input,
) -> Result<Value, AppError> {
    access::authorize(s, u, p, true, false).await?;
    operations::require_card(&s.pool, p, c).await?;
    if r.repeat_days.is_some_and(|n| !(1..=365).contains(&n))
        || r.reminder_minutes
            .is_some_and(|n| !(0..=10080).contains(&n))
    {
        return Err(AppError::Validation(
            "Repeat must be 1–365 days and reminder 0–10080 minutes".into(),
        ));
    }
    if let Some(t) = &r.work_type_id {
        if !repo::type_in_project(&s.pool, p, t).await? {
            return Err(AppError::Validation(
                "Work type belongs to another project".into(),
            ));
        }
    }
    super::policy::enforce_pool(&s.pool, u, p, Some(c), "edit").await?;
    let before = crate::features::activity::audit_repository::task_snapshot(&s.pool, c)
        .await?
        .unwrap_or(Value::Null);
    repo::settings(&s.pool, c, &r).await?;
    let after = crate::features::activity::audit_repository::task_snapshot(&s.pool, c)
        .await?
        .unwrap_or(Value::Null);
    let mut conn = s.pool.acquire().await?;
    crate::features::enterprise::repository::audit(&mut conn,p,Some(c),Some(u),"updated_process_settings",json!({"task_title":after.get("title"),"changes":crate::features::activity::audit_repository::changes(&before,&after)})).await?;
    drop(conn);
    s.publish(Some(p), Some(u), "changed");
    Ok(json!({"success":true}))
}
pub async fn approval(
    s: &AppState,
    u: &str,
    p: &str,
    c: &str,
    r: Input,
) -> Result<Value, AppError> {
    access::authorize(s, u, p, true, false).await?;
    operations::require_card(&s.pool, p, c).await?;
    let mut conn = s.pool.acquire().await?;
    let rules = repo::rules(&mut conn, p).await?;
    let id = r.transition_id.as_deref().unwrap_or("");
    if !rules.iter().any(|r| r.id == id && r.require_approval == 1) {
        return Err(AppError::Validation("Approval transition not found".into()));
    }
    drop(conn);
    let id = repo::approval(&s.pool, u, c, id).await?;
    s.publish(Some(p), None, "changed");
    Ok(json!({"id":id}))
}
pub async fn approve(s: &AppState, u: &str, p: &str, id: &str) -> Result<Value, AppError> {
    access::authorize(s, u, p, true, true).await?;
    repo::approve(&s.pool, p, u, id).await?;
    s.publish(Some(p), None, "changed");
    Ok(json!({"success":true}))
}
pub async fn form(s: &AppState, token: &str) -> Result<Value, AppError> {
    let f = repo::form(&s.pool, &format!("{:x}", Sha256::digest(token.as_bytes()))).await?;
    Ok(json!({"name":f.name,"require_description":f.require_description}))
}
pub async fn apply_template(s: &AppState, u: &str, p: &str, id: &str) -> Result<Value, AppError> {
    access::authorize(s, u, p, true, true).await?;
    template_admin(s, u, p).await?;
    let data = repo::template(&s.pool, p, id).await?;
    let cards = crate::features::enterprise::import::normalize(
        &crate::features::enterprise::import::ImportRequest {
            format: "mission-control".into(),
            data,
        },
    )?;
    let n = crate::features::enterprise::import_repository::import(&s.pool, p, u, cards).await?;
    s.publish(Some(p), None, "changed");
    Ok(json!({"imported":n}))
}
pub async fn submit(s: &AppState, token: &str, r: Input) -> Result<Value, AppError> {
    title(&r)?;
    let f = repo::form(&s.pool, &format!("{:x}", Sha256::digest(token.as_bytes()))).await?;
    if f.require_description == 1 && r.description.trim().is_empty() {
        return Err(AppError::Validation("Description is required".into()));
    }
    let id = repo::submit(&s.pool, &f, &r).await?;
    repo::status(&s.pool, &id).await?;
    s.publish(Some(&f.project_id), None, "changed");
    Ok(json!({"success":true}))
}
pub async fn capacity(s: &AppState, u: &str, w: &str) -> Result<Value, AppError> {
    crate::features::enterprise::access_repository::workspace_role(&s.pool, w, u)
        .await?
        .ok_or_else(|| AppError::Forbidden("Workspace access denied".into()))?;
    repo::capacity(&s.pool, w).await
}
pub async fn save_capacity(s: &AppState, u: &str, w: &str, r: Input) -> Result<Value, AppError> {
    let role =
        crate::features::enterprise::access_repository::workspace_role(&s.pool, w, u).await?;
    if !matches!(role.as_deref(), Some("owner" | "admin")) {
        return Err(AppError::Forbidden(
            "Only workspace administrators can edit capacity".into(),
        ));
    }
    let target = r.user_id.as_deref().unwrap_or("");
    if crate::features::enterprise::access_repository::workspace_role(&s.pool, w, target)
        .await?
        .is_none()
    {
        return Err(AppError::Validation("Choose a workspace member".into()));
    }
    let hours = r.weekly_hours.unwrap_or(40.);
    if !hours.is_finite() || !(0.0..=168.0).contains(&hours) {
        return Err(AppError::Validation(
            "Weekly capacity must be between 0 and 168 hours".into(),
        ));
    }
    repo::set_capacity(&s.pool, w, target, hours).await?;
    s.publish(None, None, "workspace_changed");
    Ok(json!({"success":true}))
}
async fn template_admin(s: &AppState, u: &str, p: &str) -> Result<(), AppError> {
    let workspace = repo::project_workspace(&s.pool, p).await?;
    let role =
        crate::features::enterprise::access_repository::workspace_role(&s.pool, &workspace, u)
            .await?;
    if !matches!(role.as_deref(), Some("owner" | "admin")) {
        return Err(AppError::Forbidden(
            "Only workspace administrators can manage shared templates".into(),
        ));
    }
    Ok(())
}
pub async fn development(s: &AppState, u: &str, p: &str, c: &str) -> Result<Value, AppError> {
    access::authorize(s, u, p, false, false).await?;
    operations::require_card(&s.pool, p, c).await?;
    repo::development(&s.pool, c).await
}
