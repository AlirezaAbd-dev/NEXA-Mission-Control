use axum::{
    routing::{get, post},
    Router,
};
use crate::{features::notification::handler, state::AppState};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(handler::list))
        .route("/read-all", post(handler::mark_all_read))
        .route("/:id/read", post(handler::mark_read))
}
