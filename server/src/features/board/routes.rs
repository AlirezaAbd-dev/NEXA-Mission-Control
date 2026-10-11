use axum::{
    routing::{get, post, put},
    Router,
};
use crate::{features::board::handler, state::AppState};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/project/{project_id}", get(handler::get_by_project))
        .route("/{board_id}/columns", post(handler::create_column))
        .route("/{board_id}/columns/reorder", post(handler::reorder_columns))
        .route("/columns/{column_id}", put(handler::update_column).delete(handler::delete_column))
}
