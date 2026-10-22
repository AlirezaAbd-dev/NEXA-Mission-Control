use super::{dto::Dashboard, service};
use crate::{error::AppError, extractors::auth::AuthUser, state::AppState};
use axum::{
    extract::{Path, Query, State},
    Json,
};
pub async fn get(
    State(s): State<AppState>,
    a: AuthUser,
    Path(workspace): Path<String>,
    Query(q): Query<super::dto::Query>,
) -> Result<Json<Dashboard>, AppError> {
    Ok(Json(service::get(&s, &a.id, &workspace, &q.today).await?))
}
