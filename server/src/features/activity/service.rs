use crate::{
    error::AppError,
    features::activity::{
        dto::{ActivityResponse, ListActivitiesQuery},
        repository::ActivityRepository,
    },
    state::AppState,
};

pub struct ActivityService;

impl ActivityService {
    pub async fn list(
        state: &AppState,
        user_id: &str,
        query: ListActivitiesQuery,
    ) -> Result<Vec<ActivityResponse>, AppError> {
        if let Some(card_id) = query.card_id {
            ActivityRepository::list_by_card(&state.pool, &card_id).await
        } else if let Some(workspace_id) = query.workspace_id {
            ActivityRepository::list_by_workspace(&state.pool, &workspace_id, user_id).await
        } else {
            Ok(Vec::new())
        }
    }
}
