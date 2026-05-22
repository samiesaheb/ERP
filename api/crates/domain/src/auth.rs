use chrono::{DateTime, NaiveTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// JWT claims embedded in every Bearer token.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub:          String,          // user UUID
    pub email:        String,
    pub full_name:    String,
    pub role:         String,          // system role (or company-scoped role after select)
    /// Set only after the user selects a company context.
    #[serde(default)]
    pub company_id:   Option<String>,
    #[serde(default)]
    pub company_name: Option<String>,
    #[serde(default)]
    pub company_code: Option<String>,
    pub exp:          u64,
    pub iat:          u64,
}

/// POST /auth/login  — request body
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginRequest {
    pub email:    String,
    pub password: String,
}

/// One entry in a user's company list (returned at login and from /me/companies).
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct UserCompanyInfo {
    pub company_id:   Uuid,
    pub company_name: String,
    pub company_code: String,
    pub role:         String,
    pub is_primary:   bool,
}

/// POST /auth/login  — response body
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginResponse {
    pub token:     String,
    pub user_id:   Uuid,
    pub email:     String,
    pub full_name: String,
    pub role:      String,
    /// Companies the user has access to. Empty means no company memberships
    /// (legacy users) — they go straight to the dashboard.
    pub companies: Vec<UserCompanyInfo>,
}

/// POST /auth/select-company  — request body
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelectCompany {
    pub company_id: Uuid,
}

/// POST /auth/select-company  — response body
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelectCompanyResponse {
    pub token:        String,
    pub company_id:   Uuid,
    pub company_name: String,
    pub company_code: String,
    pub role:         String,
}

/// A user record returned from the API.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct User {
    pub id:                 Uuid,
    pub email:              String,
    pub full_name:          String,
    pub role:               String,
    pub is_active:          bool,
    pub created_at:         DateTime<Utc>,
    /// Comma-separated short day names: "Mon,Tue,Wed,Thu,Fri"  (NULL = unrestricted)
    pub allowed_days:       Option<String>,
    /// UTC wall-clock window start (NULL = unrestricted)
    pub access_time_start:  Option<NaiveTime>,
    /// UTC wall-clock window end   (NULL = unrestricted)
    pub access_time_end:    Option<NaiveTime>,
}

/// POST /api/v1/users
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateUser {
    pub email:              String,
    pub password:           String,
    pub full_name:          String,
    #[serde(default = "default_role")]
    pub role:               String,
    pub allowed_days:       Option<String>,
    pub access_time_start:  Option<String>,   // "HH:MM"
    pub access_time_end:    Option<String>,   // "HH:MM"
}

fn default_role() -> String { "admin".to_string() }

/// A single login attempt record.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct LoginAttempt {
    pub id:             Uuid,
    pub email:          String,
    pub user_id:        Option<Uuid>,
    pub user_name:      Option<String>,
    pub success:        bool,
    pub failure_reason: Option<String>,
    pub ip_address:     Option<String>,
    pub user_agent:     Option<String>,
    pub attempted_at:   DateTime<Utc>,
}

/// Query params for GET /api/v1/login-attempts
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginAttemptQuery {
    pub limit:  Option<i64>,
    pub offset: Option<i64>,
}

/// PUT /api/v1/users/:id
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateUser {
    pub full_name:          Option<String>,
    pub role:               Option<String>,
    pub is_active:          Option<bool>,
    pub password:           Option<String>,
    pub allowed_days:       Option<String>,
    pub access_time_start:  Option<String>,   // "HH:MM" or "" to clear
    pub access_time_end:    Option<String>,   // "HH:MM" or "" to clear
}
