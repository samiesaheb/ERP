use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// JWT claims embedded in every Bearer token.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub:   String,   // user UUID
    pub email: String,
    pub exp:   u64,      // expiry  (Unix timestamp)
    pub iat:   u64,      // issued-at (Unix timestamp)
}

/// POST /auth/login  — request body
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginRequest {
    pub email:    String,
    pub password: String,
}

/// POST /auth/login  — response body
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginResponse {
    pub token:   String,
    pub user_id: Uuid,
    pub email:   String,
}
