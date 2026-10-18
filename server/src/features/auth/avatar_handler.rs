use super::{
    avatar_service::{store_avatar, MAX_AVATAR_BYTES},
    dto::AvatarUploadResponse,
};
use crate::{error::AppError, extractors::auth::AuthUser, state::AppState};
use axum::{
    extract::{Multipart, State},
    Json,
};
pub async fn upload_avatar(
    State(state): State<AppState>,
    auth: AuthUser,
    mut multipart: Multipart,
) -> Result<Json<AvatarUploadResponse>, AppError> {
    while let Some(mut field) = multipart
        .next_field()
        .await
        .map_err(|_| AppError::Validation("Could not read the image upload".into()))?
    {
        if field.name() != Some("file") {
            continue;
        }
        let mut bytes = Vec::new();
        while let Some(chunk) = field
            .chunk()
            .await
            .map_err(|_| AppError::Validation("Could not read the image upload".into()))?
        {
            if bytes.len() + chunk.len() > MAX_AVATAR_BYTES {
                return Err(AppError::Validation("Choose an image up to 2 MB".into()));
            }
            bytes.extend_from_slice(&chunk);
        }
        return Ok(Json(store_avatar(&state, &auth.id, &bytes).await?));
    }
    Err(AppError::Validation("Choose an image to upload".into()))
}
