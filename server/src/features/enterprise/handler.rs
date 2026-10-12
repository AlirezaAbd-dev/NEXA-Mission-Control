use super::{dto::*, service};
use crate::{error::AppError, extractors::auth::AuthUser, state::AppState};
use axum::{
    extract::{Path, State},
    Json,
};
use serde_json::Value;
pub async fn list(
    State(s): State<AppState>,
    a: AuthUser,
    Path((p, r)): Path<(String, String)>,
) -> Result<Json<Value>, AppError> {
    Ok(Json(service::list(&s, &a.id, &p, &r).await?))
}
pub async fn create(
    State(s): State<AppState>,
    a: AuthUser,
    Path((p, r)): Path<(String, String)>,
    Json(v): Json<ResourceRequest>,
) -> Result<Json<Value>, AppError> {
    Ok(Json(service::save(&s, &a.id, &p, &r, None, v).await?))
}
pub async fn update(
    State(s): State<AppState>,
    a: AuthUser,
    Path((p, r, id)): Path<(String, String, String)>,
    Json(v): Json<ResourceRequest>,
) -> Result<Json<Value>, AppError> {
    Ok(Json(service::save(&s, &a.id, &p, &r, Some(&id), v).await?))
}
pub async fn remove(
    State(s): State<AppState>,
    a: AuthUser,
    Path((p, r, id)): Path<(String, String, String)>,
) -> Result<Json<Value>, AppError> {
    Ok(Json(service::remove(&s, &a.id, &p, &r, &id).await?))
}
pub async fn bulk(
    State(s): State<AppState>,
    a: AuthUser,
    Path(p): Path<String>,
    Json(v): Json<BulkRequest>,
) -> Result<Json<Value>, AppError> {
    Ok(Json(service::bulk(&s, &a.id, &p, v).await?))
}
pub async fn metadata(
    State(s): State<AppState>,
    a: AuthUser,
    Path((p, c)): Path<(String, String)>,
    Json(v): Json<CardMetadataRequest>,
) -> Result<Json<Value>, AppError> {
    Ok(Json(service::metadata(&s, &a.id, &p, &c, v).await?))
}
pub async fn preferences(
    State(s): State<AppState>,
    a: AuthUser,
    Path(p): Path<String>,
) -> Result<Json<Value>, AppError> {
    Ok(Json(service::preferences(&s, &a.id, &p, None).await?))
}
pub async fn save_preferences(
    State(s): State<AppState>,
    a: AuthUser,
    Path(p): Path<String>,
    Json(v): Json<Value>,
) -> Result<Json<Value>, AppError> {
    Ok(Json(service::preferences(&s, &a.id, &p, Some(v)).await?))
}
pub async fn transition(
    State(s): State<AppState>,
    a: AuthUser,
    Path((p, id)): Path<(String, String)>,
    Json(v): Json<SprintTransition>,
) -> Result<Json<Value>, AppError> {
    Ok(Json(service::transition(&s, &a.id, &p, &id, v).await?))
}

pub async fn workspace_metrics(
    State(s): State<AppState>,
    a: AuthUser,
    Path(w): Path<String>,
) -> Result<Json<Value>, AppError> {
    Ok(Json(service::workspace_metrics(&s, &a.id, &w).await?))
}
