use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
pub struct CreateSprintRequest {
    pub project_id: String,
    #[validate(length(min = 1, max = 50, message = "Sprint name must be 1-50 characters"))]
    pub name: String,
    pub goal: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateSprintRequest {
    #[validate(length(min = 1, max = 50, message = "Sprint name must be 1-50 characters"))]
    pub name: Option<String>,
    pub goal: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub status: Option<String>, // 'planned', 'active', 'completed'
}

#[derive(Debug, Serialize, Clone)]
pub struct SprintResponse {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub goal: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub status: String,
    pub card_ids: Vec<String>,
    pub created_at: String,
}
