use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Clone)]
pub struct ActivityResponse {
    pub id: String,
    pub workspace_id: String,
    pub project_id: Option<String>,
    pub card_id: Option<String>,
    pub actor_id: Option<String>,
    pub actor_name: String,
    pub actor_avatar: Option<String>,
    pub action: String,
    pub payload: serde_json::Value,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct ListActivitiesQuery {
    pub workspace_id: Option<String>,
    pub card_id: Option<String>,
}
