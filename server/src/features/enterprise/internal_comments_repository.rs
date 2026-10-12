use crate::error::AppError;
use sqlx::SqlitePool;
pub async fn internal_ids(pool: &SqlitePool, card: &str) -> Result<Vec<String>, AppError> {
    Ok(
        sqlx::query_scalar("SELECT id FROM comments WHERE card_id=? AND is_internal=1")
            .bind(card)
            .fetch_all(pool)
            .await?,
    )
}
pub async fn set_internal(pool: &SqlitePool, id: &str, internal: bool) -> Result<(), AppError> {
    sqlx::query("UPDATE comments SET is_internal=? WHERE id=?")
        .bind(internal)
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}
