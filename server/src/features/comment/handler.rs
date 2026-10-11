use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::Deserialize;
use crate::{
    error::AppError,
    extractors::auth::AuthUser,
    features::comment::{
        dto::{AddReactionRequest, CommentResponse, CreateCommentRequest, UpdateCommentRequest},
        service::CommentService,
    },
    state::AppState,
};

#[derive(Debug, Deserialize)]
pub struct ListCommentsQuery {
    pub card_id: String,
}

pub async fn list(
    State(state): State<AppState>,
    auth: AuthUser,
    Query(query): Query<ListCommentsQuery>,
) -> Result<Json<Vec<CommentResponse>>, AppError> {
    let comments = CommentService::list_by_card(&state, &query.card_id, &auth.id).await?;
    Ok(Json(comments))
}

pub async fn create(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(payload): Json<CreateCommentRequest>,
) -> Result<Json<CommentResponse>, AppError> {
    let comment = CommentService::create(&state, &auth.id, payload).await?;
    Ok(Json(comment))
}

pub async fn update(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>,
    Json(payload): Json<UpdateCommentRequest>,
) -> Result<Json<CommentResponse>, AppError> {
    let comment = CommentService::update(&state, &id, &auth.id, payload).await?;
    Ok(Json(comment))
}

pub async fn delete(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    CommentService::delete(&state, &id, &auth.id).await?;
    Ok(Json(serde_json::json!({ "success": true })))
}

pub async fn toggle_reaction(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>,
    Json(payload): Json<AddReactionRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    CommentService::toggle_reaction(&state, &id, &auth.id, payload).await?;
    Ok(Json(serde_json::json!({ "success": true })))
}
