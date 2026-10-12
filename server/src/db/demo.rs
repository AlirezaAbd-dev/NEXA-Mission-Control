use crate::{error::AppError, state::AppState};
pub async fn seed(state: &AppState) -> Result<(), AppError> {
    if std::env::var("MISSION_CONTROL_DEMO").as_deref() != Ok("1") {
        return Ok(());
    }
    let email = "commander@nexa.internal";
    if crate::features::auth::repository::AuthRepository::find_by_email(&state.pool, email)
        .await?
        .is_some()
    {
        return Ok(());
    }
    let user = crate::features::auth::service::AuthService::register(
        state,
        crate::features::auth::dto::RegisterRequest {
            email: email.into(),
            username: "commander".into(),
            display_name: "NEXA Commander".into(),
            password: "Password123!".into(),
        },
    )
    .await?
    .user;
    let project:String=sqlx::query_scalar("SELECT p.id FROM projects p JOIN workspaces w ON w.id=p.workspace_id WHERE w.owner_id=? LIMIT 1").bind(&user.id).fetch_one(&state.pool).await?;
    let columns:Vec<(String,String)>=sqlx::query_as("SELECT c.id,c.name FROM columns c JOIN boards b ON b.id=c.board_id WHERE b.project_id=? ORDER BY c.position").bind(&project).fetch_all(&state.pool).await?;
    if columns.is_empty() {
        return Err(AppError::Internal("Demo project has no columns".into()));
    }
    let now = chrono::Utc::now().date_naive();
    for (i, (title, priority, points)) in [
        ("Plan the product launch", "high", 8.),
        ("Design the onboarding flow", "medium", 5.),
        ("Implement API authentication", "urgent", 8.),
        ("Write integration tests", "medium", 3.),
        ("Review customer feedback", "low", 2.),
        ("Publish release notes", "high", 3.),
    ]
    .into_iter()
    .enumerate()
    {
        let Some((column, _)) = columns.get(i % columns.len()) else {
            continue;
        };
        let card = crate::features::card::service::CardService::create(
            state,
            &user.id,
            crate::features::card::dto::CreateCardRequest {
                project_id: project.clone(),
                column_id: column.clone(),
                title: title.into(),
                description: Some(
                    "Demo task — edit, reschedule, and organize this work with your team.".into(),
                ),
                priority: Some(priority.into()),
                position: Some((i + 1) as f64 * 1000.),
                due_date: Some((now + chrono::Duration::days(i as i64 + 2)).to_string()),
                start_date: Some(now.to_string()),
                estimated_hours: None,
                is_template: None,
                story_points: Some(points),
                assignee_ids: Some(vec![user.id.clone()]),
                label_ids: None,
            },
        )
        .await?;
        tracing::debug!("Created demo task {}", card.id);
    }
    tracing::info!("Local demo workspace initialized. Demo mode must stay disabled in production.");
    Ok(())
}
