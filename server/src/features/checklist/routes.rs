use axum::{
    routing::{delete, get, post, put},
    Router,
};
use crate::{features::checklist::handler, state::AppState};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(handler::list).post(handler::create_checklist))
        .route("/:id", delete(handler::delete_checklist))
        .route("/:checklist_id/items", post(handler::create_item))
        .route("/items/:item_id", put(handler::update_item).delete(handler::delete_item))
}
