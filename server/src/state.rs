use crate::config::Config;
use sqlx::SqlitePool;
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub instance_id: String,
    pub socket_slots: Arc<tokio::sync::Semaphore>,
    pub pool: SqlitePool,
    pub config: Arc<Config>,
    pub changes: tokio::sync::broadcast::Sender<crate::features::realtime::Change>,
}

impl AppState {
    pub fn publish(&self, project: Option<&str>, user: Option<&str>, kind: &str) {
        let change = crate::features::realtime::Change {
            project_id: project.map(str::to_owned),
            user_id: user.map(str::to_owned),
            kind: kind.into(),
        };
        let _ = self.changes.send(change.clone());
        let pool = self.pool.clone();
        let origin = self.instance_id.clone();
        tokio::spawn(async move {
            match serde_json::to_string(&change) {
                Ok(payload) => {
                    if let Err(e) =
                        crate::features::realtime::repository::store_event(&pool, &origin, &payload)
                            .await
                    {
                        tracing::warn!("Shared event persistence failed: {e}");
                    }
                }
                Err(e) => tracing::warn!("Change encoding failed: {e}"),
            }
        });
    }
    pub fn new(pool: SqlitePool, config: Config) -> Self {
        Self {
            instance_id: uuid::Uuid::now_v7().to_string(),
            socket_slots: Arc::new(tokio::sync::Semaphore::new(256)),
            pool,
            config: Arc::new(config),
            changes: tokio::sync::broadcast::channel(1024).0,
        }
    }
}
