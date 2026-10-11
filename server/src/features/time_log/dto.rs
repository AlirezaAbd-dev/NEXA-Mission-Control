use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
pub struct CreateTimeLogRequest {
    pub card_id: String,
    #[validate(range(min = 1, max = 1440, message = "Minutes must be between 1 and 1440"))]
    pub minutes: i64,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct TimeLogResponse {
    pub id: String,
    pub card_id: String,
    pub user_id: Option<String>,
    pub user_name: String,
    pub minutes: i64,
    pub logged_at: String,
    pub description: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct StartTimerRequest {
    pub card_id: String,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct StopTimerRequest {
    pub card_id: String,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct ActiveTimerResponse {
    pub id: String,
    pub card_id: String,
    pub user_id: String,
    pub started_at: String,
    pub description: Option<String>,
}
