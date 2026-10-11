use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
pub struct CreateWorkspaceRequest {
    #[validate(length(min = 2, max = 50, message = "Workspace name must be 2-50 characters"))]
    pub name: String,
    pub description: Option<String>,
    pub logo_url: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateWorkspaceRequest {
    #[validate(length(min = 2, max = 50, message = "Workspace name must be 2-50 characters"))]
    pub name: Option<String>,
    pub description: Option<String>,
    pub logo_url: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct WorkspaceResponse {
    pub id: String,
    pub name: String,
    pub slug: String,
    pub description: Option<String>,
    pub logo_url: Option<String>,
    pub owner_id: String,
    pub user_role: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct AddWorkspaceMemberRequest {
    #[validate(email(message = "Invalid email"))]
    pub email: String,
    pub role: String, // 'admin', 'member', 'viewer'
}

#[derive(Debug, Serialize, Clone)]
pub struct WorkspaceMemberResponse {
    pub id: String,
    pub user_id: String,
    pub email: String,
    pub username: String,
    pub display_name: String,
    pub avatar_url: Option<String>,
    pub role: String,
    pub joined_at: String,
}
