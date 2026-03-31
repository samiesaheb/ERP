use axum::{extract::State, Json};
use jsonwebtoken::{encode, EncodingKey, Header};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::{
    error::{AppError, Result},
    state::AppState,
};
use domain::{Claims, LoginRequest, LoginResponse};

pub async fn login(
    State(state): State<AppState>,
    Json(body): Json<LoginRequest>,
) -> Result<Json<LoginResponse>> {
    // Fetch user by email
    let user = sqlx::query!(
        "SELECT id, email, password_hash FROM users WHERE email = $1",
        body.email
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::Unauthorized("Invalid credentials".to_string()))?;

    // Verify bcrypt password
    let valid =
        bcrypt::verify(&body.password, &user.password_hash).unwrap_or(false);
    if !valid {
        return Err(AppError::Unauthorized("Invalid credentials".to_string()));
    }

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| AppError::Internal(e.to_string()))?
        .as_secs();

    let claims = Claims {
        sub: user.id.to_string(),
        email: user.email.clone(),
        iat: now,
        exp: now + 60 * 60 * 24, // 24 hours
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(state.jwt_secret.as_bytes()),
    )?;

    Ok(Json(LoginResponse {
        token,
        user_id: user.id,
        email: user.email,
    }))
}
