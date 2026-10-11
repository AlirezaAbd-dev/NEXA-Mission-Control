use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::Deserialize;
use crate::{
    error::AppError,
    extractors::auth::AuthUser,
    features::card::{
        dto::{CardResponse, CreateCardRequest, ListCardsQuery, MoveCardRequest, UpdateCardRequest},
        service::CardService,
    },
    state::AppState,
};

pub async fn list(
    State(state): State<AppState>,
    auth: AuthUser,
    Query(query): Query<ListCardsQuery>,
) -> Result<Json<Vec<CardResponse>>, AppError> {
    let cards = CardService::list(&state, &auth.id, query).await?;
    Ok(Json(cards))
}

pub async fn get_one(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<CardResponse>, AppError> {
    let card = CardService::get_by_id(&state, &id, &auth.id).await?;
    Ok(Json(card))
}

pub async fn create(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(payload): Json<CreateCardRequest>,
) -> Result<Json<CardResponse>, AppError> {
    let card = CardService::create(&state, &auth.id, payload).await?;
    Ok(Json(card))
}

pub async fn update(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>,
    Json(payload): Json<UpdateCardRequest>,
) -> Result<Json<CardResponse>, AppError> {
    let card = CardService::update(&state, &id, &auth.id, payload).await?;
    Ok(Json(card))
}

pub async fn move_card(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>,
    Json(payload): Json<MoveCardRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    CardService::move_card(&state, &id, &auth.id, payload).await?;
    Ok(Json(serde_json::json!({ "success": true })))
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
    CardService::archive(&state, &id, &auth.id, payload.archive).await?;
    Ok(Json(serde_json::json!({ "success": true })))
}

pub async fn delete(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    CardService::delete(&state, &id, &auth.id).await?;
    Ok(Json(serde_json::json!({ "success": true })))
}

#[derive(Debug, Deserialize)]
pub struct AssigneesPayload {
    pub user_ids: Vec<String>,
}

pub async fn set_assignees(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>,
    Json(payload): Json<AssigneesPayload>,
) -> Result<Json<CardResponse>, AppError> {
    let card = CardService::set_assignees(&state, &id, &auth.id, payload.user_ids).await?;
    Ok(Json(card))
}

#[derive(Debug, Deserialize)]
pub struct LabelsPayload {
    pub label_ids: Vec<String>,
}

pub async fn set_labels(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>,
    Json(payload): Json<LabelsPayload>,
) -> Result<Json<CardResponse>, AppError> {
    let card = CardService::set_labels(&state, &id, &auth.id, payload.label_ids).await?;
    Ok(Json(card))
}
