pub mod handler;
pub mod oidc;
pub mod repository;
pub mod service;
use crate::state::AppState;
use axum::{
    routing::{get, post},
    Router,
};
pub fn router() -> Router<AppState> {
    Router::new()
        .route("/tokens", get(handler::tokens).post(handler::create_token))
        .route("/tokens/{id}", axum::routing::delete(handler::revoke_token))
        .route("/github/webhook/{id}", post(handler::github))
        .route("/gitlab/webhook/{id}", post(handler::gitlab))
        .route("/email/{id}", post(handler::email))
        .route("/oidc/config", get(oidc::config))
        .route("/oidc/login", get(oidc::login))
        .route("/oidc/callback", get(oidc::callback))
}
pub mod oidc_repository;
pub mod oidc_service;
pub mod development;
