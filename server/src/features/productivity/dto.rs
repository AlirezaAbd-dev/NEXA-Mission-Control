use serde::{Deserialize, Serialize};
use validator::Validate;
#[derive(Deserialize, Validate)]
pub struct Input {
    pub user_id: Option<String>,
    pub weekly_hours: Option<f64>,
    pub permissions: Option<Vec<String>>,
    #[serde(default)]
    #[validate(length(max = 255))]
    pub title: String,
    #[serde(default)]
    #[validate(length(max = 20000))]
    pub description: String,
    #[serde(default)]
    #[validate(length(max = 120))]
    pub name: String,
    pub card_id: Option<String>,
    pub project_id: Option<String>,
    pub column_id: Option<String>,
    pub work_type_id: Option<String>,
    pub repeat_days: Option<i64>,
    pub reminder_minutes: Option<i64>,
    pub start_at: Option<String>,
    pub end_at: Option<String>,
    pub from_column: Option<String>,
    pub to_column: Option<String>,
    #[serde(default)]
    pub require_description: bool,
    #[serde(default)]
    pub require_checklists: bool,
    #[serde(default)]
    pub require_approval: bool,
    #[serde(default)]
    pub allowed_role: String,
    #[serde(default)]
    pub color: String,
    pub done: Option<bool>,
    pub transition_id: Option<String>,
}
#[derive(Serialize, sqlx::FromRow)]
pub struct Inbox {
    pub id: String,
    pub title: String,
    pub description: String,
    pub done: i64,
    pub created_at: String,
}
#[derive(Serialize, sqlx::FromRow)]
pub struct Slot {
    pub id: String,
    pub card_id: Option<String>,
    pub title: String,
    pub start_at: String,
    pub end_at: String,
}
#[derive(Serialize, sqlx::FromRow)]
pub struct WorkCard {
    pub assignee_ids: String,
    pub status_type: String,
    pub id: String,
    pub project_id: String,
    pub project_name: String,
    pub column_id: String,
    pub status: String,
    pub title: String,
    pub priority: String,
    pub due_date: Option<String>,
    pub start_date: Option<String>,
    pub estimated_hours: Option<f64>,
    pub story_points: Option<f64>,
    pub work_type: Option<String>,
    pub assignees: String,
}
#[derive(sqlx::FromRow)]
pub struct Rule {
    pub id: String,
    pub from_column: String,
    pub to_column: String,
    pub require_description: i64,
    pub require_checklists: i64,
    pub require_approval: i64,
    pub allowed_role: String,
}
