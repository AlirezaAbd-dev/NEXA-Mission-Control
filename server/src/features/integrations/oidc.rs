use super::oidc_service as service;
use crate::{error::AppError, state::AppState};
use axum::{
    extract::{Query, State},
    http::HeaderMap,
    response::Redirect,
    Json,
};
use serde_json::{json, Value};
pub async fn config() -> Json<Value> {
    Json(json!({"enabled":service::enabled()}))
}
pub async fn login(State(s): State<AppState>) -> Result<(HeaderMap, Redirect), AppError> {
    service::login_service(s).await
}
pub async fn callback(
    State(s): State<AppState>,
    Query(q): Query<service::Callback>,
    h: HeaderMap,
) -> Result<(HeaderMap, Redirect), AppError> {
    service::callback_service(s, q, h).await
}
