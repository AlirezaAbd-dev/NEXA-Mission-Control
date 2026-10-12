#[derive(serde::Serialize, sqlx::FromRow)]
pub struct Attachment {
    pub id: String,
    pub card_id: String,
    pub filename: String,
    pub file_path: String,
    pub file_size: i64,
    pub mime_type: String,
    pub created_at: String,
}
pub struct Upload {
    pub filename: String,
    pub data: Vec<u8>,
}
