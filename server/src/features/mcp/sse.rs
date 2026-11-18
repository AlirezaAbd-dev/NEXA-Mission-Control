use axum::{
    extract::{Query, State},
    http::{header, HeaderMap, StatusCode},
    response::{
        sse::{Event, KeepAlive, Sse},
        IntoResponse, Response,
    },
    Json,
};
use jsonwebtoken::{decode, DecodingKey, Validation};
use serde::Deserialize;
use serde_json::{json, Value};
use std::{collections::HashMap, convert::Infallible, sync::Arc, time::Duration};
use tokio::sync::{mpsc, RwLock};
use tokio_stream::wrappers::ReceiverStream;
use tokio_stream::StreamExt;
use crate::{
    error::AppError,
    extractors::auth::Claims,
    features::mcp::service,
    state::AppState,
};

#[derive(Debug, Deserialize, Default)]
pub struct McpQuery {
    pub session_id: Option<String>,
    pub token: Option<String>,
    pub api_key: Option<String>,
}

type SessionMap = Arc<RwLock<HashMap<String, mpsc::Sender<String>>>>;

static SESSIONS: std::sync::OnceLock<SessionMap> = std::sync::OnceLock::new();

fn get_sessions() -> &'static SessionMap {
    SESSIONS.get_or_init(|| Arc::new(RwLock::new(HashMap::new())))
}

pub async fn resolve_user_id(
    state: &AppState,
    headers: &HeaderMap,
    query: &McpQuery,
) -> Result<String, AppError> {
    // 1. Check Authorization header
    let auth_token = headers
        .get(header::AUTHORIZATION)
        .and_then(|val| val.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "));

    // 2. Check query params (?token=... or ?api_key=...)
    let token = auth_token
        .or(query.token.as_deref())
        .or(query.api_key.as_deref());

    if let Some(tok) = token {
        if tok.starts_with("mc_") {
            if let Some((id, _, _)) =
                crate::features::integrations::repository::authenticate(&state.pool, tok).await?
            {
                return Ok(id);
            }
        }

        let decoding_key = DecodingKey::from_secret(state.config.jwt_secret.as_bytes());
        let validation = Validation::default();
        if let Ok(token_data) = decode::<Claims>(tok, &decoding_key, &validation) {
            return Ok(token_data.claims.sub);
        }
    }

    // 3. Fallback to primary owner/admin in the database for single-tenant / local setups
    let fallback_user: Option<(String,)> = sqlx::query_as(
        "SELECT id FROM users ORDER BY created_at ASC LIMIT 1"
    )
    .fetch_optional(&state.pool)
    .await?;

    if let Some((uid,)) = fallback_user {
        return Ok(uid);
    }

    Err(AppError::Unauthorized("Authentication required. Provide an API token via ?token=mc_... or Authorization: Bearer mc_...".into()))
}

/// GET /api/v1/mcp/sse or /mcp/sse
pub async fn sse_handler(
    State(_state): State<AppState>,
    Query(query): Query<McpQuery>,
    headers: HeaderMap,
) -> Sse<impl tokio_stream::Stream<Item = Result<Event, Infallible>> + Send + 'static> {
    let session_id = query
        .session_id
        .unwrap_or_else(|| uuid::Uuid::now_v7().to_string());

    let (tx, rx) = mpsc::channel::<String>(128);

    {
        let sessions = get_sessions();
        let mut map = sessions.write().await;
        map.insert(session_id.clone(), tx);
    }

    let sessions_cleanup = get_sessions().clone();
    let cleanup_session_id = session_id.clone();

    // Determine host for relative/absolute endpoint message url
    let host = headers
        .get(header::HOST)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("tasks.nexasmart.net");
    let scheme = headers
        .get("x-forwarded-proto")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("https");

    let _endpoint_url = format!("{}://{}/api/v1/mcp/messages?session_id={}", scheme, host, session_id);
    let relative_endpoint = format!("/api/v1/mcp/messages?session_id={}", session_id);

    // Initial endpoint event as per MCP SSE spec
    let initial_event = Event::default()
        .event("endpoint")
        .data(relative_endpoint);

    // Stream responses sent from message handler
    let stream = ReceiverStream::new(rx).map(|msg| {
        Ok(Event::default().event("message").data(msg))
    });

    let full_stream = tokio_stream::once(Ok(initial_event)).chain(stream);

    // Wrap with guard for cleanup on drop
    let guarded_stream = GuardedStream {
        inner: Box::pin(full_stream),
        session_id: cleanup_session_id,
        sessions: sessions_cleanup,
    };

    Sse::new(guarded_stream).keep_alive(
        KeepAlive::new()
            .interval(Duration::from_secs(15))
            .text("keep-alive"),
    )
}

struct GuardedStream<S> {
    inner: std::pin::Pin<Box<S>>,
    session_id: String,
    sessions: SessionMap,
}

impl<S> tokio_stream::Stream for GuardedStream<S>
where
    S: tokio_stream::Stream<Item = Result<Event, Infallible>> + Send,
{
    type Item = Result<Event, Infallible>;

    fn poll_next(
        mut self: std::pin::Pin<&mut Self>,
        cx: &mut std::task::Context<'_>,
    ) -> std::task::Poll<Option<Self::Item>> {
        self.inner.as_mut().poll_next(cx)
    }
}

