use super::{dto::*, repository as repo};
use crate::{error::AppError, state::AppState};
pub async fn get(
    s: &AppState,
    user: &str,
    workspace: &str,
    today: &str,
) -> Result<Dashboard, AppError> {
    crate::features::enterprise::access_repository::workspace_role(&s.pool, workspace, user)
        .await?
        .ok_or_else(|| AppError::Forbidden("Workspace access denied".into()))?;
    let day = chrono::NaiveDate::parse_from_str(today, "%Y-%m-%d")
        .map_err(|_| AppError::Validation("Use a valid calendar date: YYYY-MM-DD".into()))?;
    if day.to_string() != today {
        return Err(AppError::Validation("Use YYYY-MM-DD".into()));
    }
    let end = day
        .checked_add_days(chrono::Days::new(7))
        .ok_or_else(|| AppError::Validation("Date is out of range".into()))?
        .to_string();
    use repo::TaskList::*;
    Ok(Dashboard {
        today: today.into(),
        summary: repo::summary(&s.pool, user, workspace, today).await?,
        projects: repo::projects(&s.pool, user, workspace, today).await?,
        mine_overdue: repo::tasks(&s.pool, user, workspace, today, &end, MineOverdue).await?,
        mine_today: repo::tasks(&s.pool, user, workspace, today, &end, MineToday).await?,
        mine_upcoming: repo::tasks(&s.pool, user, workspace, today, &end, MineUpcoming).await?,
        attention: repo::tasks(&s.pool, user, workspace, today, &end, Attention).await?,
        deadlines: repo::tasks(&s.pool, user, workspace, today, &end, Deadlines).await?,
        notes: repo::notes(&s.pool, user, workspace).await?,
        activity: repo::activity(&s.pool, user, workspace).await?,
    })
}
