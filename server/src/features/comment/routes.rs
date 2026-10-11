use axum::{
    routing::{get, post, put},
    Router,
};
use crate::{features::comment::handler, state::AppState};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(handler::list).post(handler::create))
        .route("/:id", put(handler::update).delete(handler::delete))
        .route("/:id/reaction", post(handler::toggle_reaction))
}
