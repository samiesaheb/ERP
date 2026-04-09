use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// JWT claims embedded in every Bearer token.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub:       String,   // user UUID
    pub email:     String,
    pub full_name: String,
    pub role:      String,
    pub exp:       u64,      // expiry  (Unix timestamp)
    pub iat:       u64,      // issued-at (Unix timestamp)
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
    pub token:     String,
    pub user_id:   Uuid,
    pub email:     String,
    pub full_name: String,
    pub role:      String,
}

/// A user record returned from the API.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id:         Uuid,
    pub email:      String,
    pub full_name:  String,
    pub role:       String,
    pub is_active:  bool,
    pub created_at: DateTime<Utc>,
}

/// POST /api/v1/users
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateUser {
    pub email:     String,
    pub password:  String,
    pub full_name: String,
    #[serde(default = "default_role")]
    pub role:      String,
}

fn default_role() -> String { "admin".to_string() }

/// PUT /api/v1/users/:id
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateUser {
    pub full_name: Option<String>,
    pub role:      Option<String>,
    pub is_active: Option<bool>,
    pub password:  Option<String>,
}
