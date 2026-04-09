use axum::{extract::State, Json};
use jsonwebtoken::{encode, EncodingKey, Header};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::{
    error::{AppError, Result},
    middleware::rbac::{require_role, ADMIN},
    state::AppState,
};
use domain::{Claims, CreateUser, LoginRequest, LoginResponse, UpdateUser, User};
use axum::extract::Path;
use axum::http::StatusCode;
use uuid::Uuid;

pub async fn login(
    State(state): State<AppState>,
    Json(body): Json<LoginRequest>,
) -> Result<Json<LoginResponse>> {
    let user = sqlx::query!(
        "SELECT id, email, password_hash, full_name, role FROM users
         WHERE email = $1 AND is_active = TRUE",
        body.email
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::Unauthorized("Invalid credentials".to_string()))?;

    let valid = bcrypt::verify(&body.password, &user.password_hash).unwrap_or(false);
    if !valid {
        return Err(AppError::Unauthorized("Invalid credentials".to_string()));
    }

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| AppError::Internal(e.to_string()))?
        .as_secs();

    let claims = Claims {
        sub:       user.id.to_string(),
        email:     user.email.clone(),
        full_name: user.full_name.clone(),
        role:      user.role.clone(),
        iat:       now,
        exp:       now + 60 * 60 * 24, // 24 hours
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(state.jwt_secret.as_bytes()),
    )?;

    Ok(Json(LoginResponse {
        token,
        user_id:   user.id,
        email:     user.email,
        full_name: user.full_name,
        role:      user.role,
    }))
}

// ---------------------------------------------------------------------------
// GET /api/v1/users/me
// ---------------------------------------------------------------------------

pub async fn get_me(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
) -> Result<Json<User>> {
    let user_id: Uuid = claims.sub.parse().map_err(|_| AppError::Unauthorized("Bad token".into()))?;
    let row = sqlx::query_as!(
        User,
        "SELECT id, email, full_name, role, is_active, created_at FROM users WHERE id = $1",
        user_id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::Unauthorized("User not found".into()))?;
    Ok(Json(row))
}

// ---------------------------------------------------------------------------
// GET /api/v1/users
// ---------------------------------------------------------------------------

pub async fn list_users(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
) -> Result<Json<Vec<User>>> {
    require_role(&claims, ADMIN)?;
    let rows = sqlx::query_as!(
        User,
        "SELECT id, email, full_name, role, is_active, created_at
         FROM users ORDER BY created_at"
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

// ---------------------------------------------------------------------------
// POST /api/v1/users
// ---------------------------------------------------------------------------

pub async fn create_user(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Json(body): Json<CreateUser>,
) -> Result<(StatusCode, Json<User>)> {
    require_role(&claims, ADMIN)?;
    let hash = bcrypt::hash(&body.password, bcrypt::DEFAULT_COST)
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let id = Uuid::new_v4();
    let row = sqlx::query_as!(
        User,
        "INSERT INTO users (id, email, password_hash, full_name, role)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, email, full_name, role, is_active, created_at",
        id,
        body.email,
        hash,
        body.full_name,
        body.role,
    )
    .fetch_one(&state.db)
    .await?;
    Ok((StatusCode::CREATED, Json(row)))
}

// ---------------------------------------------------------------------------
// PUT /api/v1/users/:id
// ---------------------------------------------------------------------------

pub async fn update_user(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Path(user_id): Path<Uuid>,
    Json(body): Json<UpdateUser>,
) -> Result<Json<User>> {
    require_role(&claims, ADMIN)?;
    // Hash new password if provided
    let new_hash: Option<String> = if let Some(ref pw) = body.password {
        Some(bcrypt::hash(pw, bcrypt::DEFAULT_COST)
            .map_err(|e| AppError::Internal(e.to_string()))?)
    } else {
        None
    };

    let row = sqlx::query_as!(
        User,
        r#"UPDATE users SET
             full_name     = COALESCE($2, full_name),
             role          = COALESCE($3, role),
             is_active     = COALESCE($4, is_active),
             password_hash = COALESCE($5, password_hash)
           WHERE id = $1
           RETURNING id, email, full_name, role, is_active, created_at"#,
        user_id,
        body.full_name,
        body.role,
        body.is_active,
        new_hash,
    )
    .fetch_one(&state.db)
    .await?;
    Ok(Json(row))
}
