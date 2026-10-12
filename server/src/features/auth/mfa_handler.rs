use super::mfa_service as s;
use crate::{error::AppError, extractors::auth::AuthUser, state::AppState};
use axum::{extract::State, Json};
use serde::Deserialize;
use serde_json::Value;
#[derive(Deserialize)]
pub struct Input {
    #[serde(default)]
    pub password: String,
    #[serde(default)]
    pub otp: String,
}
pub async fn status(State(st): State<AppState>, a: AuthUser) -> Result<Json<Value>, AppError> {
    Ok(Json(s::status(&st, &a.id).await?))
}
pub async fn setup(
    State(st): State<AppState>,
    a: AuthUser,
    Json(r): Json<Input>,
) -> Result<Json<Value>, AppError> {
    Ok(Json(s::setup(&st, &a.id, &r.password).await?))
}
pub async fn enable(
    State(st): State<AppState>,
    a: AuthUser,
    Json(r): Json<Input>,
) -> Result<Json<Value>, AppError> {
    Ok(Json(s::enable(&st, &a.id, &r.otp).await?))
}
pub async fn disable(
    State(st): State<AppState>,
    a: AuthUser,
    Json(r): Json<Input>,
) -> Result<Json<Value>, AppError> {
    Ok(Json(s::disable(&st, &a.id, &r.password, &r.otp).await?))
}
