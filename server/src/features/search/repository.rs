use sqlx::SqlitePool;
use crate::{
    error::AppError,
    features::search::dto::SearchResultItem,
};

pub struct SearchRepository;

impl SearchRepository {
    pub async fn search_cards(pool: &SqlitePool, q: &str, user_id: &str) -> Result<Vec<SearchResultItem>, AppError> {
        let pattern = format!("%{}%", q);

        let rows = sqlx::query_as::<_, (String, String, String, String, Option<String>, String)>(
            r#"
            SELECT c.id, c.project_id, p.name AS project_name, c.title, c.description, c.priority
            FROM cards c
            INNER JOIN projects p ON c.project_id = p.id
            INNER JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
            WHERE wm.user_id = ?1
              AND (c.title LIKE ?2 OR c.description LIKE ?2)
            ORDER BY c.updated_at DESC
            LIMIT 30
            "#
        )
        .bind(user_id)
        .bind(&pattern)
        .fetch_all(pool)
        .await?;

        let results = rows.into_iter().map(|(card_id, project_id, project_name, title, description, priority)| {
            SearchResultItem {
                card_id,
                project_id,
                project_name,
                title,
                description,
                priority,
            }
        }).collect();

        Ok(results)
    }
}
