use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Card {
    pub id: String,
    pub project_id: String,
    pub column_id: String,
    pub title: String,
    pub description: Option<String>,
    pub priority: String, // 'urgent', 'high', 'medium', 'low', 'no_priority'
    pub position: f64,
    pub creator_id: Option<String>,
    pub due_date: Option<String>,
    pub start_date: Option<String>,
    pub estimated_hours: Option<f64>,
    pub cover_url: Option<String>,
    pub archived_at: Option<String>,
    pub is_template: i64,
    pub story_points: Option<f64>,
    pub created_at: String,
    pub updated_at: String,
}
