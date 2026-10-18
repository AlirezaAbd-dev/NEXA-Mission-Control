use crate::{features::auth::handler, state::AppState};
use axum::{
    extract::DefaultBodyLimit,
    routing::{get, post},
    Router,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/mfa", get(super::mfa_handler::status))
        .route("/mfa/setup", post(super::mfa_handler::setup))
        .route("/mfa/enable", post(super::mfa_handler::enable))
        .route("/mfa/disable", post(super::mfa_handler::disable))
        .route("/register", post(handler::register))
        .route("/login", post(handler::login))
        .route(
            "/me/avatar",
            post(super::avatar_handler::upload_avatar)
                .layer(DefaultBodyLimit::max(3 * 1024 * 1024)),
        )
        .route("/me", get(handler::me).put(handler::update_me))
}
