use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::Deserialize;
use crate::{
    error::AppError,
    extractors::auth::AuthUser,
    features::sprint::{
        dto::{CreateSprintRequest, SprintResponse, UpdateSprintRequest},
        service::SprintService,
    },
    state::AppState,
};

#[derive(Debug, Deserialize)]
pub struct ListSprintsQuery {
    pub project_id: String,
}

pub async fn list(
    State(state): State<AppState>,
    auth: AuthUser,
    Query(query): Query<ListSprintsQuery>,
) -> Result<Json<Vec<SprintResponse>>, AppError> {
    let sprints = SprintService::list_by_project(&state, &query.project_id, &auth.id).await?;
    Ok(Json(sprints))
}

pub async fn create(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(payload): Json<CreateSprintRequest>,
) -> Result<Json<SprintResponse>, AppError> {
    let sprint = SprintService::create(&state, &auth.id, payload).await?;
    Ok(Json(sprint))
}

pub async fn update(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>,
    Json(payload): Json<UpdateSprintRequest>,
) -> Result<Json<SprintResponse>, AppError> {
    let sprint = SprintService::update(&state, &id, &auth.id, payload).await?;
    Ok(Json(sprint))
}

pub async fn delete(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    SprintService::delete(&state, &id, &auth.id).await?;
    Ok(Json(serde_json::json!({ "success": true })))
}

#[derive(Debug, Deserialize)]
pub struct SprintCardTogglePayload {
    pub card_id: String,
    pub add: bool,
}

pub async fn toggle_card(
    State(state): State<AppState>,
    Path(sprint_id): Path<String>,
    Json(payload): Json<SprintCardTogglePayload>,
) -> Result<Json<serde_json::Value>, AppError> {
    SprintService::toggle_card(&state, &sprint_id, &payload.card_id, payload.add).await?;
    Ok(Json(serde_json::json!({ "success": true })))
}
