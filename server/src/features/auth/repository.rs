use sqlx::SqlitePool;
use crate::{error::AppError, features::auth::models::User};

pub struct AuthRepository;

impl AuthRepository {
    pub async fn find_by_email(pool: &SqlitePool, email: &str) -> Result<Option<User>, AppError> {
        let user = sqlx::query_as::<_, User>(
            "SELECT id, email, username, display_name, avatar_url, password_hash, role, created_at, updated_at FROM users WHERE email = ?1",
        )
        .bind(email)
        .fetch_optional(pool)
        .await?;

        Ok(user)
    }

    pub async fn find_by_username(pool: &SqlitePool, username: &str) -> Result<Option<User>, AppError> {
        let user = sqlx::query_as::<_, User>(
            "SELECT id, email, username, display_name, avatar_url, password_hash, role, created_at, updated_at FROM users WHERE username = ?1",
        )
        .bind(username)
        .fetch_optional(pool)
        .await?;

        Ok(user)
    }

    pub async fn find_by_id(pool: &SqlitePool, id: &str) -> Result<Option<User>, AppError> {
        let user = sqlx::query_as::<_, User>(
            "SELECT id, email, username, display_name, avatar_url, password_hash, role, created_at, updated_at FROM users WHERE id = ?1",
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        Ok(user)
    }

    pub async fn create_user(
        pool: &SqlitePool,
        id: &str,
        email: &str,
        username: &str,
        display_name: &str,
        password_hash: &str,
        role: &str,
        now: &str,
    ) -> Result<User, AppError> {
        sqlx::query(
            "INSERT INTO users (id, email, username, display_name, password_hash, role, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)",
        )
        .bind(id)
        .bind(email)
        .bind(username)
        .bind(display_name)
        .bind(password_hash)
        .bind(role)
        .bind(now)
        .execute(pool)
        .await?;

        let user = Self::find_by_id(pool, id)
            .await?
            .ok_or_else(|| AppError::Internal("Failed to retrieve created user".to_string()))?;

        Ok(user)
    }

    pub async fn update_user(
        pool: &SqlitePool,
        id: &str,
        display_name: Option<&str>,
        avatar_url: Option<&str>,
        now: &str,
    ) -> Result<User, AppError> {
        let current = Self::find_by_id(pool, id)
            .await?
            .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

        let new_display_name = display_name.unwrap_or(&current.display_name);
        let new_avatar_url = avatar_url.or(current.avatar_url.as_deref());

        sqlx::query(
            "UPDATE users SET display_name = ?1, avatar_url = ?2, updated_at = ?3 WHERE id = ?4",
        )
        .bind(new_display_name)
        .bind(new_avatar_url)
        .bind(now)
        .bind(id)
        .execute(pool)
        .await?;

        let updated = Self::find_by_id(pool, id)
            .await?
            .ok_or_else(|| AppError::Internal("Failed to retrieve updated user".to_string()))?;

        Ok(updated)
    }
}
