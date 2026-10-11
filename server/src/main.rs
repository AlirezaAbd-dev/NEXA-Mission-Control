#![allow(dead_code)]

use std::net::SocketAddr;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod config;
mod db;
mod error;
mod extractors;
mod features;
mod router;
mod state;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "taskflow_server=debug,tower_http=debug,axum=trace".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let cfg = config::Config::from_env();
    tracing::info!("Starting TaskFlow server on port {}", cfg.port);

    // Initialize database pool and apply migrations
    let pool = db::init_db(&cfg.database_url).await?;

    // Create AppState
    let app_state = state::AppState::new(pool, cfg.clone());

    // Build router
    let app = router::create_router(app_state);

    let addr = SocketAddr::from(([0, 0, 0, 0], cfg.port));
    tracing::info!("Server listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
