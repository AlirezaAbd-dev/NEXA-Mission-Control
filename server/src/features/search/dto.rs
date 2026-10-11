use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct SearchQuery {
    pub q: String,
    pub workspace_id: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct SearchResultItem {
    pub card_id: String,
    pub project_id: String,
    pub project_name: String,
    pub title: String,
    pub description: Option<String>,
    pub priority: String,
}
