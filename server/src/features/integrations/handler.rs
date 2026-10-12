use super::service;
use crate::{error::AppError, extractors::auth::AuthUser, state::AppState};
use axum::{
    body::Bytes,
    extract::{Path, State},
    http::HeaderMap,
    Json,
};
use serde_json::{json, Value};
pub async fn tokens(State(s): State<AppState>, a: AuthUser) -> Result<Json<Value>, AppError> {
    Ok(Json(service::tokens(&s, &a.id).await?))
}
pub async fn create_token(
    State(s): State<AppState>,
    a: AuthUser,
    Json(r): Json<crate::features::enterprise::dto::TokenRequest>,
) -> Result<(HeaderMap, Json<Value>), AppError> {
    let mut headers = HeaderMap::new();
    headers.insert(
        "cache-control",
        axum::http::HeaderValue::from_static("no-store"),
    );
    Ok((headers, Json(service::create_token(&s, &a.id, r).await?)))
}
pub async fn revoke_token(
    State(s): State<AppState>,
    a: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<Value>, AppError> {
    service::revoke(&s, &a.id, &id).await?;
    Ok(Json(json!({"success":true})))
}
fn header<'a>(h: &'a HeaderMap, key: &str) -> &'a str {
    h.get(key).and_then(|s| s.to_str().ok()).unwrap_or("")
}
pub async fn github(
    State(s): State<AppState>,
    Path(id): Path<String>,
    h: HeaderMap,
    body: Bytes,
) -> Result<Json<Value>, AppError> {
    Ok(Json(
        service::webhook(
            &s,
            &id,
            "github",
            &body,
            header(&h, "x-hub-signature-256"),
            header(&h, "x-github-delivery"),
        )
        .await?,
    ))
}
pub async fn gitlab(
    State(s): State<AppState>,
    Path(id): Path<String>,
    h: HeaderMap,
    body: Bytes,
) -> Result<Json<Value>, AppError> {
    Ok(Json(
        service::gitlab_webhook(
            &s,
            &id,
            &body,
            header(&h, "webhook-id"),
            header(&h, "webhook-timestamp"),
            header(&h, "webhook-signature"),
        )
        .await?,
    ))
}
pub async fn email(
    State(s): State<AppState>,
    Path(id): Path<String>,
    h: HeaderMap,
    body: Bytes,
) -> Result<Json<Value>, AppError> {
    Ok(Json(
        service::email(
            &s,
            &id,
            &body,
            header(&h, "x-mission-signature"),
            header(&h, "x-mission-delivery"),
        )
        .await?,
    ))
}
