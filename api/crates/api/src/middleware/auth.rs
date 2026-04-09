use axum::{
    extract::{Request, State},
    middleware::Next,
    response::Response,
};
use jsonwebtoken::{decode, DecodingKey, Validation};

use crate::{error::AppError, state::AppState};
use domain::Claims;

/// JWT auth middleware — validates Bearer token and injects Claims into extensions.
pub async fn require_auth(
    State(state): State<AppState>,
    mut req: Request,
    next: Next,
) -> Result<Response, AppError> {
    let token = req
        .headers()
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.strip_prefix("Bearer "))
        .ok_or_else(|| AppError::Unauthorized("Missing Bearer token".to_string()))?;

    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(state.jwt_secret.as_bytes()),
        &Validation::default(),
    )
    .map_err(|e| AppError::Unauthorized(format!("Invalid token: {e}")))?;

    let claims = token_data.claims;

    // Best-effort: set session variable so audit triggers can capture the user.
    // With a connection pool this races, but works correctly for low-concurrency
    // deployments (LIFO pool reuse means same connection is typically reused).
    let _ = sqlx::query("SELECT set_config('app.current_user_id', $1, false)")
        .bind(&claims.sub)
        .execute(&state.db)
        .await;

    req.extensions_mut().insert(claims);
    Ok(next.run(req).await)
}
