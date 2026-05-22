use axum::{extract::{Query, State}, http::{HeaderMap, StatusCode}, response::Redirect, Json};
use chrono::{NaiveTime, Utc, Datelike, Timelike};
use jsonwebtoken::{encode, EncodingKey, Header};
use serde::Deserialize;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::{
    error::{AppError, Result},
    middleware::rbac::{require_role, ADMIN},
    state::AppState,
};
use domain::{
    Claims, CreateUser, LoginAttempt, LoginAttemptQuery, LoginRequest, LoginResponse,
    SelectCompany, SelectCompanyResponse, UpdateUser, User, UserCompanyInfo,
};
use axum::extract::Path;
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
    password_hash:     Option<String>,
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

    // Verify password — OAuth-only users have no hash; treat as invalid credentials
    let valid = user.password_hash.as_deref()
        .map(|hash| bcrypt::verify(&body.password, hash).unwrap_or(false))
        .unwrap_or(false);
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

    let companies: Vec<UserCompanyInfo> = sqlx::query_as(
        "SELECT uc.company_id, c.name AS company_name, c.code AS company_code,
                uc.role, uc.is_primary
         FROM user_companies uc
         JOIN companies c ON c.id = uc.company_id
         WHERE uc.user_id = $1 AND c.is_active = TRUE
         ORDER BY uc.is_primary DESC, c.name",
    )
    .bind(user.id)
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| AppError::Internal(e.to_string()))?
        .as_secs();

    let claims = Claims {
        sub:          user.id.to_string(),
        email:        user.email.clone(),
        full_name:    user.full_name.clone(),
        role:         user.role.clone(),
        company_id:   None,
        company_name: None,
        company_code: None,
        iat:          now,
        exp:          now + 60 * 60 * 24,
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
        companies,
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

// ---------------------------------------------------------------------------
// GET /auth/google  — initiate OAuth flow
// ---------------------------------------------------------------------------

pub async fn google_login(
    State(state): State<AppState>,
) -> Result<Redirect> {
    let client_id = state.google_client_id.as_deref()
        .ok_or_else(|| AppError::Internal("Google OAuth not configured".into()))?;
    let redirect_uri = state.google_redirect_uri.as_deref()
        .ok_or_else(|| AppError::Internal("Google OAuth not configured".into()))?;

    let url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth\
         ?client_id={client_id}\
         &redirect_uri={redirect_uri}\
         &response_type=code\
         &scope=openid%20email%20profile\
         &access_type=online",
        client_id    = urlencoding::encode(client_id),
        redirect_uri = urlencoding::encode(redirect_uri),
    );

    Ok(Redirect::to(&url))
}

// ---------------------------------------------------------------------------
// GET /auth/google/callback  — exchange code, find/create user, issue JWT
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct OAuthCallbackQuery {
    pub code:  Option<String>,
    pub error: Option<String>,
}

#[derive(Deserialize)]
struct TokenResponse {
    access_token: String,
}

#[derive(Deserialize)]
struct GoogleUserInfo {
    email:      String,
    name:       Option<String>,
    given_name: Option<String>,
}

pub async fn google_callback(
    State(state): State<AppState>,
    Query(q): Query<OAuthCallbackQuery>,
) -> Result<Redirect> {
    if let Some(err) = q.error {
        return Err(AppError::Unauthorized(format!("Google OAuth error: {err}")));
    }

    let code = q.code.ok_or_else(|| AppError::BadRequest("Missing code".into()))?;

    let client_id     = state.google_client_id.as_deref()
        .ok_or_else(|| AppError::Internal("Google OAuth not configured".into()))?;
    let client_secret = state.google_client_secret.as_deref()
        .ok_or_else(|| AppError::Internal("Google OAuth not configured".into()))?;
    let redirect_uri  = state.google_redirect_uri.as_deref()
        .ok_or_else(|| AppError::Internal("Google OAuth not configured".into()))?;

    // Exchange code for access token
    let http = reqwest::Client::new();
    let token_resp: TokenResponse = http
        .post("https://oauth2.googleapis.com/token")
        .form(&[
            ("code",          code.as_str()),
            ("client_id",     client_id),
            ("client_secret", client_secret),
            ("redirect_uri",  redirect_uri),
            ("grant_type",    "authorization_code"),
        ])
        .send()
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?
        .json()
        .await
        .map_err(|e| AppError::Internal(format!("Token parse error: {e}")))?;

    // Fetch user info
    let user_info: GoogleUserInfo = http
        .get("https://www.googleapis.com/oauth2/v2/userinfo")
        .bearer_auth(&token_resp.access_token)
        .send()
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?
        .json()
        .await
        .map_err(|e| AppError::Internal(format!("Userinfo parse error: {e}")))?;

    let email = user_info.email.to_lowercase();
    let full_name = user_info.name
        .or(user_info.given_name)
        .unwrap_or_else(|| email.split('@').next().unwrap_or("User").to_string());

    // Find existing active user or auto-create
    let user: LoginRow = {
        let existing: Option<LoginRow> = sqlx::query_as(
            "SELECT id, email, password_hash, full_name, role,
                    allowed_days, access_time_start, access_time_end
             FROM users WHERE email = $1 AND is_active = TRUE",
        )
        .bind(&email)
        .fetch_optional(&state.db)
        .await?;

        if let Some(u) = existing {
            u
        } else {
            let id = Uuid::new_v4();
            sqlx::query_as(
                "INSERT INTO users (id, email, full_name, role)
                 VALUES ($1, $2, $3, 'viewer')
                 RETURNING id, email, password_hash, full_name, role,
                           allowed_days, access_time_start, access_time_end",
            )
            .bind(id)
            .bind(&email)
            .bind(&full_name)
            .fetch_one(&state.db)
            .await?
        }
    };

    // Access window check (same as password login)
    let now_utc = Utc::now();

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
                log_login_attempt(&state.db, &email, Some(user.id), false, Some("access_day"), None, None).await;
                return Err(AppError::Unauthorized("Access not permitted on this day".into()));
            }
        }
    }

    if let (Some(start), Some(end)) = (user.access_time_start, user.access_time_end) {
        let current = now_utc.time().with_nanosecond(0).unwrap_or(now_utc.time());
        let in_window = if start <= end { current >= start && current <= end } else { current >= start || current <= end };
        if !in_window {
            log_login_attempt(&state.db, &email, Some(user.id), false, Some("access_window"), None, None).await;
            return Err(AppError::Unauthorized("Access not permitted at this time".into()));
        }
    }

    log_login_attempt(&state.db, &email, Some(user.id), true, None, None, None).await;

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| AppError::Internal(e.to_string()))?
        .as_secs();

    let claims = Claims {
        sub:          user.id.to_string(),
        email:        user.email.clone(),
        full_name:    user.full_name.clone(),
        role:         user.role.clone(),
        company_id:   None,
        company_name: None,
        company_code: None,
        iat:          now,
        exp:          now + 60 * 60 * 24,
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(state.jwt_secret.as_bytes()),
    )?;

    let redirect_to = format!(
        "{}/api/auth/oauth/complete?token={}",
        state.frontend_url,
        urlencoding::encode(&token),
    );

    Ok(Redirect::to(&redirect_to))
}