impl<S> Drop for GuardedStream<S> {
    fn drop(&mut self) {
        let sid = self.session_id.clone();
        let sessions = self.sessions.clone();
        tokio::spawn(async move {
            let mut map = sessions.write().await;
            map.remove(&sid);
        });
    }
}

/// POST /api/v1/mcp/messages
pub async fn messages_handler(
    State(state): State<AppState>,
    Query(query): Query<McpQuery>,
    headers: HeaderMap,
    Json(payload): Json<Value>,
) -> Result<Response, AppError> {
    let session_id = query
        .session_id
        .clone()
        .or_else(|| payload.get("session_id").and_then(|v| v.as_str()).map(|s| s.to_string()))
        .ok_or_else(|| AppError::Validation("Missing session_id parameter".into()))?;

    let sender = {
        let sessions = get_sessions();
        let map = sessions.read().await;
        map.get(&session_id).cloned()
    };

    let sender = sender.ok_or_else(|| AppError::NotFound(format!("Session {} not found", session_id)))?;

    let user_id = resolve_user_id(&state, &headers, &query).await?;

    let id = payload.get("id").cloned();
    let method = payload.get("method").and_then(|m| m.as_str()).unwrap_or_default();
    let params = payload.get("params").cloned().unwrap_or(json!({}));
    let is_notification = id.is_none();

    let response_result = service::handle_request(&state, &user_id, method, &params).await;

    if is_notification {
        return Ok(StatusCode::ACCEPTED.into_response());
    }

    let req_id = id.unwrap_or(Value::Null);

    let json_rpc_resp = match response_result {
        Ok(result) => json!({
            "jsonrpc": "2.0",
            "id": req_id,
            "result": result
        }),
        Err(err) => json!({
            "jsonrpc": "2.0",
            "id": req_id,
            "error": {
                "code": -32603,
                "message": err.to_string()
            }
        }),
    };

    let msg = serde_json::to_string(&json_rpc_resp).map_err(|e| AppError::Internal(e.to_string()))?;
    let _ = sender.send(msg).await;

    Ok(StatusCode::ACCEPTED.into_response())
}

/// Direct JSON-RPC (Streamable HTTP) or Discovery Handler
/// POST /api/v1/mcp or /mcp (Direct JSON-RPC)
/// GET  /api/v1/mcp or /mcp (Discovery / SSE Upgrade)
pub async fn direct_handler(
    State(state): State<AppState>,
    Query(query): Query<McpQuery>,
    headers: HeaderMap,
    method: axum::http::Method,
    body: Option<Json<Value>>,
) -> Result<Response, AppError> {
    if method == axum::http::Method::GET {
        // If client requested SSE stream, upgrade to SSE
        if let Some(accept) = headers.get(header::ACCEPT).and_then(|v| v.to_str().ok()) {
            if accept.contains("text/event-stream") {
                return Ok(sse_handler(State(state), Query(query), headers).await.into_response());
            }
        }

        // Otherwise return discovery metadata
        let mut resp = Json(json!({
            "status": "ok",
            "protocol": "mcp",
            "version": "2024-11-05",
            "serverInfo": {
                "name": "nexa-mission-control",
                "version": "1.0.0"
            },
            "capabilities": {
                "tools": {}
            },
            "endpoints": {
                "sse": "/api/v1/mcp/sse",
                "messages": "/api/v1/mcp/messages",
                "direct": "/api/v1/mcp"
            }
        })).into_response();
        resp.headers_mut().insert(
            header::HeaderName::from_static("mcp-protocol-version"),
            header::HeaderValue::from_static("2024-11-05"),
        );
        return Ok(resp);
    }

    // Direct JSON-RPC POST (Streamable HTTP)
    let payload = body
        .map(|b| b.0)
        .ok_or_else(|| AppError::Validation("Missing JSON-RPC payload".into()))?;

    let user_id = resolve_user_id(&state, &headers, &query).await?;

    let id = payload.get("id").cloned();
    let req_method = payload.get("method").and_then(|m| m.as_str()).unwrap_or_default();
    let params = payload.get("params").cloned().unwrap_or(json!({}));

    let response_result = service::handle_request(&state, &user_id, req_method, &params).await;

    if id.is_none() {
        return Ok(StatusCode::ACCEPTED.into_response());
    }

    let req_id = id.unwrap_or(Value::Null);

    let json_rpc_resp = match response_result {
        Ok(result) => json!({
            "jsonrpc": "2.0",
            "id": req_id,
            "result": result
        }),
        Err(err) => json!({
            "jsonrpc": "2.0",
            "id": req_id,
            "error": {
                "code": -32603,
                "message": err.to_string()
            }
        }),
    };

    let mut resp = Json(json_rpc_resp).into_response();
    resp.headers_mut().insert(
        header::HeaderName::from_static("mcp-protocol-version"),
        header::HeaderValue::from_static("2024-11-05"),
    );
    Ok(resp)
}
