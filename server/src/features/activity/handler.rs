use crate::{
    error::AppError,
    extractors::auth::AuthUser,
    features::activity::{
        dto::{ActivityResponse, ListActivitiesQuery},
        service::ActivityService,
    },
    state::AppState,
};
use axum::{
    extract::{Query, State},
    Json,
};

pub async fn list(
    State(state): State<AppState>,
    auth: AuthUser,
    Query(query): Query<ListActivitiesQuery>,
) -> Result<Json<Vec<ActivityResponse>>, AppError> {
    let activities = ActivityService::list(&state, &auth.id, query).await?;
    Ok(Json(activities))
}
