use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
pub struct CreateCustomFieldDefinitionRequest {
    pub project_id: String,
    #[validate(length(min = 1, max = 100, message = "Name must be between 1 and 100 characters"))]
    pub name: String,
    pub field_type: String, // 'text', 'number', 'currency', 'dropdown', 'checkbox', 'date'
    pub options: Option<Vec<String>>,
    pub position: Option<f64>,
}

#[derive(Debug, Serialize, Clone)]
pub struct CustomFieldDefinitionResponse {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub field_type: String,
    pub options: Vec<String>,
    pub position: f64,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct SetCustomFieldValueRequest {
    pub card_id: String,
    pub field_id: String,
    pub value_text: Option<String>,
    pub value_number: Option<f64>,
}

#[derive(Debug, Serialize, Clone)]
pub struct CustomFieldValueResponse {
    pub id: String,
    pub card_id: String,
    pub field_id: String,
    pub field_name: String,
    pub field_type: String,
    pub options: Vec<String>,
    pub value_text: Option<String>,
    pub value_number: Option<f64>,
    pub updated_at: String,
}
