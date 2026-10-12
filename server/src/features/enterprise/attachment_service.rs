use super::{
    attachment_dto::{Attachment, Upload},
    attachment_repository as repo, operations, service,
};
use crate::{error::AppError, state::AppState};
pub async fn list_service(
    s: &AppState,
    u: &str,
    p: &str,
    c: &str,
) -> Result<Vec<Attachment>, AppError> {
    service::authorize(s, u, p, false, false).await?;
    operations::require_card(&s.pool, p, c).await?;
    repo::list(&s.pool, c).await
}
pub async fn upload_service(
    s: &AppState,
    u: &str,
    p: &str,
    c: &str,
    file: Upload,
) -> Result<Attachment, AppError> {
    operations::require_card(&s.pool, p, c).await?;
    if file.data.is_empty() || file.data.len() > 10 * 1024 * 1024 || file.filename.len() > 255 {
        return Err(AppError::Validation(
            "Choose a non-empty file up to 10 MB with a name under 255 characters".into(),
        ));
    }
    let (extension, mime) = if file.data.starts_with(b"\x89PNG\r\n\x1a\n") {
        ("png", "image/png")
    } else if file.data.starts_with(b"\xff\xd8\xff") {
        ("jpg", "image/jpeg")
    } else if file.data.starts_with(b"GIF87a") || file.data.starts_with(b"GIF89a") {
        ("gif", "image/gif")
    } else if file.data.starts_with(b"RIFF") && file.data.get(8..12) == Some(b"WEBP") {
        ("webp", "image/webp")
    } else {
        ("bin", "application/octet-stream")
    };
    let id = uuid::Uuid::now_v7().to_string();
    let name = format!("{id}.{extension}");
    let path = std::path::Path::new(&s.config.upload_dir).join(&name);
    tokio::fs::create_dir_all(&s.config.upload_dir)
        .await
        .map_err(|_| AppError::Internal("Upload directory is unavailable".into()))?;
    tokio::fs::write(&path, &file.data)
        .await
        .map_err(|_| AppError::Internal("Could not save the uploaded file".into()))?;
    let attachment = Attachment {
        id,
        card_id: c.into(),
        filename: file.filename,
        file_path: format!("/uploads/{name}"),
        file_size: file.data.len() as i64,
        mime_type: mime.into(),
        created_at: chrono::Utc::now().to_rfc3339(),
    };
    if let Err(error) = repo::create(&s.pool, p, u, &attachment).await {
        let _ = tokio::fs::remove_file(path).await;
        return Err(error);
    }
    Ok(attachment)
}
pub async fn remove_service(
    s: &AppState,
    u: &str,
    p: &str,
    c: &str,
    id: &str,
) -> Result<(), AppError> {
    service::authorize(s, u, p, true, false).await?;
    operations::require_card(&s.pool, p, c).await?;
    let file = repo::remove(&s.pool, p, u, c, id).await?;
    let name = file
        .strip_prefix("/uploads/")
        .ok_or_else(|| AppError::Internal("Invalid stored attachment path".into()))?;
    if name.contains('/') || name.contains('\\') {
        return Err(AppError::Internal("Invalid stored attachment path".into()));
    }
    let path = std::path::Path::new(&s.config.upload_dir).join(name);
    if let Err(error) = tokio::fs::remove_file(path).await {
        if error.kind() != std::io::ErrorKind::NotFound {
            tracing::warn!("Removed attachment metadata; orphaned file could not be removed");
        }
    }
    Ok(())
}

pub async fn authorize_upload(s: &AppState, u: &str, p: &str, c: &str) -> Result<(), AppError> {
    service::authorize(s, u, p, true, false).await?;
    operations::require_card(&s.pool, p, c).await
}
