use axum::{extract::{Query, State}, http::HeaderMap, Json};
use chrono::{NaiveTime, Utc, Datelike, Timelike};
use jsonwebtoken::{encode, EncodingKey, Header};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::{
    error::{AppError, Result},
    middleware::rbac::{require_role, ADMIN},
    state::AppState,
};
use domain::{Claims, CreateUser, LoginAttempt, LoginAttemptQuery, LoginRequest, LoginResponse, UpdateUser, User};
use axum::extract::Path;
use axum::http::StatusCode;
use uuid::Uuid;

// ---------------------------------------------------------------------------
// Helper — parse "HH:MM" → NaiveTime
// ---------------------------------------------------------------------------

fn parse_time(s: &str) -> Option<NaiveTime> {
    NaiveTime::parse_from_str(s, "%H:%M").ok()
}

// ---------------------------------------------------------------------------
// Helper — record a login attempt (fire-and-forget; never fails the caller)
// ---------------------------------------------------------------------------

async fn log_login_attempt(
    db:             &sqlx::PgPool,
    email:          &str,
    user_id:        Option<Uuid>,
    success:        bool,
    failure_reason: Option<&str>,
    ip_address:     Option<&str>,
    user_agent:     Option<&str>,
) {
    let result = sqlx::query!(
        "INSERT INTO login_attempts (email, user_id, success, failure_reason, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6)",
        email,
        user_id,
        success,
        failure_reason,
        ip_address,
        user_agent,
    )
    .execute(db)
    .await;

    if let Err(e) = result {
        tracing::error!("Failed to record login attempt: {e}");
    }
}

// ---------------------------------------------------------------------------
// POST /auth/login
// ---------------------------------------------------------------------------

/// Internal struct used only during login — fetches access-window fields too.
#[derive(sqlx::FromRow)]
struct LoginRow {
    id:                Uuid,
    email:             String,
    password_hash:     String,
    full_name:         String,
    role:              String,
    allowed_days:      Option<String>,
    access_time_start: Option<NaiveTime>,
    access_time_end:   Option<NaiveTime>,
}

