use axum::{
    extract::{Query, State},
    Json,
};
use crate::{
    error::AppError,
    extractors::auth::AuthUser,
    features::activity::{
        dto::{ActivityResponse, ListActivitiesQuery},
        service::ActivityService,
    },
    state::AppState,
};

pub async fn list(
    State(state): State<AppState>,
    _auth: AuthUser,
    Query(query): Query<ListActivitiesQuery>,
) -> Result<Json<Vec<ActivityResponse>>, AppError> {
    let activities = ActivityService::list(&state, query).await?;
    Ok(Json(activities))
}
