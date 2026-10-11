use axum::{
    extract::{Multipart, State},
    routing::post,
    Json, Router,
};
use std::path::Path;
use uuid::Uuid;
use crate::{
    error::AppError,
    extractors::auth::AuthUser,
    state::AppState,
};

pub async fn upload_file(
    State(state): State<AppState>,
    _auth: AuthUser,
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, AppError> {
    tokio::fs::create_dir_all(&state.config.upload_dir)
        .await
        .map_err(|e| AppError::Internal(format!("Failed to create upload directory: {}", e)))?;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::Validation(format!("Multipart error: {}", e)))?
    {
        let original_name = field
            .file_name()
            .unwrap_or("file")
            .to_string();

        let ext = Path::new(&original_name)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("bin");

        let saved_filename = format!("{}.{}", Uuid::now_v7(), ext);
        let file_path = Path::new(&state.config.upload_dir).join(&saved_filename);

        let data = field
            .bytes()
            .await
            .map_err(|e| AppError::Validation(format!("Failed to read file bytes: {}", e)))?;

        tokio::fs::write(&file_path, &data)
            .await
            .map_err(|e| AppError::Internal(format!("Failed to save file: {}", e)))?;

        let url = format!("/uploads/{}", saved_filename);

        return Ok(Json(serde_json::json!({
            "url": url,
            "filename": original_name,
            "size": data.len(),
        })));
    }

    Err(AppError::Validation("No file provided in request".to_string()))
}

pub fn router() -> Router<AppState> {
    Router::new().route("/", post(upload_file))
}
