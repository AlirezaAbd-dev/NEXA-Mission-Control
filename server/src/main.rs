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
    features::auth::mfa_service::initialize_key(&cfg)?;
    tracing::info!("Starting TaskFlow server on port {}", cfg.port);

    // Initialize database pool and apply migrations
    let pool = db::init_db(&cfg.database_url).await?;

    // Create AppState
    let app_state = state::AppState::new(pool, cfg.clone());

    db::demo::seed(&app_state).await?;
    let background_state = app_state.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(60));
        loop {
            interval.tick().await;
            if let Err(error)=features::productivity::scheduled::run(&background_state).await{tracing::error!("Recurring tasks and reminders failed: {error}");}
            if let Err(error) = features::enterprise::automation::scheduled(&background_state).await {
                tracing::error!("Scheduled maintenance failed: {}", error);
            }
        }
    });
    // Build router
    let app = router::create_router(app_state);

    let host=std::env::var("HOST").unwrap_or_else(|_|"127.0.0.1".into());
    let addr:SocketAddr=format!("{host}:{}",cfg.port).parse()?;
    tracing::info!("Server listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
