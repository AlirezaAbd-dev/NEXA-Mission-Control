use axum::{
    extract::{Query, State},
    Json,
};
use crate::{
    error::AppError,
    extractors::auth::AuthUser,
    features::search::{
        dto::{SearchQuery, SearchResultItem},
        service::SearchService,
    },
    state::AppState,
};

pub async fn search(
    State(state): State<AppState>,
    auth: AuthUser,
    Query(query): Query<SearchQuery>,
) -> Result<Json<Vec<SearchResultItem>>, AppError> {
    let results = SearchService::search(&state, &auth.id, query).await?;
    Ok(Json(results))
}
