use chrono::Utc;
use crate::{
    error::AppError,
    features::notification::{
        dto::NotificationResponse,
        repository::NotificationRepository,
    },
    state::AppState,
};

pub struct NotificationService;

impl NotificationService {
    pub async fn list(state: &AppState, user_id: &str) -> Result<Vec<NotificationResponse>, AppError> {
        NotificationRepository::list_by_user(&state.pool, user_id).await
    }

    pub async fn mark_read(state: &AppState, id: &str, user_id: &str) -> Result<(), AppError> {
        let now = Utc::now().to_rfc3339();
        NotificationRepository::mark_as_read(&state.pool, id, user_id, &now).await
    }

    pub async fn mark_all_read(state: &AppState, user_id: &str) -> Result<(), AppError> {
        let now = Utc::now().to_rfc3339();
        NotificationRepository::mark_all_read(&state.pool, user_id, &now).await
    }
}
