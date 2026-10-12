use crate::{features::search::handler, state::AppState};
use axum::{routing::get, Router};

pub fn router() -> Router<AppState> {
    Router::new().route("/", get(handler::search))
}
