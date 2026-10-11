use axum::{
    routing::{delete, get},
    Router,
};
use crate::{features::workspace::handler, state::AppState};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(handler::list).post(handler::create))
        .route("/:id", get(handler::get_one).put(handler::update).delete(handler::delete))
        .route("/:id/members", get(handler::list_members).post(handler::add_member))
        .route("/:id/members/:user_id", delete(handler::remove_member))
}
