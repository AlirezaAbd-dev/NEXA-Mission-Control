use axum::{routing::get, Router};
use crate::{features::search::handler, state::AppState};

pub fn router() -> Router<AppState> {
    Router::new().route("/", get(handler::search))
}
