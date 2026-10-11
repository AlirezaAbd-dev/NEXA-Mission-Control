use axum::{
    extract::{Path, State},
    Json,
};
use crate::{
    error::AppError,
    extractors::auth::AuthUser,
    features::workspace::{
        dto::{AddWorkspaceMemberRequest, CreateWorkspaceRequest, UpdateWorkspaceRequest, WorkspaceMemberResponse, WorkspaceResponse},
        service::WorkspaceService,
    },
    state::AppState,
};

pub async fn list(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<Vec<WorkspaceResponse>>, AppError> {
    let workspaces = WorkspaceService::list(&state, &auth.id).await?;
    Ok(Json(workspaces))
}

pub async fn get_one(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<WorkspaceResponse>, AppError> {
    let ws = WorkspaceService::get_by_id(&state, &id, &auth.id).await?;
    Ok(Json(ws))
}

pub async fn create(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(payload): Json<CreateWorkspaceRequest>,
) -> Result<Json<WorkspaceResponse>, AppError> {
    let ws = WorkspaceService::create(&state, &auth.id, payload).await?;
    Ok(Json(ws))
}

pub async fn update(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>,
    Json(payload): Json<UpdateWorkspaceRequest>,
) -> Result<Json<WorkspaceResponse>, AppError> {
    let ws = WorkspaceService::update(&state, &id, &auth.id, payload).await?;
    Ok(Json(ws))
}

pub async fn delete(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    WorkspaceService::delete(&state, &id, &auth.id).await?;
    Ok(Json(serde_json::json!({ "success": true })))
}

pub async fn list_members(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<Vec<WorkspaceMemberResponse>>, AppError> {
    let members = WorkspaceService::list_members(&state, &id, &auth.id).await?;
    Ok(Json(members))
}

pub async fn add_member(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>,
    Json(payload): Json<AddWorkspaceMemberRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    WorkspaceService::add_member(&state, &id, &auth.id, payload).await?;
    Ok(Json(serde_json::json!({ "success": true })))
}

pub async fn remove_member(
    State(state): State<AppState>,
    auth: AuthUser,
    Path((id, user_id)): Path<(String, String)>,
) -> Result<Json<serde_json::Value>, AppError> {
    WorkspaceService::remove_member(&state, &id, &auth.id, &user_id).await?;
    Ok(Json(serde_json::json!({ "success": true })))
}
