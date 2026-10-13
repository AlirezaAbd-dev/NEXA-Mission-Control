use chrono::Utc;
use uuid::Uuid;
use validator::Validate;

use crate::{
    error::AppError,
    features::{
        card::repository::CardRepository,
        comment::{
            dto::{
                AddReactionRequest, CommentResponse, CreateCommentRequest, UpdateCommentRequest,
            },
            repository::CommentRepository,
        },
        project::repository::ProjectRepository,
        workspace::repository::WorkspaceRepository,
    },
    state::AppState,
};

pub struct CommentService;

impl CommentService {
    pub async fn list_by_card(
        state: &AppState,
        card_id: &str,
        user_id: &str,
    ) -> Result<Vec<CommentResponse>, AppError> {
        let card = CardRepository::find_by_id(&state.pool, card_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Card not found".to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &card.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        let _ = WorkspaceRepository::get_user_role(&state.pool, &project.workspace_id, user_id)
            .await?
            .ok_or_else(|| {
                AppError::Forbidden("You do not have access to this card".to_string())
            })?;

        let role = crate::features::enterprise::service::authorize(
            state,
            user_id,
            &project.id,
            false,
            false,
        )
        .await?;
        let mut comments = CommentRepository::list_by_card(&state.pool, card_id).await?;
        let internal = crate::features::enterprise::internal_comments_repository::internal_ids(
            &state.pool,
            card_id,
        )
        .await?;
        for comment in &mut comments {
            comment.is_internal = internal.contains(&comment.id);
        }
        if !matches!(role.as_str(), "owner" | "admin") {
            comments.retain(|c| !c.is_internal);
        }
        Ok(comments)
    }

    pub async fn create(
        state: &AppState,
        user_id: &str,
        req: CreateCommentRequest,
    ) -> Result<CommentResponse, AppError> {
        req.validate()
            .map_err(|e| AppError::Validation(e.to_string()))?;

        let card = CardRepository::find_by_id(&state.pool, &req.card_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Card not found".to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &card.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        let _ = WorkspaceRepository::get_user_role(&state.pool, &project.workspace_id, user_id)
            .await?
            .ok_or_else(|| {
                AppError::Forbidden("You do not have access to this card".to_string())
            })?;

        crate::features::enterprise::service::authorize(
            state,
            user_id,
            &project.id,
            true,
            req.is_internal,
        )
        .await?;
        let id = Uuid::now_v7().to_string();
        let now = Utc::now().to_rfc3339();

        let _ = CommentRepository::create(&state.pool, &id, &req.card_id, user_id, &req.body, &now)
            .await?;

        crate::features::enterprise::internal_comments_repository::set_internal(
            &state.pool,
            &id,
            req.is_internal,
        )
        .await?;
        if !req.is_internal {
            crate::features::enterprise::operations::first_response(&state.pool, &req.card_id)
                .await?;
        }
        if let Err(error) = crate::features::enterprise::collaboration::comment_notifications(
            state,
            user_id,
            &req.card_id,
            &card.title,
            &req.body,
            req.is_internal,
        )
        .await
        {
            tracing::warn!("Comment notification failed: {}", error);
        }
        let comments = Self::list_by_card(state, &req.card_id, user_id).await?;
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
        req.validate()
            .map_err(|e| AppError::Validation(e.to_string()))?;

        let comment = CommentRepository::find_by_id(&state.pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Comment not found".to_string()))?;

        if comment.author_id.as_deref() != Some(user_id) {
            return Err(AppError::Forbidden(
                "You can only edit your own comments".to_string(),
            ));
        }

        let now = Utc::now().to_rfc3339();
        CommentRepository::update(&state.pool, id, &req.body, &now).await?;

        let comments = Self::list_by_card(state, &comment.card_id, user_id).await?;
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
            let is_admin = sqlx::query_scalar::<_, i64>(
                "SELECT count(*) FROM workspace_members wm 
                 JOIN projects p ON p.workspace_id = wm.workspace_id 
                 JOIN cards c ON c.project_id = p.id 
                 WHERE c.id = ?1 AND wm.user_id = ?2 AND wm.role IN ('owner', 'admin')",
            )
            .bind(&comment.card_id)
            .bind(user_id)
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0) > 0;

            if !is_admin {
                return Err(AppError::Forbidden(
                    "You can only delete your own comments".to_string(),
                ));
            }
        }

        CommentRepository::delete(&state.pool, id).await
    }

    pub async fn toggle_reaction(
        state: &AppState,
        id: &str,
        user_id: &str,
        req: AddReactionRequest,
    ) -> Result<(), AppError> {
        req.validate()
            .map_err(|e| AppError::Validation(e.to_string()))?;

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
            .ok_or_else(|| {
                AppError::Forbidden("You do not have access to this card".to_string())
            })?;

        CommentRepository::toggle_reaction(&state.pool, id, user_id, &req.emoji).await
    }
}
