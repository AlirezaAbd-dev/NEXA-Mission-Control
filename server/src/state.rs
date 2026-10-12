use crate::config::Config;
use sqlx::SqlitePool;
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub socket_slots: Arc<tokio::sync::Semaphore>,
    pub pool: SqlitePool,
    pub config: Arc<Config>,
    pub changes: tokio::sync::broadcast::Sender<crate::features::realtime::Change>,
}

impl AppState {
    pub fn publish(&self, project: Option<&str>, user: Option<&str>, kind: &str) {
        let _ = self.changes.send(crate::features::realtime::Change {
            project_id: project.map(str::to_owned),
            user_id: user.map(str::to_owned),
            kind: kind.into(),
        });
    }
    pub fn new(pool: SqlitePool, config: Config) -> Self {
        Self {
            socket_slots: Arc::new(tokio::sync::Semaphore::new(256)),
            pool,
            config: Arc::new(config),
            changes: tokio::sync::broadcast::channel(1024).0,
        }
    }
}
