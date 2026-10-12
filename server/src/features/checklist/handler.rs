use crate::{
    error::AppError,
    extractors::auth::AuthUser,
    features::checklist::{
        dto::{
            ChecklistItemResponse, ChecklistResponse, CreateChecklistItemRequest,
            CreateChecklistRequest, UpdateChecklistItemRequest, UpdateChecklistRequest,
        },
        service::ChecklistService,
    },
    state::AppState,
};
use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct ListChecklistsQuery {
    pub card_id: String,
}

pub async fn list(
    State(state): State<AppState>,
    auth: AuthUser,
    Query(query): Query<ListChecklistsQuery>,
) -> Result<Json<Vec<ChecklistResponse>>, AppError> {
    let checklists = ChecklistService::list_by_card(&state, &query.card_id, &auth.id).await?;
    Ok(Json(checklists))
}

pub async fn create_checklist(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(payload): Json<CreateChecklistRequest>,
) -> Result<Json<ChecklistResponse>, AppError> {
    let ch = ChecklistService::create_checklist(&state, &auth.id, payload).await?;
    Ok(Json(ch))
}

pub async fn delete_checklist(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    ChecklistService::delete_checklist(&state, &id, &auth.id).await?;
    Ok(Json(serde_json::json!({ "success": true })))
}

pub async fn create_item(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(checklist_id): Path<String>,
    Json(payload): Json<CreateChecklistItemRequest>,
) -> Result<Json<ChecklistItemResponse>, AppError> {
    let item = ChecklistService::create_item(&state, &checklist_id, &auth.id, payload).await?;
    Ok(Json(item))
}

pub async fn update_item(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(item_id): Path<String>,
    Json(payload): Json<UpdateChecklistItemRequest>,
) -> Result<Json<ChecklistItemResponse>, AppError> {
    let item = ChecklistService::update_item(&state, &item_id, &auth.id, payload).await?;
    Ok(Json(item))
}

pub async fn delete_item(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(item_id): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    ChecklistService::delete_item(&state, &item_id, &auth.id).await?;
    Ok(Json(serde_json::json!({ "success": true })))
}

pub async fn update_checklist(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>,
    Json(payload): Json<UpdateChecklistRequest>,
) -> Result<Json<ChecklistResponse>, AppError> {
    Ok(Json(
        ChecklistService::update_checklist(&state, &id, &auth.id, payload).await?,
    ))
}
