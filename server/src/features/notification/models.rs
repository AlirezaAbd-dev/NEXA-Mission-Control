use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Notification {
    pub id: String,
    pub user_id: String,
    pub type_: String,
    pub read_at: Option<String>,
    pub payload: String,
    pub created_at: String,
}
