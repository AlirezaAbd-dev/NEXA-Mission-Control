use chrono::Utc;
use uuid::Uuid;
use validator::Validate;

use crate::{
    error::AppError,
    features::{
        project::repository::ProjectRepository,
        sprint::{
            dto::{CreateSprintRequest, SprintResponse, UpdateSprintRequest},
            repository::SprintRepository,
        },
        workspace::repository::WorkspaceRepository,
    },
    state::AppState,
};

pub struct SprintService;

impl SprintService {
    pub async fn list_by_project(
        state: &AppState,
        project_id: &str,
        user_id: &str,
    ) -> Result<Vec<SprintResponse>, AppError> {
        let project = ProjectRepository::find_by_id(&state.pool, project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        let _ = WorkspaceRepository::get_user_role(&state.pool, &project.workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this project".to_string()))?;

        SprintRepository::list_by_project(&state.pool, project_id).await
    }

    pub async fn create(
        state: &AppState,
        user_id: &str,
        req: CreateSprintRequest,
    ) -> Result<SprintResponse, AppError> {
        req.validate().map_err(|e| AppError::Validation(e.to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &req.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        let _ = WorkspaceRepository::get_user_role(&state.pool, &project.workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this project".to_string()))?;

        let id = Uuid::now_v7().to_string();
        let now = Utc::now().to_rfc3339();

        let sprint = SprintRepository::create(
            &state.pool,
            &id,
            &req.project_id,
            &req.name,
            req.goal.as_deref(),
            req.start_date.as_deref(),
            req.end_date.as_deref(),
            &now,
        )
        .await?;

        Ok(SprintResponse {
            id: sprint.id,
            project_id: sprint.project_id,
            name: sprint.name,
            goal: sprint.goal,
            start_date: sprint.start_date,
            end_date: sprint.end_date,
            status: sprint.status,
            card_ids: Vec::new(),
            created_at: sprint.created_at,
        })
    }

    pub async fn update(
        state: &AppState,
        id: &str,
        user_id: &str,
        req: UpdateSprintRequest,
    ) -> Result<SprintResponse, AppError> {
        req.validate().map_err(|e| AppError::Validation(e.to_string()))?;

        let sprint = SprintRepository::find_by_id(&state.pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Sprint not found".to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &sprint.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        let _ = WorkspaceRepository::get_user_role(&state.pool, &project.workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this project".to_string()))?;

        if req.status.as_deref().is_some_and(|status|status!=sprint.status) {return Err(AppError::Validation("Use the sprint lifecycle endpoint to start or complete a sprint".into()));}
        let _ = SprintRepository::update(
            &state.pool,
            id,
            req.name.as_deref(),
            req.goal.as_deref().map(Some),
            req.start_date.as_deref().map(Some),
            req.end_date.as_deref().map(Some),
            req.status.as_deref(),
        )
        .await?;

        let list = SprintRepository::list_by_project(&state.pool, &sprint.project_id).await?;
        list.into_iter()
            .find(|s| s.id == id)
            .ok_or_else(|| AppError::Internal("Failed to retrieve updated sprint".to_string()))
    }

    pub async fn delete(state: &AppState, id: &str, user_id: &str) -> Result<(), AppError> {
        let sprint = SprintRepository::find_by_id(&state.pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Sprint not found".to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &sprint.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        let _ = WorkspaceRepository::get_user_role(&state.pool, &project.workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this project".to_string()))?;

        SprintRepository::delete(&state.pool, id).await
    }

    pub async fn toggle_card(
        state: &AppState,
        user_id: &str,
        sprint_id: &str,
        card_id: &str,
        add: bool,
    ) -> Result<(), AppError> {
        let sprint = SprintRepository::find_by_id(&state.pool,sprint_id).await?
            .ok_or_else(||AppError::NotFound("Sprint not found".into()))?;
        crate::features::enterprise::service::authorize(state,user_id,&sprint.project_id,true,false).await?;
        crate::features::enterprise::operations::require_card(&state.pool,&sprint.project_id,card_id).await?;
        if sprint.status == "completed" { return Err(AppError::Conflict("Completed sprint membership is frozen".into())); }
        let now = Utc::now().to_rfc3339();
        if add {
            SprintRepository::add_card(&state.pool, sprint_id, card_id, &now).await
        } else {
            SprintRepository::remove_card(&state.pool, sprint_id, card_id).await
        }
    }
}
