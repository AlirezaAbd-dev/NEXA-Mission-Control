use chrono::Utc;
use uuid::Uuid;
use validator::Validate;

use crate::{
    error::AppError,
    features::{
        card::{
            dto::{CardResponse, CreateCardRequest, ListCardsQuery, MoveCardRequest, UpdateCardRequest},
            repository::CardRepository,
        },
        project::repository::ProjectRepository,
        workspace::repository::WorkspaceRepository,
    },
    state::AppState,
};

pub struct CardService;

impl CardService {
    pub async fn list(state: &AppState, user_id: &str, query: ListCardsQuery) -> Result<Vec<CardResponse>, AppError> {
        let project = ProjectRepository::find_by_id(&state.pool, &query.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        let _ = WorkspaceRepository::get_user_role(&state.pool, &project.workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this project".to_string()))?;

        CardRepository::list(&state.pool, &query, Some(user_id)).await
    }

    pub async fn get_by_id(state: &AppState, id: &str, user_id: &str) -> Result<CardResponse, AppError> {
        let card = CardRepository::find_by_id(&state.pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Card not found".to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &card.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        let _ = WorkspaceRepository::get_user_role(&state.pool, &project.workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this card".to_string()))?;

        CardRepository::get_card_response(&state.pool, id, Some(user_id))
            .await?
            .ok_or_else(|| AppError::NotFound("Card not found".to_string()))

    }

    pub async fn create(
        state: &AppState,
        user_id: &str,
        req: CreateCardRequest,
    ) -> Result<CardResponse, AppError> {
        req.validate().map_err(|e| AppError::Validation(e.to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &req.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        let _ = WorkspaceRepository::get_user_role(&state.pool, &project.workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this project".to_string()))?;

        let id = Uuid::now_v7().to_string();
        let now = Utc::now().to_rfc3339();
        let priority = req.priority.unwrap_or_else(|| "no_priority".to_string());
        let position = req.position.unwrap_or(1000.0);

        CardRepository::create(
            &state.pool,
            &id,
            &req.project_id,
            &req.column_id,
            &req.title,
            req.description.as_deref(),
            &priority,
            position,
            Some(user_id),
            req.due_date.as_deref(),
            req.start_date.as_deref(),
            req.estimated_hours,
            req.is_template.unwrap_or(false),
            req.story_points,
            &now,
        )
        .await?;

        if let Some(ref assignees) = req.assignee_ids {
            CardRepository::set_assignees(&state.pool, &id, assignees).await?;
        }

        if let Some(ref labels) = req.label_ids {
            CardRepository::set_labels(&state.pool, &id, labels).await?;
        }

        // Log activity
        let _ = sqlx::query(
            "INSERT INTO activities (id, workspace_id, project_id, card_id, actor_id, action, payload, created_at) VALUES (?1, ?2, ?3, ?4, ?5, 'created_card', ?6, ?7)"
        )
        .bind(Uuid::now_v7().to_string())
        .bind(&project.workspace_id)
        .bind(&project.id)
        .bind(&id)
        .bind(user_id)
        .bind(serde_json::json!({ "title": req.title }).to_string())
        .bind(&now)
        .execute(&state.pool)
        .await;

        CardRepository::get_card_response(&state.pool, &id, Some(user_id))
            .await?
            .ok_or_else(|| AppError::Internal("Failed to retrieve created card".to_string()))
    }

    pub async fn update(
        state: &AppState,
        id: &str,
        user_id: &str,
        req: UpdateCardRequest,
    ) -> Result<CardResponse, AppError> {
        req.validate().map_err(|e| AppError::Validation(e.to_string()))?;

        let card = CardRepository::find_by_id(&state.pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Card not found".to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &card.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        let _ = WorkspaceRepository::get_user_role(&state.pool, &project.workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this card".to_string()))?;

        let now = Utc::now().to_rfc3339();

        CardRepository::update(
            &state.pool,
            id,
            req.title.as_deref(),
            req.description.as_deref().map(Some),
            req.priority.as_deref(),
            req.column_id.as_deref(),
            req.position,
            req.due_date.as_deref().map(Some),
            req.start_date.as_deref().map(Some),
            req.estimated_hours.map(Some),
            req.cover_url.as_deref().map(Some),
            req.is_template,
            req.story_points.map(Some),
            &now,
        )
        .await?;

        CardRepository::get_card_response(&state.pool, id, Some(user_id))
            .await?
            .ok_or_else(|| AppError::Internal("Failed to retrieve updated card".to_string()))
    }


    pub async fn move_card(
        state: &AppState,
        id: &str,
        user_id: &str,
        req: MoveCardRequest,
    ) -> Result<(), AppError> {
        let card = CardRepository::find_by_id(&state.pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Card not found".to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &card.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        let _ = WorkspaceRepository::get_user_role(&state.pool, &project.workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this card".to_string()))?;

        let now = Utc::now().to_rfc3339();
        CardRepository::move_card(&state.pool, id, &req.column_id, req.position, &now).await
    }

    pub async fn archive(state: &AppState, id: &str, user_id: &str, archive: bool) -> Result<(), AppError> {
        let card = CardRepository::find_by_id(&state.pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Card not found".to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &card.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        let _ = WorkspaceRepository::get_user_role(&state.pool, &project.workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this card".to_string()))?;

        let now = if archive { Some(Utc::now().to_rfc3339()) } else { None };
        CardRepository::archive(&state.pool, id, now.as_deref()).await
    }

    pub async fn delete(state: &AppState, id: &str, user_id: &str) -> Result<(), AppError> {
        let card = CardRepository::find_by_id(&state.pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Card not found".to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &card.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        let _ = WorkspaceRepository::get_user_role(&state.pool, &project.workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this card".to_string()))?;

        CardRepository::delete(&state.pool, id).await
    }

