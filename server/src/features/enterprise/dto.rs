use serde::{Deserialize, Serialize};
use serde_json::Value;
use validator::Validate;
#[derive(Debug, Deserialize, Validate)]
pub struct ResourceRequest {
    #[validate(length(min = 1, max = 120))]
    pub name: String,
    #[serde(default)]
    pub summary: String,
    #[serde(default = "default_color")]
    pub color: String,
    #[serde(default)]
    pub status: String,
    pub start_date: Option<String>,
    pub target_date: Option<String>,
    #[serde(default)]
    pub config: Value,
    pub trigger_type: Option<String>,
    pub action_type: Option<String>,
    #[serde(default)]
    pub trigger_config: Value,
    #[serde(default)]
    pub action_config: Value,
    #[serde(default = "default_active")]
    pub is_active: bool,
    pub kind: Option<String>,
    pub url: Option<String>,
    pub card_id: Option<String>,
}
fn default_color() -> String {
    "#0d9488".into()
}
fn default_active() -> bool {
    true
}
#[derive(Debug, Deserialize, Validate)]
pub struct BulkRequest {
    #[validate(length(min = 1, max = 500))]
    pub card_ids: Vec<String>,
    pub action: String,
    pub value: Option<String>,
}
#[derive(Debug, Deserialize, Validate)]
pub struct CardMetadataRequest {
    pub epic_id: Option<String>,
    pub parent_id: Option<String>,
    pub release_id: Option<String>,
    pub sla_due_at: Option<String>,
    pub sla_response_due_at: Option<String>,
}
#[derive(Debug, Deserialize, Validate)]
pub struct SprintTransition {
    pub status: String,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub goal: Option<String>,
    pub carry_to: Option<String>,
}
#[derive(Debug, Deserialize, Validate)]
pub struct TokenRequest {
    #[validate(length(min = 1, max = 100))]
    pub name: String,
    #[validate(range(min = 1, max = 365))]
    pub days: i64,
}
#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Epic {
    pub id: String,
    pub name: String,
    pub summary: String,
    pub color: String,
    pub status: String,
    pub start_date: Option<String>,
    pub target_date: Option<String>,
    pub total: i64,
    pub done: i64,
}
