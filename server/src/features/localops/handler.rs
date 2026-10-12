use super::{dto::Input, service};
use crate::{error::AppError, extractors::auth::AuthUser, state::AppState};
use axum::{
    extract::{Path, State},
    Json,
};
use serde_json::Value;
pub async fn list(
    State(s): State<AppState>,
    u: AuthUser,
    Path((p, k)): Path<(String, String)>,
) -> Result<Json<Value>, AppError> {
    Ok(Json(service::list(&s, &u.id, &p, &k).await?))
}
pub async fn save(
    State(s): State<AppState>,
    u: AuthUser,
    Path((p, k)): Path<(String, String)>,
    Json(r): Json<Input>,
) -> Result<Json<Value>, AppError> {
    Ok(Json(service::save(&s, &u.id, &p, &k, r).await?))
}
pub async fn remove(
    State(s): State<AppState>,
    u: AuthUser,
    Path((p, k, id)): Path<(String, String, String)>,
) -> Result<Json<Value>, AppError> {
    Ok(Json(service::remove(&s, &u.id, &p, &k, &id).await?))
}
pub async fn messages(
    State(s): State<AppState>,
    u: AuthUser,
    Path((p, id)): Path<(String, String)>,
) -> Result<Json<Value>, AppError> {
    Ok(Json(service::messages(&s, &u.id, &p, &id).await?))
}
pub async fn message(
    State(s): State<AppState>,
    u: AuthUser,
    Path((p, id)): Path<(String, String)>,
    Json(r): Json<Input>,
) -> Result<Json<Value>, AppError> {
    Ok(Json(service::message(&s, &u.id, &p, &id, r).await?))
}
pub async fn run(
    State(s): State<AppState>,
    u: AuthUser,
    Path((p, id)): Path<(String, String)>,
    Json(r): Json<Input>,
) -> Result<Json<Value>, AppError> {
    Ok(Json(service::run(&s, &u.id, &p, &id, r).await?))
}

pub async fn convert(
    State(s): State<AppState>,
    u: AuthUser,
    Path((p, id)): Path<(String, String)>,
    Json(r): Json<Input>,
) -> Result<Json<Value>, AppError> {
    Ok(Json(service::convert(&s, &u.id, &p, &id, r).await?))
}
