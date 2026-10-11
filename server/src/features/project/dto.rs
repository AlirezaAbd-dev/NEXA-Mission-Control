use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
pub struct CreateProjectRequest {
    pub workspace_id: String,
    #[validate(length(min = 2, max = 50, message = "Project name must be 2-50 characters"))]
    pub name: String,
    #[validate(length(min = 2, max = 10, message = "Identifier must be 2-10 characters"))]
    pub identifier: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub cover_url: Option<String>,
    pub visibility: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateProjectRequest {
    #[validate(length(min = 2, max = 50, message = "Project name must be 2-50 characters"))]
    pub name: Option<String>,
    pub description: Option<String>,
    pub color: Option<String>,
    pub cover_url: Option<String>,
    pub visibility: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct ProjectResponse {
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
