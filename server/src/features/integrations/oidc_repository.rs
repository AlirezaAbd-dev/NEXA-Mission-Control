use crate::error::AppError;
use sqlx::SqlitePool;
pub async fn create_session(
    pool: &SqlitePool,
    id: &str,
    nonce: &str,
    verifier: &str,
) -> Result<(), AppError> {
    sqlx::query("DELETE FROM oidc_sessions WHERE created_at<?")
        .bind((chrono::Utc::now() - chrono::Duration::minutes(10)).to_rfc3339())
        .execute(pool)
        .await?;
    sqlx::query("INSERT INTO oidc_sessions(id,nonce,verifier,created_at) VALUES(?,?,?,?)")
        .bind(id)
        .bind(nonce)
        .bind(verifier)
        .bind(chrono::Utc::now().to_rfc3339())
        .execute(pool)
        .await?;
    Ok(())
}
pub async fn take_session(
    pool: &SqlitePool,
    id: &str,
) -> Result<Option<(String, String)>, AppError> {
    Ok(sqlx::query_as(
        "DELETE FROM oidc_sessions WHERE id=? AND created_at>? RETURNING nonce,verifier",
    )
    .bind(id)
    .bind((chrono::Utc::now() - chrono::Duration::minutes(10)).to_rfc3339())
    .fetch_optional(pool)
    .await?)
}
pub async fn identity(
    pool: &SqlitePool,
    issuer: &str,
    sub: &str,
) -> Result<Option<(String, String, String)>, AppError> {
    Ok(sqlx::query_as("SELECT u.id,u.email,u.role FROM oidc_identities i JOIN users u ON u.id=i.user_id WHERE i.issuer=? AND i.subject=?").bind(issuer).bind(sub).fetch_optional(pool).await?)
}
