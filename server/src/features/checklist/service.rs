use chrono::Utc;
use uuid::Uuid;
use validator::Validate;

use crate::{
    error::AppError,
    features::{
        card::repository::CardRepository,
        checklist::{
            dto::{ChecklistItemResponse, ChecklistResponse, CreateChecklistItemRequest, CreateChecklistRequest, UpdateChecklistItemRequest},
            repository::ChecklistRepository,
        },
        project::repository::ProjectRepository,
        workspace::repository::WorkspaceRepository,
    },
    state::AppState,
};

pub struct ChecklistService;

impl ChecklistService {
    pub async fn list_by_card(state: &AppState, card_id: &str, user_id: &str) -> Result<Vec<ChecklistResponse>, AppError> {
        let card = CardRepository::find_by_id(&state.pool, card_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Card not found".to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &card.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        let _ = WorkspaceRepository::get_user_role(&state.pool, &project.workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this card".to_string()))?;

        ChecklistRepository::list_by_card(&state.pool, card_id).await
    }

    pub async fn create_checklist(
        state: &AppState,
        user_id: &str,
        req: CreateChecklistRequest,
    ) -> Result<ChecklistResponse, AppError> {
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

        let ch = ChecklistRepository::create_checklist(&state.pool, &id, &req.card_id, &req.title, 1000.0, &now).await?;

        Ok(ChecklistResponse {
            id: ch.id,
            card_id: ch.card_id,
            title: ch.title,
            position: ch.position,
            items: Vec::new(),
            created_at: ch.created_at,
        })
    }

    pub async fn delete_checklist(state: &AppState, id: &str, _user_id: &str) -> Result<(), AppError> {
        ChecklistRepository::delete_checklist(&state.pool, id).await
    }

    pub async fn create_item(
        state: &AppState,
        checklist_id: &str,
        _user_id: &str,
        req: CreateChecklistItemRequest,
    ) -> Result<ChecklistItemResponse, AppError> {
        req.validate().map_err(|e| AppError::Validation(e.to_string()))?;

        let id = Uuid::now_v7().to_string();
        let now = Utc::now().to_rfc3339();

        let item = ChecklistRepository::create_item(
            &state.pool,
            &id,
            checklist_id,
            &req.title,
            1000.0,
            req.assignee_id.as_deref(),
            req.due_date.as_deref(),
            &now,
        )
        .await?;

        Ok(ChecklistItemResponse {
            id: item.id,
            checklist_id: item.checklist_id,
            title: item.title,
            is_done: item.is_done == 1,
            position: item.position,
            assignee_id: item.assignee_id,
            due_date: item.due_date,
            created_at: item.created_at,
        })
    }

    pub async fn update_item(
        state: &AppState,
        item_id: &str,
        _user_id: &str,
        req: UpdateChecklistItemRequest,
    ) -> Result<ChecklistItemResponse, AppError> {
        let item = ChecklistRepository::update_item(
            &state.pool,
            item_id,
            req.title.as_deref(),
            req.is_done,
            req.assignee_id.as_ref().map(|opt| opt.as_deref()),
            req.due_date.as_ref().map(|opt| opt.as_deref()),
        )
        .await?;

        Ok(ChecklistItemResponse {
            id: item.id,
            checklist_id: item.checklist_id,
            title: item.title,
            is_done: item.is_done == 1,
            position: item.position,
            assignee_id: item.assignee_id,
            due_date: item.due_date,
            created_at: item.created_at,
        })
    }

    pub async fn delete_item(state: &AppState, item_id: &str, _user_id: &str) -> Result<(), AppError> {
        ChecklistRepository::delete_item(&state.pool, item_id).await
    }
}
