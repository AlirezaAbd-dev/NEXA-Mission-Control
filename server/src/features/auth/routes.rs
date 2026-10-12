use axum::{
    routing::{get, post},
    Router,
};
use crate::{features::auth::handler, state::AppState};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/mfa", get(super::mfa_handler::status))
        .route("/mfa/setup", post(super::mfa_handler::setup))
        .route("/mfa/enable", post(super::mfa_handler::enable))
        .route("/mfa/disable", post(super::mfa_handler::disable))
        .route("/register", post(handler::register))
        .route("/login", post(handler::login))
        .route("/me", get(handler::me).put(handler::update_me))
}
