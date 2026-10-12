use crate::error::AppError;
use sqlx::SqlitePool;
#[derive(sqlx::FromRow)]
pub struct Mfa {
    pub secret: String,
    pub enabled: i64,
    pub pending_until: i64,
    pub last_counter: i64,
    pub locked_until: i64,
}
pub async fn get(pool: &SqlitePool, user: &str) -> Result<Option<Mfa>, AppError> {
    Ok(sqlx::query_as("SELECT secret,enabled,pending_until,last_counter,locked_until FROM user_mfa WHERE user_id=?").bind(user).fetch_optional(pool).await?)
}
pub async fn setup(pool: &SqlitePool, user: &str, secret: &str) -> Result<(), AppError> {
    sqlx::query("INSERT INTO user_mfa(user_id,secret,pending_until) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET secret=excluded.secret,pending_until=excluded.pending_until,enabled=0,last_counter=-1,failed_attempts=0,locked_until=0 WHERE enabled=0").bind(user).bind(secret).bind(chrono::Utc::now().timestamp()+600).execute(pool).await?;
    Ok(())
}
pub async fn enable(
    pool: &SqlitePool,
    user: &str,
    counter: i64,
    hashes: Vec<String>,
) -> Result<(), AppError> {
    let mut tx = pool.begin().await?;
    if sqlx::query("UPDATE user_mfa SET enabled=1,last_counter=? WHERE user_id=? AND enabled=0 AND pending_until>?").bind(counter).bind(user).bind(chrono::Utc::now().timestamp()).execute(&mut *tx).await?.rows_affected()!=1{return Err(AppError::Validation("Authenticator setup expired".into()));}
    sqlx::query("DELETE FROM mfa_recovery_codes WHERE user_id=?")
        .bind(user)
        .execute(&mut *tx)
        .await?;
    for hash in hashes {
        sqlx::query("INSERT INTO mfa_recovery_codes(code_hash,user_id) VALUES(?,?)")
            .bind(hash)
            .bind(user)
            .execute(&mut *tx)
            .await?;
    }
    tx.commit().await?;
    Ok(())
}
pub async fn accept_counter(pool: &SqlitePool, user: &str, counter: i64) -> Result<bool, AppError> {
    Ok(sqlx::query("UPDATE user_mfa SET last_counter=?,failed_attempts=0,locked_until=0 WHERE user_id=? AND last_counter<? AND locked_until<=?").bind(counter).bind(user).bind(counter).bind(chrono::Utc::now().timestamp()).execute(pool).await?.rows_affected()==1)
}
pub async fn recovery(pool: &SqlitePool, user: &str, hash: &str) -> Result<bool, AppError> {
    let mut tx = pool.begin().await?;
    let n = sqlx::query("DELETE FROM mfa_recovery_codes WHERE user_id=? AND code_hash=?")
        .bind(user)
        .bind(hash)
        .execute(&mut *tx)
        .await?
        .rows_affected();
    if n == 1 {
        sqlx::query("UPDATE user_mfa SET failed_attempts=0,locked_until=0 WHERE user_id=?")
            .bind(user)
            .execute(&mut *tx)
            .await?;
    }
    tx.commit().await?;
    Ok(n == 1)
}
pub async fn fail(pool: &SqlitePool, user: &str) -> Result<(), AppError> {
    sqlx::query("UPDATE user_mfa SET failed_attempts=failed_attempts+1,locked_until=CASE WHEN failed_attempts>=9 THEN ? ELSE locked_until END WHERE user_id=?").bind(chrono::Utc::now().timestamp()+300).bind(user).execute(pool).await?;
    Ok(())
}
pub async fn disable(pool: &SqlitePool, user: &str) -> Result<(), AppError> {
    let mut tx = pool.begin().await?;
    sqlx::query("DELETE FROM user_mfa WHERE user_id=?")
        .bind(user)
        .execute(&mut *tx)
        .await?;
    sqlx::query("DELETE FROM mfa_recovery_codes WHERE user_id=?")
        .bind(user)
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;
    Ok(())
}
