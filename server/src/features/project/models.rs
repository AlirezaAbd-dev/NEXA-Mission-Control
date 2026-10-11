use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Project {
    pub id: String,
    pub workspace_id: String,
    pub name: String,
    pub identifier: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub cover_url: Option<String>,
    pub visibility: String,
    pub archived_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ProjectMember {
    pub id: String,
    pub project_id: String,
    pub user_id: String,
    pub role: String,
    pub joined_at: String,
}
