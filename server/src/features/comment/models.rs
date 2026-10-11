use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Comment {
    pub id: String,
    pub card_id: String,
    pub author_id: Option<String>,
    pub body: String,
    pub edited_at: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Reaction {
    pub id: String,
    pub comment_id: String,
    pub user_id: String,
    pub emoji: String,
}
