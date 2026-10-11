use axum::{
    routing::{delete, get},
    Router,
};
use crate::{features::custom_field::handler, state::AppState};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/definitions", get(handler::list_definitions).post(handler::create_definition))
        .route("/definitions/{id}", delete(handler::delete_definition))
        .route("/values", get(handler::list_values).post(handler::set_value))
}
