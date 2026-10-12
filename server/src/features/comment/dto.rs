use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
pub struct CreateCommentRequest {
    pub card_id: String,
    #[serde(default)] pub is_internal: bool,
    #[validate(length(min = 1, message = "Comment body cannot be empty"))]
    pub body: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateCommentRequest {
    #[validate(length(min = 1, message = "Comment body cannot be empty"))]
    pub body: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct AddReactionRequest {
    #[validate(length(min = 1, max = 10, message = "Emoji must be 1-10 characters"))]
    pub emoji: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct ReactionResponse {
    pub emoji: String,
    pub count: i64,
    pub user_ids: Vec<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct CommentResponse {
    pub is_internal: bool,
    pub id: String,
    pub card_id: String,
    pub author_id: Option<String>,
    pub author_name: String,
    pub author_avatar: Option<String>,
    pub body: String,
    pub edited_at: Option<String>,
    pub reactions: Vec<ReactionResponse>,
    pub created_at: String,
}
