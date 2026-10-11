use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
pub struct CreateLabelRequest {
    pub workspace_id: String,
    #[validate(length(min = 1, max = 50, message = "Label name must be 1-50 characters"))]
    pub name: String,
    #[validate(length(min = 4, max = 9, message = "Color must be valid hex, e.g. #3b82f6"))]
    pub color: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateLabelRequest {
    #[validate(length(min = 1, max = 50, message = "Label name must be 1-50 characters"))]
    pub name: Option<String>,
    #[validate(length(min = 4, max = 9, message = "Color must be valid hex, e.g. #3b82f6"))]
    pub color: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct LabelResponse {
    pub id: String,
    pub workspace_id: String,
    pub name: String,
    pub color: String,
    pub created_at: String,
}
