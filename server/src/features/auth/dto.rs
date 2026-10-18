use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
pub struct RegisterRequest {
    #[validate(email(message = "Invalid email format"))]
    pub email: String,
    #[validate(length(min = 3, max = 30, message = "Username must be 3-30 characters"))]
    pub username: String,
    #[validate(length(min = 2, max = 50, message = "Display name must be 2-50 characters"))]
    pub display_name: String,
    #[validate(length(min = 6, message = "Password must be at least 6 characters"))]
    pub password: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct LoginRequest {
    pub otp: Option<String>,
    // Optional legacy email field
    pub email: Option<String>,
    // Generic username or email login identifier
    pub username: Option<String>,
    #[validate(length(min = 1, message = "Password cannot be empty"))]
    pub password: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct UserResponse {
    pub id: String,
    pub email: String,
    pub username: String,
    pub display_name: String,
    pub avatar_url: Option<String>,
    pub role: String,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub user: UserResponse,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateUserRequest {
    #[validate(length(min = 2, max = 50, message = "Name must be 2-50 characters"))]
    pub display_name: Option<String>,
    #[validate(length(max = 2048))]
    pub avatar_url: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AvatarUploadResponse {
    pub url: String,
}
