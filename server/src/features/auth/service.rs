use argon2::{
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use rand_core::OsRng;
use chrono::{Duration, Utc};
use jsonwebtoken::{encode, EncodingKey, Header};
use uuid::Uuid;
use validator::Validate;

use crate::{
    error::AppError,
    extractors::auth::Claims,
    features::auth::{
        dto::{AuthResponse, LoginRequest, RegisterRequest, UpdateUserRequest, UserResponse},
        models::User,
        repository::AuthRepository,
    },
    state::AppState,
};

pub struct AuthService;

impl AuthService {
    pub async fn register(state: &AppState, req: RegisterRequest) -> Result<AuthResponse, AppError> {
        req.validate().map_err(|e| AppError::Validation(e.to_string()))?;

        if AuthRepository::find_by_email(&state.pool, &req.email).await?.is_some() {
            return Err(AppError::Conflict("Email is already registered".to_string()));
        }

        if AuthRepository::find_by_username(&state.pool, &req.username).await?.is_some() {
            return Err(AppError::Conflict("Username is already taken".to_string()));
        }

        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        let password_hash = argon2
            .hash_password(req.password.as_bytes(), &salt)
            .map_err(|e| AppError::Internal(format!("Failed to hash password: {}", e)))?
            .to_string();

        let user_id = Uuid::now_v7().to_string();
        let now = Utc::now().to_rfc3339();

        let user = AuthRepository::create_user(
            &state.pool,
            &user_id,
            &req.email,
            &req.username,
            &req.display_name,
            &password_hash,
            "member",
            &now,
        )
        .await?;

        // Automatically create a default workspace & sample project for the new user
        let ws_id = Uuid::now_v7().to_string();
        let ws_slug = format!("{}-workspace", req.username.to_lowercase());
        let _ = sqlx::query(
            "INSERT INTO workspaces (id, name, slug, description, owner_id, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)"
        )
        .bind(&ws_id)
        .bind(format!("{}'s Workspace", req.display_name))
        .bind(&ws_slug)
        .bind("Default personal workspace")
        .bind(&user_id)
        .bind(&now)
        .execute(&state.pool)
        .await;

        let _ = sqlx::query(
            "INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?1, ?2, ?3, 'owner', ?4)"
        )
        .bind(Uuid::now_v7().to_string())
        .bind(&ws_id)
        .bind(&user_id)
        .bind(&now)
        .execute(&state.pool)
        .await;

        // Create default project
        let proj_id = Uuid::now_v7().to_string();
        let _ = sqlx::query(
            "INSERT INTO projects (id, workspace_id, name, identifier, description, color, visibility, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'public', ?7, ?7)"
        )
        .bind(&proj_id)
        .bind(&ws_id)
        .bind("Welcome Project")
        .bind("TASK")
        .bind("Get started with TaskFlow")
        .bind("#6366f1")
        .bind(&now)
        .execute(&state.pool)
        .await;

        let _ = sqlx::query(
            "INSERT INTO project_members (id, project_id, user_id, role, joined_at) VALUES (?1, ?2, ?3, 'admin', ?4)"
        )
        .bind(Uuid::now_v7().to_string())
        .bind(&proj_id)
        .bind(&user_id)
        .bind(&now)
        .execute(&state.pool)
        .await;

        // Create board and default columns
        let board_id = Uuid::now_v7().to_string();
        let _ = sqlx::query(
            "INSERT INTO boards (id, project_id, name, created_at) VALUES (?1, ?2, 'Main Board', ?3)"
        )
        .bind(&board_id)
        .bind(&proj_id)
        .bind(&now)
        .execute(&state.pool)
        .await;

        let columns = [
            ("Backlog", "backlog", 1000.0),
            ("To Do", "active", 2000.0),
            ("In Progress", "active", 3000.0),
            ("Done", "done", 4000.0),
        ];

        for (col_name, col_type, pos) in columns {
            let col_id = Uuid::now_v7().to_string();
            let _ = sqlx::query(
                "INSERT INTO columns (id, board_id, name, type, position, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)"
            )
            .bind(&col_id)
            .bind(&board_id)
            .bind(col_name)
            .bind(col_type)
            .bind(pos)
            .bind(&now)
            .execute(&state.pool)
            .await;

            // If it's "To Do", add a sample welcome card
            if col_name == "To Do" {
                let card_id = Uuid::now_v7().to_string();
                let _ = sqlx::query(
                    "INSERT INTO cards (id, project_id, column_id, title, description, priority, position, creator_id, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, 'high', 1000.0, ?6, ?7, ?7)"
                )
                .bind(&card_id)
                .bind(&proj_id)
                .bind(&col_id)
                .bind("Welcome to TaskFlow! 👋")
                .bind("Explore Kanban boards, sprints, timelines, and rich card details. Drag this card to 'In Progress' to get started!")
                .bind(&user_id)
                .bind(&now)
                .execute(&state.pool)
                .await;
            }
        }

        let token = Self::generate_token(&user, &state.config.jwt_secret)?;

        Ok(AuthResponse {
            token,
            user: Self::to_user_response(&user),
        })
    }

    pub async fn login(state: &AppState, req: LoginRequest) -> Result<AuthResponse, AppError> {
        req.validate().map_err(|e| AppError::Validation(e.to_string()))?;

        let user = AuthRepository::find_by_email(&state.pool, &req.email)
            .await?
            .ok_or_else(|| AppError::Unauthorized("Invalid email or password".to_string()))?;

        let parsed_hash = PasswordHash::new(&user.password_hash)
            .map_err(|e| AppError::Internal(format!("Invalid stored password hash: {}", e)))?;

        Argon2::default()
            .verify_password(req.password.as_bytes(), &parsed_hash)
            .map_err(|_| AppError::Unauthorized("Invalid email or password".to_string()))?;

        super::mfa_service::verify_login(state,&user.id,req.otp.as_deref()).await?;
        let token = Self::generate_token(&user, &state.config.jwt_secret)?;

        Ok(AuthResponse {
            token,
            user: Self::to_user_response(&user),
        })
    }

    pub async fn get_me(state: &AppState, user_id: &str) -> Result<UserResponse, AppError> {
        let user = AuthRepository::find_by_id(&state.pool, user_id)
            .await?
            .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

        Ok(Self::to_user_response(&user))
    }

    pub async fn update_me(
        state: &AppState,
        user_id: &str,
        req: UpdateUserRequest,
    ) -> Result<UserResponse, AppError> {
        req.validate().map_err(|e| AppError::Validation(e.to_string()))?;
        let now = Utc::now().to_rfc3339();

        let updated = AuthRepository::update_user(
            &state.pool,
            user_id,
            req.display_name.as_deref(),
            req.avatar_url.as_deref(),
            &now,
        )
        .await?;

        Ok(Self::to_user_response(&updated))
    }

    fn generate_token(user: &User, secret: &str) -> Result<String, AppError> {
        let expiration = Utc::now()
            .checked_add_signed(Duration::days(30))
            .expect("valid timestamp")
            .timestamp() as usize;

        let claims = Claims {
            sub: user.id.clone(),
            email: user.email.clone(),
            role: user.role.clone(),
            exp: expiration,
        };

        encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(secret.as_bytes()),
        )
        .map_err(|e| AppError::Internal(format!("Failed to sign JWT: {}", e)))
    }

    pub fn to_user_response(user: &User) -> UserResponse {
        UserResponse {
            id: user.id.clone(),
            email: user.email.clone(),
            username: user.username.clone(),
            display_name: user.display_name.clone(),
            avatar_url: user.avatar_url.clone(),
            role: user.role.clone(),
            created_at: user.created_at.clone(),
        }
    }
}
