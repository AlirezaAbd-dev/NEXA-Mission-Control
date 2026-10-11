use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Debug, Serialize, Clone)]
pub struct ColumnResponse {
    pub id: String,
    pub board_id: String,
    pub name: String,
    pub type_: String,
    pub position: f64,
    pub wip_limit: Option<i64>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct BoardResponse {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub columns: Vec<ColumnResponse>,
    pub created_at: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateColumnRequest {
    #[validate(length(min = 1, max = 50, message = "Column name must be 1-50 characters"))]
    pub name: String,
    pub type_: Option<String>,
    pub position: Option<f64>,
    pub wip_limit: Option<i64>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateColumnRequest {
    #[validate(length(min = 1, max = 50, message = "Column name must be 1-50 characters"))]
    pub name: Option<String>,
    pub type_: Option<String>,
    pub position: Option<f64>,
    pub wip_limit: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct ReorderColumnsRequest {
    pub column_ids: Vec<String>,
}
