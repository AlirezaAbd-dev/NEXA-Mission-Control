pub mod dto;
mod handler;
pub mod repository;
pub mod service;
use crate::state::AppState;
use axum::{
    routing::{get, post},
    Router,
};
pub fn router() -> Router<AppState> {
    Router::new()
        .route(
            "/projects/{project}/{kind}",
            get(handler::list).post(handler::save),
        )
        .route(
            "/projects/{project}/{kind}/{id}",
            axum::routing::delete(handler::remove),
        )
        .route(
            "/projects/{project}/tickets/{id}/messages",
            get(handler::messages).post(handler::message),
        )
        .route(
            "/projects/{project}/tickets/{id}/task",
            post(handler::convert),
        )
        .route("/projects/{project}/plugins/{id}/run", post(handler::run))
}
