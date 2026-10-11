use chrono::Utc;
use uuid::Uuid;
use validator::Validate;

use crate::{
    error::AppError,
    features::{
        card::repository::CardRepository,
        project::repository::ProjectRepository,
        time_log::{
            dto::{CreateTimeLogRequest, TimeLogResponse},
            repository::TimeLogRepository,
        },
        workspace::repository::WorkspaceRepository,
    },
    state::AppState,
};

pub struct TimeLogService;

impl TimeLogService {
    pub async fn list_by_card(state: &AppState, card_id: &str, user_id: &str) -> Result<Vec<TimeLogResponse>, AppError> {
        let card = CardRepository::find_by_id(&state.pool, card_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Card not found".to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &card.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        let _ = WorkspaceRepository::get_user_role(&state.pool, &project.workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this card".to_string()))?;

        TimeLogRepository::list_by_card(&state.pool, card_id).await
    }

    pub async fn create(
        state: &AppState,
        user_id: &str,
        req: CreateTimeLogRequest,
    ) -> Result<TimeLogResponse, AppError> {
        req.validate().map_err(|e| AppError::Validation(e.to_string()))?;

        let card = CardRepository::find_by_id(&state.pool, &req.card_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Card not found".to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &card.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        let _ = WorkspaceRepository::get_user_role(&state.pool, &project.workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this card".to_string()))?;

        let id = Uuid::now_v7().to_string();
        let now = Utc::now().to_rfc3339();

        let _ = TimeLogRepository::create(
            &state.pool,
            &id,
            &req.card_id,
            user_id,
            req.minutes,
            req.description.as_deref(),
            &now,
        )
        .await?;

        let logs = TimeLogRepository::list_by_card(&state.pool, &req.card_id).await?;
        logs.into_iter()
            .find(|l| l.id == id)
            .ok_or_else(|| AppError::Internal("Failed to retrieve created time log".to_string()))
    }

    pub async fn delete(state: &AppState, id: &str, _user_id: &str) -> Result<(), AppError> {
        TimeLogRepository::delete(&state.pool, id).await
    }

    pub async fn get_active_timer(
        state: &AppState,
        card_id: &str,
        user_id: &str,
    ) -> Result<Option<crate::features::time_log::dto::ActiveTimerResponse>, AppError> {
        TimeLogRepository::get_active_timer(&state.pool, card_id, user_id).await
    }

    pub async fn start_timer(
        state: &AppState,
        user_id: &str,
        req: crate::features::time_log::dto::StartTimerRequest,
    ) -> Result<crate::features::time_log::dto::ActiveTimerResponse, AppError> {
        let card = CardRepository::find_by_id(&state.pool, &req.card_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Card not found".to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &card.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        let _ = WorkspaceRepository::get_user_role(&state.pool, &project.workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this card".to_string()))?;

        let id = Uuid::now_v7().to_string();
        let now = Utc::now().to_rfc3339();

        TimeLogRepository::start_timer(
            &state.pool,
            &id,
            &req.card_id,
            user_id,
            &now,
            req.description.as_deref(),
        )
        .await
    }

    pub async fn stop_timer(
        state: &AppState,
        user_id: &str,
        req: crate::features::time_log::dto::StopTimerRequest,
    ) -> Result<Option<TimeLogResponse>, AppError> {
        let active = TimeLogRepository::get_active_timer(&state.pool, &req.card_id, user_id).await?;
        let active = match active {
            Some(timer) => timer,
            None => return Ok(None),
        };

        // Calculate duration
        let started_dt = chrono::DateTime::parse_from_rfc3339(&active.started_at)
            .map_err(|e| AppError::Internal(format!("Failed to parse started_at: {}", e)))?
            .with_timezone(&Utc);

        let elapsed_seconds = (Utc::now() - started_dt).num_seconds().max(0);
        let minutes = ((elapsed_seconds as f64) / 60.0).ceil() as i64;
        let minutes = minutes.max(1); // at least 1 minute

        TimeLogRepository::delete_active_timer(&state.pool, &req.card_id, user_id).await?;

        let log_id = Uuid::now_v7().to_string();
        let now = Utc::now().to_rfc3339();
        let desc = req.description.or(active.description);

        let _ = TimeLogRepository::create(
            &state.pool,
            &log_id,
            &req.card_id,
            user_id,
            minutes,
            desc.as_deref(),
            &now,
        )
        .await?;

        let logs = TimeLogRepository::list_by_card(&state.pool, &req.card_id).await?;
        Ok(logs.into_iter().find(|l| l.id == log_id))
    }
}

