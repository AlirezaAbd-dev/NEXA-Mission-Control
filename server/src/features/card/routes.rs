use axum::{
    routing::{get, post, put},
    Router,
};
use crate::{features::card::handler, state::AppState};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(handler::list).post(handler::create))
        .route("/:id", get(handler::get_one).put(handler::update).delete(handler::delete))
        .route("/:id/move", post(handler::move_card))
        .route("/:id/archive", post(handler::archive))
        .route("/:id/assignees", put(handler::set_assignees))
        .route("/:id/labels", put(handler::set_labels))
}
