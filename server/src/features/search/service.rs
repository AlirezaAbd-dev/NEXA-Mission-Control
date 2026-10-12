use crate::{
    error::AppError,
    features::search::{
        dto::{SearchQuery, SearchResultItem},
        expression,
        repository::SearchRepository,
    },
    state::AppState,
};
pub struct SearchService;
impl SearchService {
    pub async fn search(
        s: &AppState,
        user: &str,
        q: SearchQuery,
    ) -> Result<Vec<SearchResultItem>, AppError> {
        if q.q.trim().is_empty() {
            return Ok(Vec::new());
        }
        let expr = expression::parse(&q.q)?;
        SearchRepository::search_expression(&s.pool, &expr, user).await
    }
}
