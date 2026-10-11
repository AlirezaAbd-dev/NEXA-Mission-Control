use axum::{
    routing::{get, post, put},
    Router,
};
use crate::{features::sprint::handler, state::AppState};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(handler::list).post(handler::create))
        .route("/:id", put(handler::update).delete(handler::delete))
        .route("/:sprint_id/card", post(handler::toggle_card))
}
