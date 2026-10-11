use axum::{
    extract::State,
    Json,
};
use crate::{
    error::AppError,
    extractors::auth::AuthUser,
    features::auth::{
        dto::{AuthResponse, LoginRequest, RegisterRequest, UpdateUserRequest, UserResponse},
        service::AuthService,
    },
    state::AppState,
};

pub async fn register(
    State(state): State<AppState>,
    Json(payload): Json<RegisterRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    let response = AuthService::register(&state, payload).await?;
    Ok(Json(response))
}

pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    let response = AuthService::login(&state, payload).await?;
    Ok(Json(response))
}

pub async fn me(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<Json<UserResponse>, AppError> {
    let user = AuthService::get_me(&state, &auth.id).await?;
    Ok(Json(user))
}

pub async fn update_me(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(payload): Json<UpdateUserRequest>,
) -> Result<Json<UserResponse>, AppError> {
    let updated = AuthService::update_me(&state, &auth.id, payload).await?;
    Ok(Json(updated))
}
