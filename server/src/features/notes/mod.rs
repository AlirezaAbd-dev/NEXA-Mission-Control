pub mod dto;
mod handler;
mod repository;
pub mod service;
use crate::state::AppState;
use axum::{
    extract::DefaultBodyLimit,
    routing::{delete, get},
    Router,
};
pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(handler::list).post(handler::create))
        .route("/{id}", get(handler::get).put(handler::update))
        .route("/{id}/links", get(handler::links).post(handler::link))
        .route("/{id}/links/{card}", delete(handler::unlink))
        .layer(DefaultBodyLimit::max(1024 * 1024))
}
