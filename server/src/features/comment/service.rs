use chrono::Utc;
use uuid::Uuid;
use validator::Validate;

use crate::{
    error::AppError,
    features::{
        card::repository::CardRepository,
        comment::{
            dto::{AddReactionRequest, CommentResponse, CreateCommentRequest, UpdateCommentRequest},
            repository::CommentRepository,
        },
        project::repository::ProjectRepository,
        workspace::repository::WorkspaceRepository,
    },
    state::AppState,
};

pub struct CommentService;

impl CommentService {
    pub async fn list_by_card(state: &AppState, card_id: &str, user_id: &str) -> Result<Vec<CommentResponse>, AppError> {
        let card = CardRepository::find_by_id(&state.pool, card_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Card not found".to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &card.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        let _ = WorkspaceRepository::get_user_role(&state.pool, &project.workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this card".to_string()))?;

        CommentRepository::list_by_card(&state.pool, card_id).await
    }

    pub async fn create(
        state: &AppState,
        user_id: &str,
        req: CreateCommentRequest,
    ) -> Result<CommentResponse, AppError> {
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

        let _ = CommentRepository::create(&state.pool, &id, &req.card_id, user_id, &req.body, &now).await?;

        let comments = CommentRepository::list_by_card(&state.pool, &req.card_id).await?;
        comments
            .into_iter()
            .find(|c| c.id == id)
            .ok_or_else(|| AppError::Internal("Failed to retrieve created comment".to_string()))
    }

    pub async fn update(
        state: &AppState,
        id: &str,
        user_id: &str,
        req: UpdateCommentRequest,
    ) -> Result<CommentResponse, AppError> {
        req.validate().map_err(|e| AppError::Validation(e.to_string()))?;

        let comment = CommentRepository::find_by_id(&state.pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Comment not found".to_string()))?;

        if comment.author_id.as_deref() != Some(user_id) {
            return Err(AppError::Forbidden("You can only edit your own comments".to_string()));
        }

        let now = Utc::now().to_rfc3339();
        CommentRepository::update(&state.pool, id, &req.body, &now).await?;

        let comments = CommentRepository::list_by_card(&state.pool, &comment.card_id).await?;
        comments
            .into_iter()
            .find(|c| c.id == id)
            .ok_or_else(|| AppError::Internal("Failed to retrieve updated comment".to_string()))
    }

    pub async fn delete(state: &AppState, id: &str, user_id: &str) -> Result<(), AppError> {
        let comment = CommentRepository::find_by_id(&state.pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Comment not found".to_string()))?;

        if comment.author_id.as_deref() != Some(user_id) {
            return Err(AppError::Forbidden("You can only delete your own comments".to_string()));
        }

        CommentRepository::delete(&state.pool, id).await
    }

    pub async fn toggle_reaction(
        state: &AppState,
        id: &str,
        user_id: &str,
        req: AddReactionRequest,
    ) -> Result<(), AppError> {
        req.validate().map_err(|e| AppError::Validation(e.to_string()))?;

        let comment = CommentRepository::find_by_id(&state.pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Comment not found".to_string()))?;

        let card = CardRepository::find_by_id(&state.pool, &comment.card_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Card not found".to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &card.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        let _ = WorkspaceRepository::get_user_role(&state.pool, &project.workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this card".to_string()))?;

        CommentRepository::toggle_reaction(&state.pool, id, user_id, &req.emoji).await
    }
}
