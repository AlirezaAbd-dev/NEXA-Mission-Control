use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Label {
    pub id: String,
    pub workspace_id: String,
    pub name: String,
    pub color: String,
    pub created_at: String,
}
