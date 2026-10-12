use super::{
    attachment_dto::{Attachment, Upload},
    attachment_service as service,
};
use crate::{error::AppError, extractors::auth::AuthUser, state::AppState};
use axum::{
    extract::{Multipart, Path, State},
    Json,
};
use serde_json::{json, Value};
pub async fn list(
    State(s): State<AppState>,
    a: AuthUser,
    Path((p, c)): Path<(String, String)>,
) -> Result<Json<Vec<Attachment>>, AppError> {
    Ok(Json(service::list_service(&s, &a.id, &p, &c).await?))
}
pub async fn upload(
    State(s): State<AppState>,
    a: AuthUser,
    Path((p, c)): Path<(String, String)>,
    mut multipart: Multipart,
) -> Result<Json<Attachment>, AppError> {
    service::authorize_upload(&s, &a.id, &p, &c).await?;
    let field = multipart
        .next_field()
        .await
        .map_err(|_| AppError::Validation("Invalid multipart request".into()))?
        .ok_or_else(|| AppError::Validation("Choose a file".into()))?;
    let filename = field.file_name().unwrap_or("attachment").to_string();
    let data = field
        .bytes()
        .await
        .map_err(|_| AppError::Validation("File exceeds the upload limit".into()))?
        .to_vec();
    Ok(Json(
        service::upload_service(&s, &a.id, &p, &c, Upload { filename, data }).await?,
    ))
}
pub async fn remove(
    State(s): State<AppState>,
    a: AuthUser,
    Path((p, c, id)): Path<(String, String, String)>,
) -> Result<Json<Value>, AppError> {
    service::remove_service(&s, &a.id, &p, &c, &id).await?;
    Ok(Json(json!({"success":true})))
}
