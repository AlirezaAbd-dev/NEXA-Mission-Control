use chrono::Utc;
use uuid::Uuid;
use validator::Validate;

use crate::{
    error::AppError,
    features::{
        card::repository::CardRepository,
        custom_field::{
            dto::{
                CreateCustomFieldDefinitionRequest, CustomFieldDefinitionResponse,
                CustomFieldValueResponse, SetCustomFieldValueRequest,
            },
            repository::CustomFieldRepository,
        },
        project::repository::ProjectRepository,
        workspace::repository::WorkspaceRepository,
    },
    state::AppState,
};

pub struct CustomFieldService;

impl CustomFieldService {
    pub async fn list_definitions(
        state: &AppState,
        project_id: &str,
        user_id: &str,
    ) -> Result<Vec<CustomFieldDefinitionResponse>, AppError> {
        let project = ProjectRepository::find_by_id(&state.pool, project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        let _ = WorkspaceRepository::get_user_role(&state.pool, &project.workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this project".to_string()))?;

        CustomFieldRepository::list_definitions_by_project(&state.pool, project_id).await
    }

    pub async fn create_definition(
        state: &AppState,
        user_id: &str,
        req: CreateCustomFieldDefinitionRequest,
    ) -> Result<CustomFieldDefinitionResponse, AppError> {
        req.validate().map_err(|e| AppError::Validation(e.to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &req.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        let _ = WorkspaceRepository::get_user_role(&state.pool, &project.workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this project".to_string()))?;

        let id = Uuid::now_v7().to_string();
        let now = Utc::now().to_rfc3339();
        let options = req.options.unwrap_or_default();
        let options_json = serde_json::to_string(&options).unwrap_or_else(|_| "[]".to_string());
        let position = req.position.unwrap_or(1000.0);

        CustomFieldRepository::create_definition(
            &state.pool,
            &id,
            &req.project_id,
            &req.name,
            &req.field_type,
            &options_json,
            position,
            &now,
        )
        .await?;

        Ok(CustomFieldDefinitionResponse {
            id,
            project_id: req.project_id,
            name: req.name,
            field_type: req.field_type,
            options,
            position,
            created_at: now,
        })
    }

    pub async fn delete_definition(
        state: &AppState,
        user_id: &str,
        def_id: &str,
    ) -> Result<(), AppError> {
        let def = CustomFieldRepository::find_definition_by_id(&state.pool, def_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Custom field definition not found".to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &def.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        let _ = WorkspaceRepository::get_user_role(&state.pool, &project.workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this project".to_string()))?;

        CustomFieldRepository::delete_definition(&state.pool, def_id).await
    }

    pub async fn list_values(
        state: &AppState,
        card_id: &str,
        user_id: &str,
    ) -> Result<Vec<CustomFieldValueResponse>, AppError> {
        let card = CardRepository::find_by_id(&state.pool, card_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Card not found".to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &card.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        let _ = WorkspaceRepository::get_user_role(&state.pool, &project.workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this card".to_string()))?;

        CustomFieldRepository::list_values_by_card(&state.pool, card_id).await
    }

    pub async fn set_value(
        state: &AppState,
        user_id: &str,
        req: SetCustomFieldValueRequest,
    ) -> Result<Vec<CustomFieldValueResponse>, AppError> {
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

        CustomFieldRepository::set_value(
            &state.pool,
            &id,
            &req.card_id,
            &req.field_id,
            req.value_text.as_deref(),
            req.value_number,
            &now,
        )
        .await?;

        CustomFieldRepository::list_values_by_card(&state.pool, &req.card_id).await
    }
}
