pub mod dto;
mod handler;
pub mod policy;
pub mod repository;
pub mod scheduled;
pub mod service;
pub mod workflow;
use crate::state::AppState;
use axum::{
    routing::{get, post},
    Router,
};
pub fn router() -> Router<AppState> {
    Router::new()
        .route(
            "/personal/{kind}",
            get(handler::personal).post(handler::save_personal),
        )
        .route(
            "/personal/{kind}/{id}",
            axum::routing::put(handler::update_personal).delete(handler::delete_personal),
        )
        .route("/personal/inbox/{id}/convert", post(handler::convert))
        .route("/workspaces/{workspace}/work", get(handler::work))
        .route(
            "/workspaces/{workspace}/capacity",
            get(handler::capacity).post(handler::save_capacity),
        )
        .route(
            "/projects/{project}/{kind}",
            get(handler::resources).post(handler::save_resource),
        )
        .route(
            "/projects/{project}/{kind}/{id}",
            axum::routing::delete(handler::delete_resource),
        )
        .route(
            "/projects/{project}/cards/{card}/settings",
            axum::routing::put(handler::settings),
        )
        .route(
            "/projects/{project}/cards/{card}/development",
            get(handler::development),
        )
        .route(
            "/projects/{project}/cards/{card}/approval",
            post(handler::approval),
        )
        .route(
            "/projects/{project}/approvals/{id}/approve",
            post(handler::approve),
        )
        .route(
            "/projects/{project}/templates/{id}/apply",
            post(handler::apply_template),
        )
        .route("/intake/{token}", get(handler::form).post(handler::submit))
}
