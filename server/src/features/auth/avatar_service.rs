use super::dto::AvatarUploadResponse;
use crate::{error::AppError, state::AppState};
pub const MAX_AVATAR_BYTES: usize = 2 * 1024 * 1024;

pub fn validate_avatar_url(url: &str) -> Result<(), AppError> {
    if url.is_empty() {
        return Ok(());
    }
    if url.starts_with("/uploads/") && !url.contains("..") && !url.contains(['?', '#', '\\']) {
        let lower = url.to_ascii_lowercase();
        if [".png", ".jpg", ".jpeg", ".gif", ".webp"]
            .iter()
            .any(|extension| lower.ends_with(extension))
        {
            return Ok(());
        }
    }
    if let Ok(parsed) = reqwest::Url::parse(url) {
        if parsed.scheme() == "https"
            && parsed.host_str().is_some()
            && parsed.username().is_empty()
            && parsed.password().is_none()
        {
            return Ok(());
        }
    }
    Err(AppError::Validation(
        "Choose an uploaded image or a valid HTTPS avatar URL".into(),
    ))
}
pub async fn store_avatar(
    state: &AppState,
    user_id: &str,
    bytes: &[u8],
) -> Result<AvatarUploadResponse, AppError> {
    if bytes.is_empty() || bytes.len() > MAX_AVATAR_BYTES {
        return Err(AppError::Validation("Choose an image up to 2 MB".into()));
    }
    let extension = if bytes.starts_with(b"\x89PNG\r\n\x1a\n") {
        "png"
    } else if bytes.starts_with(&[0xff, 0xd8, 0xff]) {
        "jpg"
    } else if bytes.starts_with(b"GIF87a") || bytes.starts_with(b"GIF89a") {
        "gif"
    } else if bytes.starts_with(b"RIFF") && bytes.get(8..12) == Some(b"WEBP") {
        "webp"
    } else {
        return Err(AppError::Validation(
            "Choose a PNG, JPEG, WebP or GIF image".into(),
        ));
    };
    let folder = std::path::Path::new(&state.config.upload_dir)
        .join("avatars")
        .join(user_id);
    tokio::fs::create_dir_all(&folder)
        .await
        .map_err(|_| AppError::Internal("Could not prepare avatar storage".into()))?;
    let filename = format!("{}.{}", uuid::Uuid::now_v7(), extension);
    tokio::fs::write(folder.join(&filename), bytes)
        .await
        .map_err(|_| AppError::Internal("Could not save the avatar".into()))?;
    Ok(AvatarUploadResponse {
        url: format!("/uploads/avatars/{user_id}/{filename}"),
    })
}
