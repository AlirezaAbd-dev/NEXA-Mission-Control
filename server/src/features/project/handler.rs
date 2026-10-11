use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::Deserialize;
use crate::{
    error::AppError,
    extractors::auth::AuthUser,
    features::project::{
        dto::{CreateProjectRequest, ProjectResponse, UpdateProjectRequest},
        service::ProjectService,
    },
    state::AppState,
};

#[derive(Debug, Deserialize)]
pub struct ListProjectsQuery {
    pub workspace_id: String,
}

pub async fn list(
    State(state): State<AppState>,
    auth: AuthUser,
    Query(query): Query<ListProjectsQuery>,
) -> Result<Json<Vec<ProjectResponse>>, AppError> {
    let projects = ProjectService::list_by_workspace(&state, &query.workspace_id, &auth.id).await?;
    Ok(Json(projects))
}

pub async fn get_one(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<ProjectResponse>, AppError> {
    let project = ProjectService::get_by_id(&state, &id, &auth.id).await?;
    Ok(Json(project))
}

pub async fn create(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(payload): Json<CreateProjectRequest>,
) -> Result<Json<ProjectResponse>, AppError> {
    let project = ProjectService::create(&state, &auth.id, payload).await?;
    Ok(Json(project))
}

pub async fn update(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>,
    Json(payload): Json<UpdateProjectRequest>,
) -> Result<Json<ProjectResponse>, AppError> {
    let project = ProjectService::update(&state, &id, &auth.id, payload).await?;
    Ok(Json(project))
}

#[derive(Debug, Deserialize)]
pub struct ArchivePayload {
    pub archive: bool,
}

pub async fn archive(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>,
    Json(payload): Json<ArchivePayload>,
) -> Result<Json<serde_json::Value>, AppError> {
    ProjectService::archive(&state, &id, &auth.id, payload.archive).await?;
    Ok(Json(serde_json::json!({ "success": true })))
}

pub async fn delete(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    ProjectService::delete(&state, &id, &auth.id).await?;
    Ok(Json(serde_json::json!({ "success": true })))
}
