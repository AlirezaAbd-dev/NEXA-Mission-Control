use super::{dto::Input, service as s};
use crate::{error::AppError, extractors::auth::AuthUser, state::AppState};
use axum::{
    extract::{Path, State},
    Json,
};
use serde_json::Value;
pub async fn personal(
    State(st): State<AppState>,
    a: AuthUser,
    Path(k): Path<String>,
) -> Result<Json<Value>, AppError> {
    Ok(Json(s::personal(&st, &a.id, &k).await?))
}
pub async fn save_personal(
    State(st): State<AppState>,
    a: AuthUser,
    Path(k): Path<String>,
    Json(r): Json<Input>,
) -> Result<Json<Value>, AppError> {
    Ok(Json(s::save_personal(&st, &a.id, &k, None, r).await?))
}
pub async fn update_personal(
    State(st): State<AppState>,
    a: AuthUser,
    Path((k, id)): Path<(String, String)>,
    Json(r): Json<Input>,
) -> Result<Json<Value>, AppError> {
    Ok(Json(s::save_personal(&st, &a.id, &k, Some(&id), r).await?))
}
pub async fn delete_personal(
    State(st): State<AppState>,
    a: AuthUser,
    Path((k, id)): Path<(String, String)>,
) -> Result<Json<Value>, AppError> {
    Ok(Json(s::delete_personal(&st, &a.id, &k, &id).await?))
}
pub async fn convert(
    State(st): State<AppState>,
    a: AuthUser,
    Path(id): Path<String>,
    Json(r): Json<Input>,
) -> Result<Json<Value>, AppError> {
    Ok(Json(s::convert(&st, &a.id, &id, r).await?))
}
pub async fn work(
    State(st): State<AppState>,
    a: AuthUser,
    Path(w): Path<String>,
) -> Result<Json<Value>, AppError> {
    Ok(Json(s::work(&st, &a.id, &w).await?))
}
pub async fn resources(
    State(st): State<AppState>,
    a: AuthUser,
    Path((p, k)): Path<(String, String)>,
) -> Result<Json<Value>, AppError> {
    Ok(Json(s::resources(&st, &a.id, &p, &k).await?))
}
pub async fn save_resource(
    State(st): State<AppState>,
    a: AuthUser,
    Path((p, k)): Path<(String, String)>,
    Json(r): Json<Input>,
) -> Result<Json<Value>, AppError> {
    Ok(Json(s::save_resource(&st, &a.id, &p, &k, r).await?))
}
pub async fn delete_resource(
    State(st): State<AppState>,
    a: AuthUser,
    Path((p, k, id)): Path<(String, String, String)>,
) -> Result<Json<Value>, AppError> {
    Ok(Json(s::delete_resource(&st, &a.id, &p, &k, &id).await?))
}
pub async fn settings(
    State(st): State<AppState>,
    a: AuthUser,
    Path((p, c)): Path<(String, String)>,
    Json(r): Json<Input>,
) -> Result<Json<Value>, AppError> {
    Ok(Json(s::settings(&st, &a.id, &p, &c, r).await?))
}
pub async fn approval(
    State(st): State<AppState>,
    a: AuthUser,
    Path((p, c)): Path<(String, String)>,
    Json(r): Json<Input>,
) -> Result<Json<Value>, AppError> {
    Ok(Json(s::approval(&st, &a.id, &p, &c, r).await?))
}
pub async fn approve(
    State(st): State<AppState>,
    a: AuthUser,
    Path((p, id)): Path<(String, String)>,
) -> Result<Json<Value>, AppError> {
    Ok(Json(s::approve(&st, &a.id, &p, &id).await?))
}
pub async fn form(
    State(st): State<AppState>,
    Path(token): Path<String>,
) -> Result<Json<Value>, AppError> {
    Ok(Json(s::form(&st, &token).await?))
}
pub async fn submit(
    State(st): State<AppState>,
    Path(token): Path<String>,
    Json(r): Json<Input>,
) -> Result<Json<Value>, AppError> {
    Ok(Json(s::submit(&st, &token, r).await?))
}
pub async fn apply_template(
    State(st): State<AppState>,
    a: AuthUser,
    Path((p, id)): Path<(String, String)>,
) -> Result<Json<Value>, AppError> {
    Ok(Json(s::apply_template(&st, &a.id, &p, &id).await?))
}
pub async fn capacity(
    State(st): State<AppState>,
    a: AuthUser,
    Path(w): Path<String>,
) -> Result<Json<Value>, AppError> {
    Ok(Json(s::capacity(&st, &a.id, &w).await?))
}
pub async fn save_capacity(
    State(st): State<AppState>,
    a: AuthUser,
    Path(w): Path<String>,
    Json(r): Json<Input>,
) -> Result<Json<Value>, AppError> {
    Ok(Json(s::save_capacity(&st, &a.id, &w, r).await?))
}
pub async fn development(
    State(st): State<AppState>,
    a: AuthUser,
    Path((p, c)): Path<(String, String)>,
) -> Result<Json<Value>, AppError> {
    Ok(Json(s::development(&st, &a.id, &p, &c).await?))
}
