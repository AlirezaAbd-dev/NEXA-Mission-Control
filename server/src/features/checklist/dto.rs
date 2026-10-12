use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
pub struct CreateChecklistRequest {
    pub card_id: String,
    #[validate(length(
        min = 1,
        max = 100,
        message = "Checklist title must be 1-100 characters"
    ))]
    pub title: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateChecklistRequest {
    #[validate(length(min = 1, max = 100))]
    pub title: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateChecklistItemRequest {
    #[validate(length(min = 1, max = 255, message = "Item title must be 1-255 characters"))]
    pub title: String,
    pub assignee_id: Option<String>,
    pub due_date: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateChecklistItemRequest {
    pub title: Option<String>,
    pub is_done: Option<bool>,
    #[serde(default, deserialize_with = "nullable_string")]
    pub assignee_id: Option<Option<String>>,
    #[serde(default, deserialize_with = "nullable_string")]
    pub due_date: Option<Option<String>>,
}

#[derive(Debug, Serialize, Clone)]
pub struct ChecklistItemResponse {
    pub id: String,
    pub checklist_id: String,
    pub title: String,
    pub is_done: bool,
    pub position: f64,
    pub assignee_id: Option<String>,
    pub due_date: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct ChecklistResponse {
    pub id: String,
    pub card_id: String,
    pub title: String,
    pub position: f64,
    pub items: Vec<ChecklistItemResponse>,
    pub created_at: String,
}

fn nullable_string<'de, D: serde::Deserializer<'de>>(
    d: D,
) -> Result<Option<Option<String>>, D::Error> {
    Ok(Some(Option::<String>::deserialize(d)?))
}
