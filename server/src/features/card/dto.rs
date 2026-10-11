use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
pub struct CreateCardRequest {
    pub project_id: String,
    pub column_id: String,
    #[validate(length(min = 1, max = 255, message = "Card title must be 1-255 characters"))]
    pub title: String,
    pub description: Option<String>,
    pub priority: Option<String>, // 'urgent', 'high', 'medium', 'low', 'no_priority'
    pub position: Option<f64>,
    pub due_date: Option<String>,
    pub start_date: Option<String>,
    pub estimated_hours: Option<f64>,
    pub assignee_ids: Option<Vec<String>>,
    pub label_ids: Option<Vec<String>>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateCardRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub priority: Option<String>,
    pub column_id: Option<String>,
    pub position: Option<f64>,
    pub due_date: Option<String>,
    pub start_date: Option<String>,
    pub estimated_hours: Option<f64>,
    pub cover_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct MoveCardRequest {
    pub column_id: String,
    pub position: f64,
}

#[derive(Debug, Serialize, Clone)]
pub struct CardAssigneeResponse {
    pub user_id: String,
    pub username: String,
    pub display_name: String,
    pub avatar_url: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct CardLabelResponse {
    pub id: String,
    pub name: String,
    pub color: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct CardResponse {
    pub id: String,
    pub project_id: String,
    pub column_id: String,
    pub title: String,
    pub description: Option<String>,
    pub priority: String,
    pub position: f64,
    pub creator_id: Option<String>,
    pub due_date: Option<String>,
    pub start_date: Option<String>,
    pub estimated_hours: Option<f64>,
    pub cover_url: Option<String>,
    pub archived_at: Option<String>,
    pub assignees: Vec<CardAssigneeResponse>,
    pub labels: Vec<CardLabelResponse>,
    pub checklist_total: i64,
    pub checklist_completed: i64,
    pub comments_count: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct ListCardsQuery {
    pub project_id: String,
    pub column_id: Option<String>,
    pub search: Option<String>,
    pub priority: Option<String>,
    pub assignee_id: Option<String>,
    pub label_id: Option<String>,
    pub archived: Option<bool>,
}
