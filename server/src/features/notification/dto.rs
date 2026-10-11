use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
pub struct NotificationResponse {
    pub id: String,
    pub user_id: String,
    pub type_: String,
    pub read_at: Option<String>,
    pub payload: serde_json::Value,
    pub created_at: String,
}
