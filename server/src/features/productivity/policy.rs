use crate::{error::AppError, state::AppState};
pub const CAPABILITIES: [&str; 6] = ["create", "edit", "move", "archive", "comment", "upload"];
pub async fn enforce(
    s: &AppState,
    user: &str,
    project: &str,
    capability: &str,
) -> Result<(), AppError> {
    enforce_pool(&s.pool, user, project, None, capability).await
}
pub async fn enforce_pool(
    pool: &sqlx::SqlitePool,
    user: &str,
    project: &str,
    card: Option<&str>,
    capability: &str,
) -> Result<(), AppError> {
    let role = crate::features::enterprise::repository::role(pool, project, user)
        .await?
        .ok_or_else(|| AppError::Forbidden("Project access denied".into()))?;
    if matches!(role.as_str(), "owner" | "admin") {
        return Ok(());
    }
    if role == "viewer" || !super::repository::capability(pool, project, capability).await? {
        return Err(AppError::Forbidden(format!(
            "Your project role cannot {capability} tasks"
        )));
    }
    let permissions =
        crate::features::localops::repository::permissions(pool, project, user, card).await?;
    if permissions
        .iter()
        .any(|set| !set.iter().any(|v| v == capability))
    {
        return Err(AppError::Forbidden(format!(
            "Your custom role or task rule cannot {capability} this task"
        )));
    }
    Ok(())
}
