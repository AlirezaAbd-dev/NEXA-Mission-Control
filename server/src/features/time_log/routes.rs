use axum::{
    routing::{delete, get, post},
    Router,
};
use crate::{features::time_log::handler, state::AppState};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(handler::list).post(handler::create))
        .route("/timer/active", get(handler::get_active_timer))
        .route("/timer/start", post(handler::start_timer))
        .route("/timer/stop", post(handler::stop_timer))
        .route("/{id}", delete(handler::delete))
}

