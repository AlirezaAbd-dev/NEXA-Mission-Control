use chrono::Utc;
use uuid::Uuid;
use validator::Validate;

use crate::{
    error::AppError,
    features::{
        board::{
            dto::{BoardResponse, ColumnResponse, CreateColumnRequest, ReorderColumnsRequest, UpdateColumnRequest},
            models::Column,
            repository::BoardRepository,
        },
        project::repository::ProjectRepository,
        workspace::repository::WorkspaceRepository,
    },
    state::AppState,
};

pub struct BoardService;

impl BoardService {
    pub async fn get_by_project_id(
        state: &AppState,
        project_id: &str,
        user_id: &str,
    ) -> Result<BoardResponse, AppError> {
        let project = ProjectRepository::find_by_id(&state.pool, project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        let _ = WorkspaceRepository::get_user_role(&state.pool, &project.workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this workspace".to_string()))?;

        let board = BoardRepository::find_by_project_id(&state.pool, project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Board not found for this project".to_string()))?;

        let columns = BoardRepository::list_columns(&state.pool, &board.id).await?;

        Ok(BoardResponse {
            id: board.id,
            project_id: board.project_id,
            name: board.name,
            columns: columns.into_iter().map(Self::to_column_response).collect(),
            created_at: board.created_at,
        })
    }

    pub async fn create_column(
        state: &AppState,
        board_id: &str,
        user_id: &str,
        req: CreateColumnRequest,
    ) -> Result<ColumnResponse, AppError> {
        req.validate().map_err(|e| AppError::Validation(e.to_string()))?;

        let board = BoardRepository::find_by_id(&state.pool, board_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Board not found".to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &board.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        let _ = WorkspaceRepository::get_user_role(&state.pool, &project.workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this workspace".to_string()))?;

        let columns = BoardRepository::list_columns(&state.pool, board_id).await?;
        let next_position = req.position.unwrap_or_else(|| {
            columns.last().map(|c| c.position + 1000.0).unwrap_or(1000.0)
        });

        let id = Uuid::now_v7().to_string();
        let now = Utc::now().to_rfc3339();
        let col_type = req.type_.unwrap_or_else(|| "active".to_string());

        let col = BoardRepository::create_column(
            &state.pool,
            &id,
            board_id,
            &req.name,
            &col_type,
            next_position,
            req.wip_limit,
            &now,
        )
        .await?;

        Ok(Self::to_column_response(col))
    }

    pub async fn update_column(
        state: &AppState,
        column_id: &str,
        user_id: &str,
        req: UpdateColumnRequest,
    ) -> Result<ColumnResponse, AppError> {
        req.validate().map_err(|e| AppError::Validation(e.to_string()))?;

        let column = BoardRepository::find_column_by_id(&state.pool, column_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Column not found".to_string()))?;

        let board = BoardRepository::find_by_id(&state.pool, &column.board_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Board not found".to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &board.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        let _ = WorkspaceRepository::get_user_role(&state.pool, &project.workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this workspace".to_string()))?;

        let updated = BoardRepository::update_column(
            &state.pool,
            column_id,
            req.name.as_deref(),
            req.type_.as_deref(),
            req.position,
            req.wip_limit.map(Some),
        )
        .await?;

        Ok(Self::to_column_response(updated))
    }

    pub async fn delete_column(state: &AppState, column_id: &str, user_id: &str) -> Result<(), AppError> {
        let column = BoardRepository::find_column_by_id(&state.pool, column_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Column not found".to_string()))?;

        let board = BoardRepository::find_by_id(&state.pool, &column.board_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Board not found".to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &board.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        let _ = WorkspaceRepository::get_user_role(&state.pool, &project.workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this workspace".to_string()))?;

        BoardRepository::delete_column(&state.pool, column_id).await
    }

    pub async fn reorder_columns(
        state: &AppState,
        board_id: &str,
        user_id: &str,
        req: ReorderColumnsRequest,
    ) -> Result<(), AppError> {
        let board = BoardRepository::find_by_id(&state.pool, board_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Board not found".to_string()))?;

        let project = ProjectRepository::find_by_id(&state.pool, &board.project_id)
            .await?
            .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;

        let _ = WorkspaceRepository::get_user_role(&state.pool, &project.workspace_id, user_id)
            .await?
            .ok_or_else(|| AppError::Forbidden("You do not have access to this workspace".to_string()))?;

        for (idx, col_id) in req.column_ids.iter().enumerate() {
            let position = ((idx + 1) * 1000) as f64;
            BoardRepository::update_column_position(&state.pool, col_id, position).await?;
        }

        Ok(())
    }

    fn to_column_response(c: Column) -> ColumnResponse {
        ColumnResponse {
            id: c.id,
            board_id: c.board_id,
            name: c.name,
            type_: c.type_,
            position: c.position,
            wip_limit: c.wip_limit,
            created_at: c.created_at,
        }
    }
}
