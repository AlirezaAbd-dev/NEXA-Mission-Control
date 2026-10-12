use super::handler as h;
use crate::state::AppState;
use axum::{
    routing::{get, post, put},
    Router,
};
pub fn router() -> Router<AppState> {
    Router::new()
        .route(
            "/projects/{project}/cards/{card}/attachments",
            get(super::attachment_handler::list).post(super::attachment_handler::upload),
        )
        .route(
            "/projects/{project}/cards/{card}/attachments/{id}",
            axum::routing::delete(super::attachment_handler::remove),
        )
        .layer(axum::extract::DefaultBodyLimit::max(
            10 * 1024 * 1024 + 4096,
        ))
        .route("/workspaces/{workspace}/metrics", get(h::workspace_metrics))
        .route("/projects/{project}/bulk", post(h::bulk))
        .route(
            "/projects/{project}/preferences",
            get(h::preferences).put(h::save_preferences),
        )
        .route(
            "/projects/{project}/cards/{card}/metadata",
            put(h::metadata),
        )
        .route(
            "/projects/{project}/sprints/{sprint}/transition",
            post(h::transition),
        )
        .route("/projects/{project}/import", post(super::import::handler))
        .route("/projects/{project}/export", get(super::import::export))
        .route(
            "/projects/{project}/rules/{rule}/run",
            post(super::automation::run_handler),
        )
        .route(
            "/projects/{project}/{resource}",
            get(h::list).post(h::create),
        )
        .route(
            "/projects/{project}/{resource}/{id}",
            put(h::update).delete(h::remove),
        )
}
