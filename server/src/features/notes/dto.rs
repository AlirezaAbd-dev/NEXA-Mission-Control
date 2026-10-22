use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct Note {
    pub id: String,
    pub owner_id: Option<String>,
    pub workspace_id: Option<String>,
    pub workspace_name: Option<String>,
    pub created_by: Option<String>,
    pub author_name: Option<String>,
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub body: Option<String>,
    pub pinned: bool,
    pub version: i64,
    pub deleted_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub can_edit: bool,
}
#[derive(Deserialize, Default)]
pub struct ListNotes {
    pub card_id: Option<String>,
    pub scope: Option<String>,
    pub workspace_id: Option<String>,
    pub q: Option<String>,
    pub trash: Option<bool>,
}
#[derive(Deserialize, Validate)]
pub struct CreateNote {
    pub card_id: Option<String>,
    pub workspace_id: Option<String>,
    #[validate(length(min = 1, max = 160))]
    pub title: String,
    #[serde(default)]
    #[validate(length(max = 500000))]
    pub body: String,
}
#[derive(Deserialize, Validate)]
pub struct UpdateNote {
    #[validate(range(min = 1))]
    pub version: i64,
    #[validate(length(min = 1, max = 160))]
    pub title: Option<String>,
    #[validate(length(max = 500000))]
    pub body: Option<String>,
    pub pinned: Option<bool>,
    pub trashed: Option<bool>,
}
#[derive(Deserialize)]
pub struct LinkInput {
    pub card_id: String,
}
#[derive(Serialize, sqlx::FromRow)]
pub struct NoteLink {
    pub card_id: String,
    pub title: String,
    pub project_id: String,
    pub project_name: String,
    pub archived: bool,
}
