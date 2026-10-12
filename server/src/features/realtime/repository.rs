use sqlx::SqlitePool;
pub async fn allowed(pool: &SqlitePool, project: &str, user: &str) -> bool {
    crate::features::enterprise::repository::role(pool, project, user)
        .await
        .ok()
        .flatten()
        .is_some()
}
