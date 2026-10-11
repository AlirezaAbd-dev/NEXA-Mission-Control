use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::Deserialize;
use crate::{
    error::AppError,
    extractors::auth::AuthUser,
    features::label::{
        dto::{CreateLabelRequest, LabelResponse, UpdateLabelRequest},
        service::LabelService,
    },
    state::AppState,
};

#[derive(Debug, Deserialize)]
pub struct ListLabelsQuery {
    pub workspace_id: String,
}

pub async fn list(
    State(state): State<AppState>,
    auth: AuthUser,
    Query(query): Query<ListLabelsQuery>,
) -> Result<Json<Vec<LabelResponse>>, AppError> {
    let labels = LabelService::list_by_workspace(&state, &query.workspace_id, &auth.id).await?;
    Ok(Json(labels))
}

pub async fn create(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(payload): Json<CreateLabelRequest>,
) -> Result<Json<LabelResponse>, AppError> {
    let label = LabelService::create(&state, &auth.id, payload).await?;
    Ok(Json(label))
}

pub async fn update(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>,
    Json(payload): Json<UpdateLabelRequest>,
) -> Result<Json<LabelResponse>, AppError> {
    let label = LabelService::update(&state, &id, &auth.id, payload).await?;
    Ok(Json(label))
}

pub async fn delete(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    LabelService::delete(&state, &id, &auth.id).await?;
    Ok(Json(serde_json::json!({ "success": true })))
}
