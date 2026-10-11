use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Board {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Column {
    pub id: String,
    pub board_id: String,
    pub name: String,
    pub type_: String,
    pub position: f64,
    pub wip_limit: Option<i64>,
    pub created_at: String,
}
