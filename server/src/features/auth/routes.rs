use axum::{
    routing::{get, post},
    Router,
};
use crate::{features::auth::handler, state::AppState};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/register", post(handler::register))
        .route("/login", post(handler::login))
        .route("/me", get(handler::me).put(handler::update_me))
}
