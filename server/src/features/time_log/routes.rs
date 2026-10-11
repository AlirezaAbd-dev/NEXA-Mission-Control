use axum::{
    routing::{delete, get},
    Router,
};
use crate::{features::time_log::handler, state::AppState};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(handler::list).post(handler::create))
        .route("/:id", delete(handler::delete))
}
