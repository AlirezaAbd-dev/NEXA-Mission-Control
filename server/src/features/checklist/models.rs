use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Checklist {
    pub id: String,
    pub card_id: String,
    pub title: String,
    pub position: f64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ChecklistItem {
    pub id: String,
    pub checklist_id: String,
    pub title: String,
    pub is_done: i64,
    pub position: f64,
    pub assignee_id: Option<String>,
    pub due_date: Option<String>,
    pub created_at: String,
}
