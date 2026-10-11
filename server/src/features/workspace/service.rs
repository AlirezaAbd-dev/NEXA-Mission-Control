use chrono::Utc;
use uuid::Uuid;
use validator::Validate;

use crate::{
    error::AppError,
    features::{
        auth::repository::AuthRepository,
        workspace::{
            dto::{AddWorkspaceMemberRequest, CreateWorkspaceRequest, UpdateWorkspaceRequest, WorkspaceMemberResponse, WorkspaceResponse},
            repository::WorkspaceRepository,
        },
    },
    state::AppState,
};

pub struct WorkspaceService;

impl WorkspaceService {
    pub async fn list(state: &AppState, user_id: &str) -> Result<Vec<WorkspaceResponse>, AppError> {
        WorkspaceRepository::list_for_user(&state.pool, user_id).await
    }

    pub async fn get_by_id(state: &AppState, workspace_id: &str, user_id: &str) -> Result<WorkspaceResponse, AppError> {
        let role = WorkspaceRepository::get_user_role(&state.pool, workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this workspace".to_string()))?;

        let ws = WorkspaceRepository::find_by_id(&state.pool, workspace_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Workspace not found".to_string()))?;

        Ok(WorkspaceResponse {
            id: ws.id,
            name: ws.name,
            slug: ws.slug,
            description: ws.description,
            logo_url: ws.logo_url,
            owner_id: ws.owner_id,
            user_role: role,
            created_at: ws.created_at,
            updated_at: ws.updated_at,
        })
    }

    pub async fn create(state: &AppState, user_id: &str, req: CreateWorkspaceRequest) -> Result<WorkspaceResponse, AppError> {
        req.validate().map_err(|e| AppError::Validation(e.to_string()))?;

        let id = Uuid::now_v7().to_string();
        let slug = format!(
            "{}-{}",
            req.name.to_lowercase().replace(' ', "-"),
            &id[..8]
        );
        let now = Utc::now().to_rfc3339();

        let ws = WorkspaceRepository::create(
            &state.pool,
            &id,
            &req.name,
            &slug,
            req.description.as_deref(),
            req.logo_url.as_deref(),
            user_id,
            &now,
        )
        .await?;

        Ok(WorkspaceResponse {
            id: ws.id,
            name: ws.name,
            slug: ws.slug,
            description: ws.description,
            logo_url: ws.logo_url,
            owner_id: ws.owner_id,
            user_role: "owner".to_string(),
            created_at: ws.created_at,
            updated_at: ws.updated_at,
        })
    }

    pub async fn update(
        state: &AppState,
        workspace_id: &str,
        user_id: &str,
        req: UpdateWorkspaceRequest,
    ) -> Result<WorkspaceResponse, AppError> {
        req.validate().map_err(|e| AppError::Validation(e.to_string()))?;

        let role = WorkspaceRepository::get_user_role(&state.pool, workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this workspace".to_string()))?;

        if role != "owner" && role != "admin" {
            return Err(AppError::Forbidden("Only workspace owners or admins can update settings".to_string()));
        }

        let now = Utc::now().to_rfc3339();
        let ws = WorkspaceRepository::update(
            &state.pool,
            workspace_id,
            req.name.as_deref(),
            req.description.as_deref(),
            req.logo_url.as_deref(),
            &now,
        )
        .await?;

        Ok(WorkspaceResponse {
            id: ws.id,
            name: ws.name,
            slug: ws.slug,
            description: ws.description,
            logo_url: ws.logo_url,
            owner_id: ws.owner_id,
            user_role: role,
            created_at: ws.created_at,
            updated_at: ws.updated_at,
        })
    }

    pub async fn delete(state: &AppState, workspace_id: &str, user_id: &str) -> Result<(), AppError> {
        let ws = WorkspaceRepository::find_by_id(&state.pool, workspace_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Workspace not found".to_string()))?;

        if ws.owner_id != user_id {
            return Err(AppError::Forbidden("Only the workspace owner can delete this workspace".to_string()));
        }

        WorkspaceRepository::delete(&state.pool, workspace_id).await
    }

    pub async fn list_members(state: &AppState, workspace_id: &str, user_id: &str) -> Result<Vec<WorkspaceMemberResponse>, AppError> {
        let _ = WorkspaceRepository::get_user_role(&state.pool, workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this workspace".to_string()))?;

        WorkspaceRepository::list_members(&state.pool, workspace_id).await
    }

    pub async fn add_member(
        state: &AppState,
        workspace_id: &str,
        user_id: &str,
        req: AddWorkspaceMemberRequest,
    ) -> Result<(), AppError> {
        req.validate().map_err(|e| AppError::Validation(e.to_string()))?;

        let role = WorkspaceRepository::get_user_role(&state.pool, workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this workspace".to_string()))?;

        if role != "owner" && role != "admin" {
            return Err(AppError::Forbidden("Only owners and admins can invite members".to_string()));
        }

        let target_user = AuthRepository::find_by_email(&state.pool, &req.email)
            .await?
            .ok_or_else(|| AppError::NotFound(format!("User with email {} not found", req.email)))?;

        let now = Utc::now().to_rfc3339();
        WorkspaceRepository::add_member(&state.pool, workspace_id, &target_user.id, &req.role, &now).await
    }

    pub async fn remove_member(
        state: &AppState,
        workspace_id: &str,
        operator_user_id: &str,
        target_user_id: &str,
    ) -> Result<(), AppError> {
        let role = WorkspaceRepository::get_user_role(&state.pool, workspace_id, operator_user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this workspace".to_string()))?;

        if role != "owner" && role != "admin" && operator_user_id != target_user_id {
            return Err(AppError::Forbidden("Insufficient permissions to remove member".to_string()));
        }

        let ws = WorkspaceRepository::find_by_id(&state.pool, workspace_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Workspace not found".to_string()))?;

        if ws.owner_id == target_user_id {
            return Err(AppError::Forbidden("The workspace owner cannot be removed".to_string()));
        }

        WorkspaceRepository::remove_member(&state.pool, workspace_id, target_user_id).await
    }
}
