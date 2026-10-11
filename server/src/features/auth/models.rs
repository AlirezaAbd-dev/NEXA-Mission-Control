use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct User {
    pub id: String,
    pub email: String,
    pub username: String,
    pub display_name: String,
    pub avatar_url: Option<String>,
    pub password_hash: String,
    pub role: String,
    pub created_at: String,
    pub updated_at: String,
}
