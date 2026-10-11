use axum::{
    extract::{Path, State},
    Json,
};
use crate::{
    error::AppError,
    extractors::auth::AuthUser,
    features::board::{
        dto::{BoardResponse, ColumnResponse, CreateColumnRequest, ReorderColumnsRequest, UpdateColumnRequest},
        service::BoardService,
    },
    state::AppState,
};

pub async fn get_by_project(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(project_id): Path<String>,
) -> Result<Json<BoardResponse>, AppError> {
    let board = BoardService::get_by_project_id(&state, &project_id, &auth.id).await?;
    Ok(Json(board))
}

pub async fn create_column(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(board_id): Path<String>,
    Json(payload): Json<CreateColumnRequest>,
) -> Result<Json<ColumnResponse>, AppError> {
    let column = BoardService::create_column(&state, &board_id, &auth.id, payload).await?;
    Ok(Json(column))
}

pub async fn update_column(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(column_id): Path<String>,
    Json(payload): Json<UpdateColumnRequest>,
) -> Result<Json<ColumnResponse>, AppError> {
    let column = BoardService::update_column(&state, &column_id, &auth.id, payload).await?;
    Ok(Json(column))
}

pub async fn delete_column(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(column_id): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    BoardService::delete_column(&state, &column_id, &auth.id).await?;
    Ok(Json(serde_json::json!({ "success": true })))
}

pub async fn reorder_columns(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(board_id): Path<String>,
    Json(payload): Json<ReorderColumnsRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    BoardService::reorder_columns(&state, &board_id, &auth.id, payload).await?;
    Ok(Json(serde_json::json!({ "success": true })))
}
