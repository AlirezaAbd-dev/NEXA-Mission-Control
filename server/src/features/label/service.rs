use chrono::Utc;
use uuid::Uuid;
use validator::Validate;

use crate::{
    error::AppError,
    features::{
        label::{
            dto::{CreateLabelRequest, LabelResponse, UpdateLabelRequest},
            models::Label,
            repository::LabelRepository,
        },
        workspace::repository::WorkspaceRepository,
    },
    state::AppState,
};

pub struct LabelService;

impl LabelService {
    pub async fn list_by_workspace(
        state: &AppState,
        workspace_id: &str,
        user_id: &str,
    ) -> Result<Vec<LabelResponse>, AppError> {
        let _ = WorkspaceRepository::get_user_role(&state.pool, workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this workspace".to_string()))?;

        let labels = LabelRepository::list_by_workspace(&state.pool, workspace_id).await?;
        Ok(labels.into_iter().map(Self::to_response).collect())
    }

    pub async fn create(
        state: &AppState,
        user_id: &str,
        req: CreateLabelRequest,
    ) -> Result<LabelResponse, AppError> {
        req.validate().map_err(|e| AppError::Validation(e.to_string()))?;

        let _ = WorkspaceRepository::get_user_role(&state.pool, &req.workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this workspace".to_string()))?;

        let id = Uuid::now_v7().to_string();
        let now = Utc::now().to_rfc3339();

        let label = LabelRepository::create(&state.pool, &id, &req.workspace_id, &req.name, &req.color, &now).await?;
        Ok(Self::to_response(label))
    }

    pub async fn update(
        state: &AppState,
        id: &str,
        user_id: &str,
        req: UpdateLabelRequest,
    ) -> Result<LabelResponse, AppError> {
        req.validate().map_err(|e| AppError::Validation(e.to_string()))?;

        let current = LabelRepository::find_by_id(&state.pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Label not found".to_string()))?;

        let _ = WorkspaceRepository::get_user_role(&state.pool, &current.workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this workspace".to_string()))?;

        let updated = LabelRepository::update(&state.pool, id, req.name.as_deref(), req.color.as_deref()).await?;
        Ok(Self::to_response(updated))
    }

    pub async fn delete(state: &AppState, id: &str, user_id: &str) -> Result<(), AppError> {
        let current = LabelRepository::find_by_id(&state.pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Label not found".to_string()))?;

        let _ = WorkspaceRepository::get_user_role(&state.pool, &current.workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this workspace".to_string()))?;

        LabelRepository::delete(&state.pool, id).await
    }

    fn to_response(l: Label) -> LabelResponse {
        LabelResponse {
            id: l.id,
            workspace_id: l.workspace_id,
            name: l.name,
            color: l.color,
            created_at: l.created_at,
        }
    }
}
