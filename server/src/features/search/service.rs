use crate::{
    error::AppError,
    features::search::{
        dto::{SearchQuery, SearchResultItem},
        repository::SearchRepository,
    },
    state::AppState,
};

pub struct SearchService;

impl SearchService {
    pub async fn search(state: &AppState, user_id: &str, query: SearchQuery) -> Result<Vec<SearchResultItem>, AppError> {
        let trimmed = query.q.trim();
        if trimmed.is_empty() {
            return Ok(Vec::new());
        }

        SearchRepository::search_cards(&state.pool, trimmed, user_id).await
    }
}
