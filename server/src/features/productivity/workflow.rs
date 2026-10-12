use crate::{error::AppError, state::AppState};
use sqlx::SqliteConnection;
pub async fn check(
    s: &AppState,
    p: &str,
    c: &str,
    to: &str,
    user: Option<&str>,
) -> Result<(), AppError> {
    let mut conn = s.pool.acquire().await?;
    check_connection(&mut conn, p, c, to, user).await
}
pub async fn check_connection(
    conn: &mut SqliteConnection,
    p: &str,
    c: &str,
    to: &str,
    user: Option<&str>,
) -> Result<(), AppError> {
    let (from, description, revision) = super::repository::move_facts(conn, p, c).await?;
    if from == to {
        return Ok(());
    }
    let rules = super::repository::rules(conn, p).await?;
    if rules.is_empty() {
        return Ok(());
    }
    let rule = rules
        .iter()
        .find(|r| r.from_column == from && r.to_column == to)
        .ok_or_else(|| {
            AppError::Validation("This transition is not allowed by the project workflow".into())
        })?;
    if rule.require_description == 1 && description.as_deref().is_none_or(|d| d.trim().is_empty()) {
        return Err(AppError::Validation(
            "Add a description before this transition".into(),
        ));
    }
    if rule.require_checklists == 1 {
        let unfinished = super::repository::unfinished(conn, c).await?;
        if unfinished > 0 {
            return Err(AppError::Validation(
                "Complete all checklist items before this transition".into(),
            ));
        }
    }
    if rule.allowed_role == "admin" {
        let role = super::repository::transition_role(conn, p, user.unwrap_or("")).await?;
        if !matches!(role.as_deref(), Some("owner" | "admin")) {
            return Err(AppError::Forbidden(
                "This transition requires an administrator".into(),
            ));
        }
    }
    if rule.require_approval == 1 {
        if !super::repository::approved(conn, c, &rule.id, &revision).await? {
            return Err(AppError::Validation(
                "Request approval for the current task revision before moving it".into(),
            ));
        }
    }
    Ok(())
}
