use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Sprint {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub goal: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub status: String, // 'planned', 'active', 'completed'
    pub created_at: String,
}
