use super::{dto::*, service};
use crate::{error::AppError, extractors::auth::AuthUser, state::AppState};
use axum::{
    extract::{Path, Query, State},
    Json,
};
pub async fn list(
    State(s): State<AppState>,
    a: AuthUser,
    Query(q): Query<ListNotes>,
) -> Result<Json<Vec<Note>>, AppError> {
    Ok(Json(service::list(&s, &a.id, q).await?))
}
pub async fn create(
    State(s): State<AppState>,
    a: AuthUser,
    Json(r): Json<CreateNote>,
) -> Result<Json<Note>, AppError> {
    Ok(Json(service::create(&s, &a.id, r).await?))
}
pub async fn get(
    State(s): State<AppState>,
    a: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<Note>, AppError> {
    Ok(Json(service::get(&s, &a.id, &id).await?))
}
pub async fn update(
    State(s): State<AppState>,
    a: AuthUser,
    Path(id): Path<String>,
    Json(r): Json<UpdateNote>,
) -> Result<Json<Note>, AppError> {
    Ok(Json(service::update(&s, &a.id, &id, r).await?))
}
pub async fn links(
    State(s): State<AppState>,
    a: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<Vec<NoteLink>>, AppError> {
    Ok(Json(service::links(&s, &a.id, &id).await?))
}
pub async fn link(
    State(s): State<AppState>,
    a: AuthUser,
    Path(id): Path<String>,
    Json(r): Json<LinkInput>,
) -> Result<Json<serde_json::Value>, AppError> {
    service::link(&s, &a.id, &id, &r.card_id, false).await?;
    Ok(Json(serde_json::json!({"success":true})))
}
pub async fn unlink(
    State(s): State<AppState>,
    a: AuthUser,
    Path((id, card)): Path<(String, String)>,
) -> Result<Json<serde_json::Value>, AppError> {
    service::link(&s, &a.id, &id, &card, true).await?;
    Ok(Json(serde_json::json!({"success":true})))
}
