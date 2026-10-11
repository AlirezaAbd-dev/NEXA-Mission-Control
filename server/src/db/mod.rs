use std::path::Path;
use sqlx::{sqlite::SqlitePoolOptions, SqlitePool};
use anyhow::Context;

pub async fn init_db(database_url: &str) -> anyhow::Result<SqlitePool> {
    // If database_url starts with sqlite: or sqlite://, strip protocol to check directory
    let db_path_str = database_url
        .trim_start_matches("sqlite://")
        .trim_start_matches("sqlite:")
        .split('?')
        .next()
        .unwrap_or("data/taskflow.db");

    let path = Path::new(db_path_str);
    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            tokio::fs::create_dir_all(parent)
                .await
                .with_context(|| format!("Failed to create database directory: {:?}", parent))?;
        }
    }

    let pool = SqlitePoolOptions::new()
        .max_connections(20)
        .connect(database_url)
        .await
        .with_context(|| format!("Failed to connect to SQLite at {}", database_url))?;

    // Enable WAL mode, NORMAL synchronous, foreign keys, and busy timeout
    sqlx::query("PRAGMA journal_mode = WAL;")
        .execute(&pool)
        .await
        .context("Failed to set PRAGMA journal_mode = WAL")?;

    sqlx::query("PRAGMA synchronous = NORMAL;")
        .execute(&pool)
        .await
        .context("Failed to set PRAGMA synchronous = NORMAL")?;

    sqlx::query("PRAGMA foreign_keys = ON;")
        .execute(&pool)
        .await
        .context("Failed to set PRAGMA foreign_keys = ON")?;

    sqlx::query("PRAGMA busy_timeout = 5000;")
        .execute(&pool)
        .await
        .context("Failed to set PRAGMA busy_timeout = 5000")?;

    // Run SQLx migrations
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .context("Failed to run database migrations")?;

    tracing::info!("SQLite database initialized and migrations applied successfully.");

    Ok(pool)
}
