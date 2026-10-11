use axum::{
    routing::{get, put},
    Router,
};
use crate::{features::label::handler, state::AppState};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(handler::list).post(handler::create))
        .route("/{id}", put(handler::update).delete(handler::delete))
}