    pub async fn set_assignees(
        state: &AppState,
        id: &str,
        user_id: &str,
        assignee_ids: Vec<String>,
    ) -> Result<CardResponse, AppError> {
        let card = CardRepository::find_by_id(&state.pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Card not found".to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &card.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        let _ = WorkspaceRepository::get_user_role(&state.pool, &project.workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this card".to_string()))?;

        CardRepository::set_assignees(&state.pool, id, &assignee_ids).await?;

        CardRepository::get_card_response(&state.pool, id, Some(user_id))
            .await?
            .ok_or_else(|| AppError::Internal("Failed to retrieve updated card".to_string()))
    }

    pub async fn set_labels(
        state: &AppState,
        id: &str,
        user_id: &str,
        label_ids: Vec<String>,
    ) -> Result<CardResponse, AppError> {
        let card = CardRepository::find_by_id(&state.pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Card not found".to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &card.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        let _ = WorkspaceRepository::get_user_role(&state.pool, &project.workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this card".to_string()))?;

        CardRepository::set_labels(&state.pool, id, &label_ids).await?;

        CardRepository::get_card_response(&state.pool, id, Some(user_id))
            .await?
            .ok_or_else(|| AppError::Internal("Failed to retrieve updated card".to_string()))
    }

    pub async fn toggle_watcher(state: &AppState, id: &str, user_id: &str) -> Result<CardResponse, AppError> {
        let card = CardRepository::find_by_id(&state.pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Card not found".to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &card.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        let _ = WorkspaceRepository::get_user_role(&state.pool, &project.workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this card".to_string()))?;

        let now = Utc::now().to_rfc3339();
        let _ = CardRepository::toggle_watcher(&state.pool, id, user_id, &now).await?;

        CardRepository::get_card_response(&state.pool, id, Some(user_id))
            .await?
            .ok_or_else(|| AppError::Internal("Failed to retrieve updated card".to_string()))
    }

    pub async fn list_watchers(state: &AppState, id: &str, user_id: &str) -> Result<Vec<crate::features::card::dto::CardWatcherResponse>, AppError> {
        let card = CardRepository::find_by_id(&state.pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Card not found".to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &card.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        let _ = WorkspaceRepository::get_user_role(&state.pool, &project.workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this card".to_string()))?;

        CardRepository::list_watchers(&state.pool, id).await
    }

    pub async fn toggle_vote(state: &AppState, id: &str, user_id: &str) -> Result<CardResponse, AppError> {
        let card = CardRepository::find_by_id(&state.pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Card not found".to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &card.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        let _ = WorkspaceRepository::get_user_role(&state.pool, &project.workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this card".to_string()))?;

        let now = Utc::now().to_rfc3339();
        let _ = CardRepository::toggle_vote(&state.pool, id, user_id, &now).await?;

        CardRepository::get_card_response(&state.pool, id, Some(user_id))
            .await?
            .ok_or_else(|| AppError::Internal("Failed to retrieve updated card".to_string()))
    }



    pub async fn add_link(state: &AppState, id: &str, user_id: &str, req: crate::features::card::dto::CreateCardLinkRequest) -> Result<(), AppError> {
        let card = CardRepository::find_by_id(&state.pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Card not found".to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &card.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        let _ = WorkspaceRepository::get_user_role(&state.pool, &project.workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this card".to_string()))?;

        let link_id = Uuid::now_v7().to_string();
        CardRepository::add_link(&state.pool, &link_id, id, &req.target_card_id, &req.link_type).await
    }

    pub async fn remove_link(state: &AppState, id: &str, link_id: &str, user_id: &str) -> Result<(), AppError> {
        let card = CardRepository::find_by_id(&state.pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Card not found".to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &card.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        let _ = WorkspaceRepository::get_user_role(&state.pool, &project.workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this card".to_string()))?;

        CardRepository::remove_link(&state.pool, link_id).await
    }

    pub async fn list_links(state: &AppState, id: &str, user_id: &str) -> Result<Vec<crate::features::card::dto::CardLinkResponse>, AppError> {
        let card = CardRepository::find_by_id(&state.pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Card not found".to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &card.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        let _ = WorkspaceRepository::get_user_role(&state.pool, &project.workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this card".to_string()))?;

        CardRepository::list_links(&state.pool, id).await
    }
}
