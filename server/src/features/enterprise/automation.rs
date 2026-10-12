use super::{automation_repository as repo, dto::ResourceRequest};
use crate::extractors::auth::AuthUser;
use crate::{error::AppError, state::AppState};
use axum::{
    extract::{Path, State},
    Json,
};
use serde_json::{json, Value};
pub fn validate(r: &ResourceRequest) -> Result<(), AppError> {
    if !matches!(
        r.trigger_type.as_deref(),
        Some(
            "card_created"
                | "card_moved"
                | "checklist_completed"
                | "due_date_reached"
                | "done_older_than"
                | "sla_breached"
                | "sla_response_breached"
                | "manual_card"
                | "manual_board"
        )
    ) {
        return Err(AppError::Validation("Unsupported trigger".into()));
    }
    if !matches!(
        r.action_type.as_deref(),
        Some(
            "set_priority"
                | "add_label"
                | "assign_user"
                | "mark_checklist_done"
                | "archive_card"
                | "move_card"
        )
    ) {
        return Err(AppError::Validation("Unsupported action".into()));
    }
    if r.action_type.as_deref() == Some("set_priority") {
        super::service::validate_priority(
            r.action_config
                .get("value")
                .and_then(Value::as_str)
                .unwrap_or(""),
        )?;
    }
    if matches!(
        r.action_type.as_deref(),
        Some("assign_user" | "add_label" | "move_card")
    ) && r
        .action_config
        .get("value")
        .and_then(Value::as_str)
        .unwrap_or("")
        .is_empty()
    {
        return Err(AppError::Validation("Choose an action target".into()));
    }
    if let Some(n) = r.trigger_config.get("days") {
        if n.as_i64().is_none_or(|n| !(1..=3650).contains(&n)) {
            return Err(AppError::Validation(
                "Days must be between 1 and 3650".into(),
            ));
        }
    }
    if let Some(priority) = r.trigger_config.get("priority").and_then(Value::as_str) {
        super::service::validate_priority(priority)?;
    }
    if let Some(steps) = r.action_config.get("steps") {
        let steps = steps
            .as_array()
            .ok_or_else(|| AppError::Validation("Actions must be an array".into()))?;
        if steps.len() > 9 {
            return Err(AppError::Validation(
                "A rule supports up to ten actions".into(),
            ));
        }
        for step in steps {
            validate_step(
                step.get("type").and_then(Value::as_str).unwrap_or(""),
                step.get("value").and_then(Value::as_str).unwrap_or(""),
            )?;
        }
    }
    Ok(())
}
pub fn validate_step(kind: &str, value: &str) -> Result<(), AppError> {
    match kind {
        "set_priority" => super::service::validate_priority(value),
        "archive_card" | "mark_checklist_done" => Ok(()),
        "assign_user" | "add_label" | "move_card" if !value.is_empty() => Ok(()),
        _ => Err(AppError::Validation(
            "Choose a valid action and target".into(),
        )),
    }
}
pub async fn dispatch(
    s: &AppState,
    project: &str,
    card: &str,
    event: &str,
    actor: Option<&str>,
) -> Result<(), AppError> {
    let rules = repo::rules(&s.pool, project, event).await?;
    for rule in rules {
        repo::execute(&s.pool, project, card, &rule, event, actor).await?;
        s.publish(Some(project), None, "changed");
    }
    Ok(())
}
pub async fn scheduled(s: &AppState) -> Result<(), AppError> {
    let candidates = repo::scheduled_candidates(&s.pool).await?;
    for (project, card, event) in candidates {
        dispatch(s, &project, &card, &event, None).await?;
    }
    super::operations::snapshot_all(&s.pool).await?;
    Ok(())
}
#[derive(serde::Deserialize)]
pub struct RunRequest {
    pub card_id: Option<String>,
}
pub async fn run_handler(
    State(s): State<AppState>,
    a: AuthUser,
    Path((p, id)): Path<(String, String)>,
    Json(r): Json<RunRequest>,
) -> Result<Json<Value>, AppError> {
    super::service::authorize(&s, &a.id, &p, true, false).await?;
    let rule = repo::rule(&s.pool, &p, &id)
        .await?
        .ok_or_else(|| AppError::NotFound("Macro not found".into()))?;
    if !matches!(rule.trigger_type.as_str(), "manual_card" | "manual_board") {
        return Err(AppError::Validation("Only manual macros can be run".into()));
    }
    let ids = if let Some(id) = r.card_id {
        super::operations::require_card(&s.pool, &p, &id).await?;
        vec![id]
    } else {
        if rule.trigger_type != "manual_board" {
            return Err(AppError::Validation("Choose a task for this macro".into()));
        }
        repo::card_ids(&s.pool, &p).await?
    };
    for id in &ids {
        repo::execute(&s.pool, &p, id, &rule, "manual", Some(&a.id)).await?;
    }
    Ok(Json(json!({"processed":ids.len()})))
}
