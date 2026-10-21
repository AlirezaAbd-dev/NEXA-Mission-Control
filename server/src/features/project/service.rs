use chrono::Utc;
use uuid::Uuid;
use validator::Validate;

use crate::{
    error::AppError,
    features::{
        project::{
            dto::{CreateProjectRequest, ProjectResponse, UpdateProjectRequest},
            models::Project,
            repository::ProjectRepository,
        },
        workspace::repository::WorkspaceRepository,
    },
    state::AppState,
};

pub struct ProjectService;

impl ProjectService {
    pub async fn list_by_workspace(
        state: &AppState,
        workspace_id: &str,
        user_id: &str,
    ) -> Result<Vec<ProjectResponse>, AppError> {
        let _ = WorkspaceRepository::get_user_role(&state.pool, workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this workspace".to_string()))?;

        let projects = ProjectRepository::list_by_workspace(&state.pool, workspace_id).await?;
        let mut visible=Vec::new();
        for project in projects {if crate::features::enterprise::service::authorize(state,user_id,&project.id,false,false).await.is_ok(){visible.push(Self::to_response(project));}}
        Ok(visible)
    }

    pub async fn get_by_id(state: &AppState, id: &str, user_id: &str) -> Result<ProjectResponse, AppError> {
        let project = ProjectRepository::find_by_id(&state.pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        let _ = WorkspaceRepository::get_user_role(&state.pool, &project.workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this project".to_string()))?;

        Ok(Self::to_response(project))
    }

    pub async fn create(
        state: &AppState,
        user_id: &str,
        req: CreateProjectRequest,
    ) -> Result<ProjectResponse, AppError> {
        req.validate().map_err(|e| AppError::Validation(e.to_string()))?;
        if req.visibility.as_deref().is_some_and(|v|!matches!(v,"public"|"private")){return Err(AppError::Validation("Visibility must be public or private".into()));}

        let role = WorkspaceRepository::get_user_role(&state.pool, &req.workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this workspace".to_string()))?;

        if role != "owner" && role != "admin" {
            return Err(AppError::Forbidden("Only workspace owners or admins can create projects".to_string()));
        }

        let id = Uuid::now_v7().to_string();
        let now = Utc::now().to_rfc3339();
        let visibility = req.visibility.unwrap_or_else(|| "public".to_string());

        let project = ProjectRepository::create(
            &state.pool,
            &id,
            &req.workspace_id,
            &req.name,
            &req.identifier.to_uppercase(),
            req.description.as_deref(),
            req.color.as_deref(),
            req.cover_url.as_deref(),
            &visibility,
            &now,
        )
        .await?;

        // Add creator as project admin
        let member_id = Uuid::now_v7().to_string();
        let _ = sqlx::query(
            "INSERT INTO project_members (id, project_id, user_id, role, joined_at) VALUES (?1, ?2, ?3, 'admin', ?4)"
        )
        .bind(&member_id)
        .bind(&id)
        .bind(user_id)
        .bind(&now)
        .execute(&state.pool)
        .await;

        // Auto-create default board and columns for this new project!
        let board_id = Uuid::now_v7().to_string();
        let _ = sqlx::query(
            "INSERT INTO boards (id, project_id, name, created_at) VALUES (?1, ?2, 'Main Board', ?3)"
        )
        .bind(&board_id)
        .bind(&id)
        .bind(&now)
        .execute(&state.pool)
        .await;

        let columns = [
            ("Backlog", "backlog", 1000.0),
            ("To Do", "active", 2000.0),
            ("In Progress", "active", 3000.0),
            ("Done", "done", 4000.0),
        ];

        for (col_name, col_type, pos) in columns {
            let col_id = Uuid::now_v7().to_string();
            let _ = sqlx::query(
                "INSERT INTO columns (id, board_id, name, type, position, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)"
            )
            .bind(&col_id)
            .bind(&board_id)
            .bind(col_name)
            .bind(col_type)
            .bind(pos)
            .bind(&now)
            .execute(&state.pool)
            .await;
        }

        Ok(Self::to_response(project))
    }

    pub async fn update(
        state: &AppState,
        id: &str,
        user_id: &str,
        req: UpdateProjectRequest,
    ) -> Result<ProjectResponse, AppError> {
        req.validate().map_err(|e| AppError::Validation(e.to_string()))?;
        if req.visibility.as_deref().is_some_and(|v|!matches!(v,"public"|"private")){return Err(AppError::Validation("Visibility must be public or private".into()));}

        let current = ProjectRepository::find_by_id(&state.pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        let role = WorkspaceRepository::get_user_role(&state.pool, &current.workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this workspace".to_string()))?;

        if role != "owner" && role != "admin" {
            return Err(AppError::Forbidden("Insufficient permissions to update project".to_string()));
        }

        let now = Utc::now().to_rfc3339();
        let updated = ProjectRepository::update(
            &state.pool,
            id,
            req.name.as_deref(),
            req.description.as_deref(),
            req.color.as_deref(),
            req.cover_url.as_deref(),
            req.visibility.as_deref(),
            &now,
        )
        .await?;

        Ok(Self::to_response(updated))
    }

    pub async fn archive(state: &AppState, id: &str, user_id: &str, archive: bool) -> Result<(), AppError> {
        let current = ProjectRepository::find_by_id(&state.pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        let role = WorkspaceRepository::get_user_role(&state.pool, &current.workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this workspace".to_string()))?;

        if role != "owner" && role != "admin" {
            return Err(AppError::Forbidden("Insufficient permissions to archive project".to_string()));
        }

        let now = if archive { Some(Utc::now().to_rfc3339()) } else { None };
        ProjectRepository::archive(&state.pool, id, now.as_deref()).await
    }

    pub async fn delete(state: &AppState, id: &str, user_id: &str) -> Result<(), AppError> {
        let current = ProjectRepository::find_by_id(&state.pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        let role = WorkspaceRepository::get_user_role(&state.pool, &current.workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this workspace".to_string()))?;

        if role != "owner" && role != "admin" {
            return Err(AppError::Forbidden("Only workspace owner or admin can delete project".to_string()));
        }

        ProjectRepository::delete(&state.pool, id).await
    }

    fn to_response(p: Project) -> ProjectResponse {
        ProjectResponse {
            id: p.id,
            workspace_id: p.workspace_id,
            name: p.name,
            identifier: p.identifier,
            description: p.description,
            color: p.color,
            cover_url: p.cover_url,
            visibility: p.visibility,
            archived_at: p.archived_at,
            created_at: p.created_at,
            updated_at: p.updated_at,
        }
    }
}
