use crate::{error::AppError, state::AppState};
pub async fn run(s: &AppState) -> Result<(), AppError> {
    let projects = super::repository::repeat_and_remind(&s.pool).await?;
    for p in projects {
        s.publish(Some(&p), None, "changed");
    }
    Ok(())
}
