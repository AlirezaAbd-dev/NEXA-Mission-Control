mod repository;
mod service;
use crate::{error::AppError, state::AppState};
use axum::{
    extract::{ws::WebSocketUpgrade, State},
    http::{header, HeaderMap},
    response::Response,
    routing::get,
    Router,
};
#[derive(Clone, serde::Serialize)]
pub struct Change {
    pub project_id: Option<String>,
    pub user_id: Option<String>,
    pub kind: String,
}
pub fn router() -> Router<AppState> {
    Router::new().route("/socket", get(upgrade))
}
async fn upgrade(
    State(s): State<AppState>,
    headers: HeaderMap,
    ws: WebSocketUpgrade,
) -> Result<Response, AppError> {
    let permit = s.socket_slots.clone().try_acquire_owned().map_err(|_| {
        AppError::Validation("Real-time connection capacity reached; reconnect shortly".into())
    })?;
    // Browser sockets must be same-origin. Native API clients may omit Origin.
    if let Some(origin) = headers.get(header::ORIGIN).and_then(|h| h.to_str().ok()) {
        let origin = reqwest::Url::parse(origin)
            .map_err(|_| AppError::Forbidden("Invalid socket origin".into()))?;
        let host = headers
            .get(header::HOST)
            .and_then(|h| h.to_str().ok())
            .unwrap_or("");
        let authority = match origin.port() {
            Some(port) => format!("{}:{port}", origin.host_str().unwrap_or("")),
            None => origin.host_str().unwrap_or("").to_owned(),
        };
        if authority != host {
            return Err(AppError::Forbidden(
                "Socket origin must match the application".into(),
            ));
        }
    }
    Ok(ws
        .max_message_size(4096)
        .max_frame_size(4096)
        .on_upgrade(move |socket| async move {
            let _permit = permit;
            service::connect(s, socket).await
        }))
}
