use sqlx::SqlitePool;
pub async fn allowed(pool: &SqlitePool, project: &str, user: &str) -> bool {
    crate::features::enterprise::repository::role(pool, project, user)
        .await
        .ok()
        .flatten()
        .is_some()
}

pub async fn event_cursor(pool: &sqlx::SqlitePool) -> Result<i64, sqlx::Error> {
    sqlx::query_scalar("SELECT COALESCE(MAX(id),0) FROM realtime_outbox")
        .fetch_one(pool)
        .await
}
pub async fn events(
    pool: &sqlx::SqlitePool,
    after: i64,
) -> Result<Vec<(i64, String, String)>, sqlx::Error> {
    sqlx::query_as(
        "SELECT id,origin,payload FROM realtime_outbox WHERE id>? ORDER BY id LIMIT 1024",
    )
    .bind(after)
    .fetch_all(pool)
    .await
}
pub async fn store_event(
    pool: &sqlx::SqlitePool,
    origin: &str,
    payload: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query("INSERT INTO realtime_outbox(origin,payload,created_at) VALUES(?,?,unixepoch())")
        .bind(origin)
        .bind(payload)
        .execute(pool)
        .await?;
    Ok(())
}
pub async fn cleanup_events(pool: &sqlx::SqlitePool) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM realtime_outbox WHERE created_at<unixepoch()-3600 OR id<(SELECT COALESCE(MAX(id),0)-10000 FROM realtime_outbox)").execute(pool).await?;
    Ok(())
}
pub async fn worker_lease(pool: &sqlx::SqlitePool, owner: &str) -> Result<bool, sqlx::Error> {
    Ok(sqlx::query("INSERT INTO worker_leases(name,owner,expires_at) VALUES('maintenance',?,unixepoch()+120) ON CONFLICT(name) DO UPDATE SET owner=excluded.owner,expires_at=excluded.expires_at WHERE worker_leases.owner=excluded.owner OR worker_leases.expires_at<unixepoch()").bind(owner).execute(pool).await?.rows_affected()>0)
}
