use axum::{routing::get, Router};
use crate::{features::activity::handler, state::AppState};

pub fn router() -> Router<AppState> {
    Router::new().route("/", get(handler::list))
}
