use axum::{
    extract::{FromRef, FromRequestParts},
    http::{header, request::Parts},
};
use jsonwebtoken::{decode, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use crate::{error::AppError, state::AppState};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String, // user_id
    pub email: String,
    pub role: String,
    pub exp: usize,
}

#[derive(Debug, Clone)]
pub struct AuthUser {
    pub id: String,
    pub email: String,
    pub role: String,
}

impl<S> FromRequestParts<S> for AuthUser
where
    S: Send + Sync,
    AppState: axum::extract::FromRef<S>,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let app_state = AppState::from_ref(state);

        let auth_header = parts
            .headers
            .get(header::AUTHORIZATION)
            .and_then(|val| val.to_str().ok())
            .ok_or_else(|| AppError::Unauthorized("Missing Authorization header".to_string()))?;

        let token = auth_header
            .strip_prefix("Bearer ")
            .ok_or_else(|| AppError::Unauthorized("Invalid Authorization header scheme".to_string()))?;

        let decoding_key = DecodingKey::from_secret(app_state.config.jwt_secret.as_bytes());
        let validation = Validation::default();

        let token_data = decode::<Claims>(token, &decoding_key, &validation)
            .map_err(|err| AppError::Unauthorized(format!("Invalid or expired token: {}", err)))?;

        Ok(AuthUser {
            id: token_data.claims.sub,
            email: token_data.claims.email,
            role: token_data.claims.role,
        })
    }
}