// ---------------------------------------------------------------------------
// GET /api/v1/users/me/companies
// ---------------------------------------------------------------------------

pub async fn get_my_companies(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
) -> Result<Json<Vec<UserCompanyInfo>>> {
    let user_id: Uuid = claims.sub.parse()
        .map_err(|_| AppError::Unauthorized("Bad token".into()))?;

    let rows: Vec<UserCompanyInfo> = sqlx::query_as(
        "SELECT uc.company_id, c.name AS company_name, c.code AS company_code,
                uc.role, uc.is_primary
         FROM user_companies uc
         JOIN companies c ON c.id = uc.company_id
         WHERE uc.user_id = $1 AND c.is_active = TRUE
         ORDER BY uc.is_primary DESC, c.name",
    )
    .bind(user_id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(rows))
}

// ---------------------------------------------------------------------------
// POST /auth/select-company
// ---------------------------------------------------------------------------

pub async fn select_company(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Json(body): Json<SelectCompany>,
) -> Result<Json<SelectCompanyResponse>> {
    let user_id: Uuid = claims.sub.parse()
        .map_err(|_| AppError::Unauthorized("Bad token".into()))?;

    // Try membership lookup first
    let member_row: Option<UserCompanyInfo> = sqlx::query_as(
        "SELECT uc.company_id, c.name AS company_name, c.code AS company_code,
                uc.role, uc.is_primary
         FROM user_companies uc
         JOIN companies c ON c.id = uc.company_id
         WHERE uc.user_id = $1 AND uc.company_id = $2 AND c.is_active = TRUE",
    )
    .bind(user_id)
    .bind(body.company_id)
    .fetch_optional(&state.db)
    .await?;

    // Admins can switch to any active company even without an explicit membership row
    let company = if let Some(row) = member_row {
        row
    } else if claims.role == "admin" {
        #[derive(sqlx::FromRow)]
        struct CompanyRow { id: Uuid, name: String, code: String }
        let c: Option<CompanyRow> = sqlx::query_as(
            "SELECT id, name, code FROM companies WHERE id = $1 AND is_active = TRUE",
        )
        .bind(body.company_id)
        .fetch_optional(&state.db)
        .await?;
        let c = c.ok_or_else(|| AppError::NotFound("Company not found".into()))?;
        UserCompanyInfo {
            company_id:   c.id,
            company_name: c.name,
            company_code: c.code,
            role:         claims.role.clone(),
            is_primary:   false,
        }
    } else {
        return Err(AppError::Forbidden("Not a member of this company".into()));
    };

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| AppError::Internal(e.to_string()))?
        .as_secs();

    let new_claims = Claims {
        sub:          claims.sub,
        email:        claims.email,
        full_name:    claims.full_name,
        role:         company.role.clone(),
        company_id:   Some(company.company_id.to_string()),
        company_name: Some(company.company_name.clone()),
        company_code: Some(company.company_code.clone()),
        iat:          now,
        exp:          now + 60 * 60 * 24,
    };

    let token = encode(
        &Header::default(),
        &new_claims,
        &EncodingKey::from_secret(state.jwt_secret.as_bytes()),
    )?;

    Ok(Json(SelectCompanyResponse {
        token,
        company_id:   company.company_id,
        company_name: company.company_name,
        company_code: company.company_code,
        role:         company.role,
    }))
}
