use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CustomFieldDefinition {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub field_type: String,
    pub options_json: String,
    pub position: f64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CustomFieldValue {
    pub id: String,
    pub card_id: String,
    pub field_id: String,
    pub value_text: Option<String>,
    pub value_number: Option<f64>,
    pub created_at: String,
    pub updated_at: String,
}