pub async fn login(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<LoginRequest>,
) -> Result<Json<LoginResponse>> {
    // Extract IP (respect X-Forwarded-For from Railway's proxy, fall back to X-Real-IP)
    let ip = headers
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.split(',').next().unwrap_or(s).trim().to_string())
        .or_else(|| headers.get("x-real-ip").and_then(|v| v.to_str().ok()).map(str::to_string));

    let ua = headers
        .get(axum::http::header::USER_AGENT)
        .and_then(|v| v.to_str().ok())
        .map(str::to_string);

    let user_opt: Option<LoginRow> = sqlx::query_as(
        "SELECT id, email, password_hash, full_name, role,
                allowed_days, access_time_start, access_time_end
         FROM users
         WHERE email = $1 AND is_active = TRUE",
    )
    .bind(&body.email)
    .fetch_optional(&state.db)
    .await?;

    let user = match user_opt {
        None => {
            log_login_attempt(&state.db, &body.email, None, false, Some("invalid_credentials"), ip.as_deref(), ua.as_deref()).await;
            return Err(AppError::Unauthorized("Invalid credentials".to_string()));
        }
        Some(u) => u,
    };

    // Verify password
    let valid = bcrypt::verify(&body.password, &user.password_hash).unwrap_or(false);
    if !valid {
        log_login_attempt(&state.db, &body.email, Some(user.id), false, Some("invalid_credentials"), ip.as_deref(), ua.as_deref()).await;
        return Err(AppError::Unauthorized("Invalid credentials".to_string()));
    }

    // ── Access window enforcement ──────────────────────────────────────────
    let now_utc = Utc::now();

    // Day-of-week check
    if let Some(ref days) = user.allowed_days {
        if !days.trim().is_empty() {
            let today = match now_utc.weekday() {
                chrono::Weekday::Mon => "Mon",
                chrono::Weekday::Tue => "Tue",
                chrono::Weekday::Wed => "Wed",
                chrono::Weekday::Thu => "Thu",
                chrono::Weekday::Fri => "Fri",
                chrono::Weekday::Sat => "Sat",
                chrono::Weekday::Sun => "Sun",
            };
            let allowed: Vec<&str> = days.split(',').map(|d| d.trim()).collect();
            if !allowed.contains(&today) {
                log_login_attempt(&state.db, &body.email, Some(user.id), false, Some("access_day"), ip.as_deref(), ua.as_deref()).await;
                return Err(AppError::Unauthorized(
                    "Access not permitted on this day".to_string(),
                ));
            }
        }
    }

    // Time window check (UTC)
    if let (Some(start), Some(end)) = (user.access_time_start, user.access_time_end) {
        let current = now_utc.time().with_nanosecond(0).unwrap_or(now_utc.time());
        let in_window = if start <= end {
            current >= start && current <= end
        } else {
            current >= start || current <= end
        };
        if !in_window {
            log_login_attempt(&state.db, &body.email, Some(user.id), false, Some("access_window"), ip.as_deref(), ua.as_deref()).await;
            return Err(AppError::Unauthorized(
                "Access not permitted at this time".to_string(),
            ));
        }
    }
    // ──────────────────────────────────────────────────────────────────────

    log_login_attempt(&state.db, &body.email, Some(user.id), true, None, ip.as_deref(), ua.as_deref()).await;

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
        exp:       now + 60 * 60 * 24,
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
    let user_id: Uuid = claims.sub.parse()
        .map_err(|_| AppError::Unauthorized("Bad token".into()))?;

    let row: User = sqlx::query_as(
        "SELECT id, email, full_name, role, is_active, created_at,
                allowed_days, access_time_start, access_time_end
         FROM users WHERE id = $1",
    )
    .bind(user_id)
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

    let rows: Vec<User> = sqlx::query_as(
        "SELECT id, email, full_name, role, is_active, created_at,
                allowed_days, access_time_start, access_time_end
         FROM users ORDER BY created_at",
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

    let time_start: Option<NaiveTime> = body.access_time_start.as_deref().and_then(parse_time);
    let time_end:   Option<NaiveTime> = body.access_time_end.as_deref().and_then(parse_time);

    let id = Uuid::new_v4();
    let row: User = sqlx::query_as(
        "INSERT INTO users
           (id, email, password_hash, full_name, role, allowed_days, access_time_start, access_time_end)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, email, full_name, role, is_active, created_at,
                   allowed_days, access_time_start, access_time_end",
    )
    .bind(id)
    .bind(&body.email)
    .bind(&hash)
    .bind(&body.full_name)
    .bind(&body.role)
    .bind(&body.allowed_days)
    .bind(time_start)
    .bind(time_end)
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

    let new_hash: Option<String> = if let Some(ref pw) = body.password {
        Some(bcrypt::hash(pw, bcrypt::DEFAULT_COST)
            .map_err(|e| AppError::Internal(e.to_string()))?)
    } else {
        None
    };

    // Parse time strings; empty string clears the field (sets to NULL via special sentinel)
    // We pass None to COALESCE for "keep existing", but to clear we need a separate path.
    // Strategy: always set the access window columns when they're provided, use COALESCE otherwise.
    let time_start: Option<NaiveTime> = body.access_time_start.as_deref().and_then(|s| {
        if s.is_empty() { None } else { parse_time(s) }
    });
    let time_end: Option<NaiveTime> = body.access_time_end.as_deref().and_then(|s| {
        if s.is_empty() { None } else { parse_time(s) }
    });

    // Whether the caller explicitly wants to clear the time window
    let clear_time = body.access_time_start.as_deref() == Some("") ||
                     body.access_time_end.as_deref() == Some("");

    let row: User = if clear_time {
        sqlx::query_as(
            r#"UPDATE users SET
                 full_name          = COALESCE($2, full_name),
                 role               = COALESCE($3, role),
                 is_active          = COALESCE($4, is_active),
                 password_hash      = COALESCE($5, password_hash),
                 allowed_days       = $6,
                 access_time_start  = NULL,
                 access_time_end    = NULL
               WHERE id = $1
               RETURNING id, email, full_name, role, is_active, created_at,
                         allowed_days, access_time_start, access_time_end"#,
        )
        .bind(user_id)
        .bind(&body.full_name)
        .bind(&body.role)
        .bind(body.is_active)
        .bind(&new_hash)
        .bind(&body.allowed_days)
        .fetch_one(&state.db)
        .await?
    } else {
        sqlx::query_as(
            r#"UPDATE users SET
                 full_name          = COALESCE($2, full_name),
                 role               = COALESCE($3, role),
                 is_active          = COALESCE($4, is_active),
                 password_hash      = COALESCE($5, password_hash),
                 allowed_days       = COALESCE($6, allowed_days),
                 access_time_start  = COALESCE($7, access_time_start),
                 access_time_end    = COALESCE($8, access_time_end)
               WHERE id = $1
               RETURNING id, email, full_name, role, is_active, created_at,
                         allowed_days, access_time_start, access_time_end"#,
        )
        .bind(user_id)
        .bind(&body.full_name)
        .bind(&body.role)
        .bind(body.is_active)
        .bind(&new_hash)
        .bind(&body.allowed_days)
        .bind(time_start)
        .bind(time_end)
        .fetch_one(&state.db)
        .await?
    };

    Ok(Json(row))
}

// ---------------------------------------------------------------------------
// GET /api/v1/login-attempts
// ---------------------------------------------------------------------------

pub async fn list_login_attempts(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Query(q): Query<LoginAttemptQuery>,
) -> Result<Json<Vec<LoginAttempt>>> {
    require_role(&claims, ADMIN)?;
    let limit  = q.limit.unwrap_or(200).min(1000);
    let offset = q.offset.unwrap_or(0);

    let rows = sqlx::query_as!(
        LoginAttempt,
        r#"
        SELECT la.id, la.email, la.user_id,
               CASE WHEN la.user_id IS NOT NULL THEN u.full_name END AS user_name,
               la.success, la.failure_reason, la.ip_address, la.user_agent, la.attempted_at
        FROM login_attempts la
        LEFT JOIN users u ON u.id = la.user_id
        ORDER BY la.attempted_at DESC
        LIMIT $1 OFFSET $2
        "#,
        limit,
        offset,
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(rows))
}

// ---------------------------------------------------------------------------
// DELETE /api/v1/users/:id
// ---------------------------------------------------------------------------

pub async fn delete_user(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Path(user_id): Path<Uuid>,
) -> Result<StatusCode> {
    require_role(&claims, ADMIN)?;
    let caller: Uuid = claims.sub.parse()
        .map_err(|_| AppError::Unauthorized("Bad token".into()))?;
    if caller == user_id {
        return Err(AppError::BadRequest("Cannot delete your own account".to_string()));
    }
    sqlx::query("DELETE FROM users WHERE id = $1")
        .bind(user_id)
        .execute(&state.db)
        .await?;
    Ok(StatusCode::NO_CONTENT)
}
