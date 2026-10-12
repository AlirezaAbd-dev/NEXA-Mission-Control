use serde::Deserialize;
use validator::Validate;
#[derive(Deserialize, Validate, Default)]
pub struct Input {
    #[serde(default)]
    #[validate(length(max = 255))]
    pub title: String,
    #[serde(default)]
    #[validate(length(max = 20000))]
    pub body: String,
    #[serde(default)]
    #[validate(length(max = 120))]
    pub name: String,
    pub id: Option<String>,
    pub user_id: Option<String>,
    pub role_id: Option<String>,
    pub card_id: Option<String>,
    pub column_id: Option<String>,
    pub permissions: Option<Vec<String>>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub assignee_id: Option<String>,
    #[serde(default)]
    pub internal: bool,
    #[serde(default)]
    pub published: bool,
    pub response_hours: Option<i64>,
    pub resolution_hours: Option<i64>,
    pub manifest: Option<serde_json::Value>,
    pub enabled: Option<bool>,
}
