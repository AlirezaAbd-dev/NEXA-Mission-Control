use axum::{
    http::{header, Method},
    routing::get,
    Json, Router,
};
use tower_http::{
    cors::{AllowOrigin, CorsLayer},
    services::ServeDir,
    trace::TraceLayer,
};
use crate::{features, state::AppState};

pub fn create_router(state: AppState) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::any())
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::DELETE,
            Method::PATCH,
            Method::OPTIONS,
        ])
        .allow_headers([header::AUTHORIZATION, header::CONTENT_TYPE, header::ACCEPT]);

    let api_v1 = Router::new()
        .route("/health", get(|| async { Json(serde_json::json!({ "status": "ok", "app": "Mission Control" })) }))
        .nest("/localops",features::localops::router())
        .nest("/productivity",features::productivity::router())
        .nest("/realtime", features::realtime::router())
        .nest("/enterprise", features::enterprise::router())
        .nest("/integrations", features::integrations::router())
        .nest("/auth", features::auth::router())
        .nest("/workspaces", features::workspace::router())
        .nest("/projects", features::project::router())
        .nest("/boards", features::board::router())
        .nest("/cards", features::card::router())
        .nest("/comments", features::comment::router())
        .nest("/checklists", features::checklist::router())
        .nest("/labels", features::label::router())
        .nest("/sprints", features::sprint::router())
        .nest("/time-logs", features::time_log::router())
        .nest("/custom-fields", features::custom_field::routes::router())
        .nest("/activities", features::activity::router())

        .nest("/notifications", features::notification::router())
        .nest("/search", features::search::router())
        .nest("/upload", features::upload::router());

    let upload_dir = state.config.upload_dir.clone();

    Router::new()
        .nest("/api/v1", api_v1)
        .nest_service("/uploads", ServeDir::new(upload_dir))
        .layer(axum::middleware::from_fn_with_state(state.clone(), features::enterprise::access::guard))
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}
