use axum::{
    routing::{get, post},
    Router,
};
use crate::state::AppState;
use super::sse;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(sse::direct_handler).post(sse::direct_handler))
        .route("/sse", get(sse::sse_handler))
        .route("/messages", post(sse::messages_handler))
}
