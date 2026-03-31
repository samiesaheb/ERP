use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// JWT claims embedded in every Bearer token.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    /// Subject — user UUID
    pub sub: String,
    /// Email
    pub email: String,
    /// Expiry (Unix timestamp)
    pub exp: u64,
    /// Issued-at (Unix timestamp)
    pub iat: u64,
}

/// POST /auth/login request body
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

/// POST /auth/login response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginResponse {
    pub token: String,
    pub user_id: Uuid,
    pub email: String,
}
