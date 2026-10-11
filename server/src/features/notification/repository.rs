use sqlx::SqlitePool;
use crate::{
    error::AppError,
    features::notification::dto::NotificationResponse,
};

pub struct NotificationRepository;

impl NotificationRepository {
    pub async fn list_by_user(pool: &SqlitePool, user_id: &str) -> Result<Vec<NotificationResponse>, AppError> {
        let rows = sqlx::query_as::<_, (String, String, String, Option<String>, String, String)>(
            r#"
            SELECT id, user_id, type, read_at, payload, created_at
            FROM notifications
            WHERE user_id = ?1
            ORDER BY created_at DESC
            LIMIT 50
            "#
        )
        .bind(user_id)
        .fetch_all(pool)
        .await?;

        let results = rows.into_iter().map(|(id, user_id, type_, read_at, payload, created_at)| {
            NotificationResponse {
                id,
                user_id,
                type_,
                read_at,
                payload: serde_json::from_str(&payload).unwrap_or(serde_json::json!({})),
                created_at,
            }
        }).collect();

        Ok(results)
    }

    pub async fn mark_as_read(pool: &SqlitePool, id: &str, user_id: &str, now: &str) -> Result<(), AppError> {
        sqlx::query("UPDATE notifications SET read_at = ?1 WHERE id = ?2 AND user_id = ?3")
            .bind(now)
            .bind(id)
            .bind(user_id)
            .execute(pool)
            .await?;

        Ok(())
    }

    pub async fn mark_all_read(pool: &SqlitePool, user_id: &str, now: &str) -> Result<(), AppError> {
        sqlx::query("UPDATE notifications SET read_at = ?1 WHERE user_id = ?2 AND read_at IS NULL")
            .bind(now)
            .bind(user_id)
            .execute(pool)
            .await?;

        Ok(())
    }
}
