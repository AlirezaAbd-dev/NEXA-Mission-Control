use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Activity {
    pub id: String,
    pub workspace_id: String,
    pub project_id: Option<String>,
    pub card_id: Option<String>,
    pub actor_id: Option<String>,
    pub action: String,
    pub payload: String,
    pub created_at: String,
}
