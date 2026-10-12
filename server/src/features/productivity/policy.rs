use crate::{error::AppError, state::AppState};
pub const CAPABILITIES: [&str; 6] = ["create", "edit", "move", "archive", "comment", "upload"];
pub async fn enforce(
    s: &AppState,
    user: &str,
    project: &str,
    capability: &str,
) -> Result<(), AppError> {
    let role = crate::features::enterprise::repository::role(&s.pool, project, user)
        .await?
        .ok_or_else(|| AppError::Forbidden("Project access denied".into()))?;
    if matches!(role.as_str(), "owner" | "admin") {
        return Ok(());
    }
    if role == "viewer" || !super::repository::capability(&s.pool, project, capability).await? {
        return Err(AppError::Forbidden(format!(
            "Your project role cannot {capability} tasks"
        )));
    }
    Ok(())
}
