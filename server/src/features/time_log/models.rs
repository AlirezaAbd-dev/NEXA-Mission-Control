use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct TimeLog {
    pub id: String,
    pub card_id: String,
    pub user_id: Option<String>,
    pub minutes: i64,
    pub logged_at: String,
    pub description: Option<String>,
    pub created_at: String,
}
