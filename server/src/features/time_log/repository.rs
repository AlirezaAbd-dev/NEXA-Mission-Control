use sqlx::SqlitePool;
use crate::{
    error::AppError,
    features::time_log::{
        dto::TimeLogResponse,
        models::TimeLog,
    },
};

pub struct TimeLogRepository;

impl TimeLogRepository {
    pub async fn list_by_card(pool: &SqlitePool, card_id: &str) -> Result<Vec<TimeLogResponse>, AppError> {
        let logs = sqlx::query_as::<_, (String, String, Option<String>, Option<String>, i64, String, Option<String>, String)>(
            r#"
            SELECT tl.id, tl.card_id, tl.user_id, u.display_name, tl.minutes, tl.logged_at, tl.description, tl.created_at
            FROM time_logs tl
            LEFT JOIN users u ON tl.user_id = u.id
            WHERE tl.card_id = ?1
            ORDER BY tl.logged_at DESC
            "#
        )
        .bind(card_id)
        .fetch_all(pool)
        .await?;

        let results = logs
            .into_iter()
            .map(|(id, card_id, user_id, display_name, minutes, logged_at, description, created_at)| {
                TimeLogResponse {
                    id,
                    card_id,
                    user_id,
                    user_name: display_name.unwrap_or_else(|| "Unknown".to_string()),
                    minutes,
                    logged_at,
                    description,
                    created_at,
                }
            })
            .collect();

        Ok(results)
    }

    pub async fn create(
        pool: &SqlitePool,
        id: &str,
        card_id: &str,
        user_id: &str,
        minutes: i64,
        description: Option<&str>,
        now: &str,
    ) -> Result<TimeLog, AppError> {
        sqlx::query(
            "INSERT INTO time_logs (id, card_id, user_id, minutes, logged_at, description, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?5)"
        )
        .bind(id)
        .bind(card_id)
        .bind(user_id)
        .bind(minutes)
        .bind(now)
        .bind(description)
        .execute(pool)
        .await?;

        let log = sqlx::query_as::<_, TimeLog>(
            "SELECT id, card_id, user_id, minutes, logged_at, description, created_at FROM time_logs WHERE id = ?1"
        )
        .bind(id)
        .fetch_one(pool)
        .await?;

        Ok(log)
    }

    pub async fn delete(pool: &SqlitePool, id: &str) -> Result<(), AppError> {
        sqlx::query("DELETE FROM time_logs WHERE id = ?1")
            .bind(id)
            .execute(pool)
            .await?;

        Ok(())
    }
}
