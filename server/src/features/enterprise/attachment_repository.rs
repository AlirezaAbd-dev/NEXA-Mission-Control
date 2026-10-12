use super::attachment_dto::Attachment;
use crate::error::AppError;
use serde_json::json;
use sqlx::SqlitePool;
pub async fn list(pool: &SqlitePool, card: &str) -> Result<Vec<Attachment>, AppError> {
    Ok(sqlx::query_as("SELECT id,card_id,filename,file_path,file_size,mime_type,created_at FROM attachments WHERE card_id=? ORDER BY created_at DESC").bind(card).fetch_all(pool).await?)
}
pub async fn create(
    pool: &SqlitePool,
    p: &str,
    user: &str,
    a: &Attachment,
) -> Result<(), AppError> {
    let mut tx = pool.begin().await?;
    sqlx::query("INSERT INTO attachments(id,card_id,uploader_id,filename,file_path,file_size,mime_type,created_at) VALUES(?,?,?,?,?,?,?,?)").bind(&a.id).bind(&a.card_id).bind(user).bind(&a.filename).bind(&a.file_path).bind(a.file_size).bind(&a.mime_type).bind(&a.created_at).execute(&mut *tx).await?;
    super::repository::audit(
        &mut tx,
        p,
        Some(&a.card_id),
        Some(user),
        "attached_file",
        json!({"filename":a.filename,"size":a.file_size}),
    )
    .await?;
    tx.commit().await?;
    Ok(())
}
pub async fn remove(
    pool: &SqlitePool,
    p: &str,
    user: &str,
    card: &str,
    id: &str,
) -> Result<String, AppError> {
    let mut tx = pool.begin().await?;
    let file: Option<String> =
        sqlx::query_scalar("DELETE FROM attachments WHERE id=? AND card_id=? RETURNING file_path")
            .bind(id)
            .bind(card)
            .fetch_optional(&mut *tx)
            .await?;
    let file =
        file.ok_or_else(|| AppError::NotFound("Attachment not found on this task".into()))?;
    sqlx::query("UPDATE cards SET cover_url=NULL WHERE id=? AND cover_url=?")
        .bind(card)
        .bind(&file)
        .execute(&mut *tx)
        .await?;
    super::repository::audit(
        &mut tx,
        p,
        Some(card),
        Some(user),
        "removed_attachment",
        json!({"attachment_id":id}),
    )
    .await?;
    tx.commit().await?;
    Ok(file)
}
