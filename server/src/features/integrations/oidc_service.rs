use super::oidc_repository as repo;
use crate::{error::AppError, extractors::auth::Claims, state::AppState};
use axum::{http::HeaderMap, response::Redirect};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use jsonwebtoken::{decode, decode_header, jwk::JwkSet, Algorithm, DecodingKey, Validation};
use serde::Deserialize;
use serde_json::Value;
use sha2::{Digest, Sha256};
struct Settings {
    issuer: String,
    client_id: String,
    client_secret: String,
    redirect_uri: String,
    frontend: String,
}
fn settings() -> Result<Settings, AppError> {
    let read = |key: &str| {
        std::env::var(key)
            .map_err(|_| AppError::Validation(format!("SSO is not configured ({key})")))
    };
    let s = Settings {
        issuer: read("OIDC_ISSUER")?,
        client_id: read("OIDC_CLIENT_ID")?,
        client_secret: read("OIDC_CLIENT_SECRET")?,
        redirect_uri: read("OIDC_REDIRECT_URI")?,
        frontend: std::env::var("PUBLIC_APP_URL")
            .unwrap_or_else(|_| "http://localhost:3000".into()),
    };
    if !s.issuer.starts_with("https://") {
        return Err(AppError::Validation("OIDC issuer must use HTTPS".into()));
    }
    Ok(s)
}
fn client() -> Result<reqwest::Client, AppError> {
    reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| AppError::Internal(e.to_string()))
}
async fn discovery(c: &reqwest::Client, s: &Settings) -> Result<Value, AppError> {
    let v: Value = c
        .get(format!(
            "{}/.well-known/openid-configuration",
            s.issuer.trim_end_matches('/')
        ))
        .send()
        .await
        .map_err(|_| AppError::Internal("SSO discovery is unavailable".into()))?
        .error_for_status()
        .map_err(|_| AppError::Internal("SSO discovery failed".into()))?
        .json()
        .await
        .map_err(|_| AppError::Internal("SSO discovery is invalid".into()))?;
    if v["issuer"].as_str() != Some(s.issuer.as_str()) {
        return Err(AppError::Unauthorized("OIDC issuer mismatch".into()));
    }
    for key in ["authorization_endpoint", "token_endpoint", "jwks_uri"] {
        if !v[key].as_str().unwrap_or("").starts_with("https://") {
            return Err(AppError::Validation("OIDC endpoints must use HTTPS".into()));
        }
    }
    Ok(v)
}
pub fn enabled() -> bool {
    settings().is_ok()
}
pub async fn login_service(state: AppState) -> Result<(HeaderMap, Redirect), AppError> {
    let s = settings()?;
    let c = client()?;
    let d = discovery(&c, &s).await?;
    let id = super::service::random_secret();
    let nonce = super::service::random_secret();
    let verifier = super::service::random_secret();
    repo::create_session(&state.pool, &id, &nonce, &verifier).await?;
    let challenge = URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()));
    let mut url = reqwest::Url::parse(d["authorization_endpoint"].as_str().unwrap_or(""))
        .map_err(|_| AppError::Validation("Invalid OIDC authorization URL".into()))?;
    url.query_pairs_mut().extend_pairs([
        ("client_id", s.client_id.as_str()),
        ("response_type", "code"),
        ("scope", "openid email profile"),
        ("redirect_uri", s.redirect_uri.as_str()),
        ("state", id.as_str()),
        ("nonce", nonce.as_str()),
        ("code_challenge", challenge.as_str()),
        ("code_challenge_method", "S256"),
    ]);
    let mut h = HeaderMap::new();
    let secure = if s.redirect_uri.starts_with("https://") {
        "; Secure"
    } else {
        ""
    };
    h.insert("set-cookie",format!("mc_oidc_state={id}; HttpOnly; SameSite=Lax; Path=/api/v1/integrations/oidc; Max-Age=600{secure}").parse().map_err(|_|AppError::Internal("Invalid cookie".into()))?);
    Ok((h, Redirect::to(url.as_str())))
}
#[derive(Deserialize)]
pub struct Callback {
    state: String,
    code: String,
}
#[derive(Deserialize)]
struct Identity {
    sub: String,
    nonce: String,
    email: Option<String>,
    email_verified: Option<bool>,
    #[serde(default)]
    name: String,
    aud: Value,
    azp: Option<String>,
}
pub async fn callback_service(
    state: AppState,
    q: Callback,
    h: HeaderMap,
) -> Result<(HeaderMap, Redirect), AppError> {
    let cookie = h
        .get("cookie")
        .and_then(|v| v.to_str().ok())
        .and_then(|c| {
            c.split(';')
                .map(str::trim)
                .find_map(|s| s.strip_prefix("mc_oidc_state="))
        })
        .unwrap_or("");
    if cookie != q.state || cookie.is_empty() {
        return Err(AppError::Unauthorized(
            "SSO browser state did not match".into(),
        ));
    }
    let (nonce, verifier) = repo::take_session(&state.pool, &q.state)
        .await?
        .ok_or_else(|| AppError::Unauthorized("SSO session expired".into()))?;
    let s = settings()?;
    let c = client()?;
    let d = discovery(&c, &s).await?;
    let response: Value = c
        .post(d["token_endpoint"].as_str().unwrap_or(""))
        .basic_auth(&s.client_id, Some(&s.client_secret))
        .form(&[
            ("grant_type", "authorization_code"),
            ("code", q.code.as_str()),
            ("redirect_uri", s.redirect_uri.as_str()),
            ("code_verifier", verifier.as_str()),
        ])
        .send()
        .await
        .map_err(|_| AppError::Unauthorized("SSO token exchange failed".into()))?
        .error_for_status()
        .map_err(|_| AppError::Unauthorized("SSO authorization was rejected".into()))?
        .json()
        .await
        .map_err(|_| AppError::Unauthorized("Invalid SSO token response".into()))?;
    let token = response["id_token"]
        .as_str()
        .ok_or_else(|| AppError::Unauthorized("SSO provider did not return an ID token".into()))?;
    let header =
        decode_header(token).map_err(|_| AppError::Unauthorized("Invalid ID token".into()))?;
    if header.alg != Algorithm::RS256 {
        return Err(AppError::Unauthorized(
            "SSO provider must use RS256 signing".into(),
        ));
    }
    let jwks: JwkSet = c
        .get(d["jwks_uri"].as_str().unwrap_or(""))
        .send()
        .await
        .map_err(|_| AppError::Internal("SSO keys unavailable".into()))?
        .json()
        .await
        .map_err(|_| AppError::Internal("SSO keys invalid".into()))?;
    let key = jwks
        .keys
        .iter()
        .find(|k| k.common.key_id == header.kid && header.kid.is_some())
        .ok_or_else(|| AppError::Unauthorized("Unknown ID token signing key".into()))?;
    let key = DecodingKey::from_jwk(key)
        .map_err(|_| AppError::Unauthorized("Invalid signing key".into()))?;
    let mut v = Validation::new(Algorithm::RS256);
    v.set_issuer(&[&s.issuer]);
    v.set_audience(&[&s.client_id]);
    v.set_required_spec_claims(&["exp", "iss", "aud", "sub", "iat"]);
    let identity = decode::<Identity>(token, &key, &v)
        .map_err(|_| AppError::Unauthorized("SSO token validation failed".into()))?
        .claims;
    if identity.nonce != nonce || identity.sub.is_empty() {
        return Err(AppError::Unauthorized(
            "SSO nonce or subject did not match".into(),
        ));
    }
    if identity.aud.as_array().is_some_and(|a| a.len() > 1)
        && identity.azp.as_deref() != Some(s.client_id.as_str())
    {
        return Err(AppError::Unauthorized(
            "SSO authorized party mismatch".into(),
        ));
    }
    let user = repo::identity(&state.pool, &s.issuer, &identity.sub)
        .await?
        .ok_or_else(|| {
            AppError::Forbidden(
                "This SSO identity is not linked. Ask your administrator to link your account."
                    .into(),
            )
        })?;
    let claims = Claims {
        sub: user.0,
        email: user.1,
        role: user.2,
        exp: (chrono::Utc::now() + chrono::Duration::hours(8)).timestamp() as usize,
    };
    let token = jsonwebtoken::encode(
        &jsonwebtoken::Header::default(),
        &claims,
        &jsonwebtoken::EncodingKey::from_secret(state.config.jwt_secret.as_bytes()),
    )
    .map_err(|_| AppError::Internal("Failed to create login session".into()))?;
    let mut headers = HeaderMap::new();
    headers.insert(
        "cache-control",
        "no-store"
            .parse()
            .map_err(|_| AppError::Internal("Invalid header".into()))?,
    );
    headers.insert(
        "set-cookie",
        "mc_oidc_state=; HttpOnly; SameSite=Lax; Path=/api/v1/integrations/oidc; Max-Age=0"
            .parse()
            .map_err(|_| AppError::Internal("Invalid header".into()))?,
    );
    Ok((
        headers,
        Redirect::to(&format!(
            "{}/sso/callback#token={token}",
            s.frontend.trim_end_matches('/')
        )),
    ))
}
