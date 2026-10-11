use std::sync::Arc;
use sqlx::SqlitePool;
use crate::config::Config;

#[derive(Clone)]
pub struct AppState {
    pub pool: SqlitePool,
    pub config: Arc<Config>,
}

impl AppState {
    pub fn new(pool: SqlitePool, config: Config) -> Self {
        Self {
            pool,
            config: Arc::new(config),
        }
    }
}
