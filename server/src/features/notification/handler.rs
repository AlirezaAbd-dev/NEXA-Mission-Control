use axum::{
    extract::{Path, State},
    Json,
};
use crate::{
    error::AppError,
    extractors::auth::AuthUser,
    features::notification::{dto::NotificationResponse, service::NotificationService},
    state::AppState,
};

pub async fn list(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<Vec<NotificationResponse>>, AppError> {
    let notifications = NotificationService::list(&state, &auth.id).await?;
    Ok(Json(notifications))
}

pub async fn mark_read(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    NotificationService::mark_read(&state, &id, &auth.id).await?;
    Ok(Json(serde_json::json!({ "success": true })))
}

pub async fn mark_all_read(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<serde_json::Value>, AppError> {
    NotificationService::mark_all_read(&state, &auth.id).await?;
    Ok(Json(serde_json::json!({ "success": true })))
}
