use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::Deserialize;
use crate::{
    error::AppError,
    extractors::auth::AuthUser,
    features::time_log::{
        dto::{CreateTimeLogRequest, TimeLogResponse},
        service::TimeLogService,
    },
    state::AppState,
};

#[derive(Debug, Deserialize)]
pub struct ListTimeLogsQuery {
    pub card_id: String,
}

pub async fn list(
    State(state): State<AppState>,
    auth: AuthUser,
    Query(query): Query<ListTimeLogsQuery>,
) -> Result<Json<Vec<TimeLogResponse>>, AppError> {
    let logs = TimeLogService::list_by_card(&state, &query.card_id, &auth.id).await?;
    Ok(Json(logs))
}

pub async fn create(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(payload): Json<CreateTimeLogRequest>,
) -> Result<Json<TimeLogResponse>, AppError> {
    let log = TimeLogService::create(&state, &auth.id, payload).await?;
    Ok(Json(log))
}

pub async fn delete(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    TimeLogService::delete(&state, &id, &auth.id).await?;
    Ok(Json(serde_json::json!({ "success": true })))
}

pub async fn get_active_timer(
    State(state): State<AppState>,
    auth: AuthUser,
    Query(query): Query<ListTimeLogsQuery>,
) -> Result<Json<Option<crate::features::time_log::dto::ActiveTimerResponse>>, AppError> {
    let timer = TimeLogService::get_active_timer(&state, &query.card_id, &auth.id).await?;
    Ok(Json(timer))
}

pub async fn start_timer(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(payload): Json<crate::features::time_log::dto::StartTimerRequest>,
) -> Result<Json<crate::features::time_log::dto::ActiveTimerResponse>, AppError> {
    let timer = TimeLogService::start_timer(&state, &auth.id, payload).await?;
    Ok(Json(timer))
}

pub async fn stop_timer(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(payload): Json<crate::features::time_log::dto::StopTimerRequest>,
) -> Result<Json<Option<TimeLogResponse>>, AppError> {
    let log = TimeLogService::stop_timer(&state, &auth.id, payload).await?;
    Ok(Json(log))
}

