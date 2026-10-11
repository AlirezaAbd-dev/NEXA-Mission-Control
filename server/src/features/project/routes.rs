use axum::{
    routing::{get, post},
    Router,
};
use crate::{features::project::handler, state::AppState};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(handler::list).post(handler::create))
        .route("/:id", get(handler::get_one).put(handler::update).delete(handler::delete))
        .route("/:id/archive", post(handler::archive))
}
