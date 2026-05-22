use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use uuid::Uuid;

use crate::{
    error::Result,
    middleware::rbac::{require_role, ADMIN},
    state::AppState,
};
use domain::{
    AddCompanyToGroup, AddUserToCompany,
    Company, CompanyGroup, CompanyGroupMember,
    CreateCompany, CreateCompanyGroup,
    UpdateCompany, UpdateCompanyGroup,
    UserCompany,
    Claims,
};

// ---------------------------------------------------------------------------
// Companies
// ---------------------------------------------------------------------------

pub async fn list_companies(State(state): State<AppState>) -> Result<Json<Vec<Company>>> {
    let rows = sqlx::query_as!(
        Company,
        "SELECT id, code, name, country_id, address, base_currency, fiscal_year_start_month,
                registration_number, tax_id, logo_url, parent_company_id, is_active, created_at
         FROM companies ORDER BY name"
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

pub async fn create_company(
    axum::Extension(claims): axum::Extension<Claims>,
    State(state): State<AppState>,
    Json(body): Json<CreateCompany>,
) -> Result<(StatusCode, Json<Company>)> {
    require_role(&claims, ADMIN)?;
    let id = Uuid::new_v4();
    let row = sqlx::query_as!(
        Company,
        "INSERT INTO companies (id, code, name, country_id, address, base_currency,
                                fiscal_year_start_month, registration_number, tax_id,
                                logo_url, parent_company_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id, code, name, country_id, address, base_currency, fiscal_year_start_month,
                   registration_number, tax_id, logo_url, parent_company_id, is_active, created_at",
        id,
        body.code,
        body.name,
        body.country_id,
        body.address,
        body.base_currency,
        body.fiscal_year_start_month,
        body.registration_number,
        body.tax_id,
        body.logo_url,
        body.parent_company_id,
    )
    .fetch_one(&state.db)
    .await?;
    Ok((StatusCode::CREATED, Json(row)))
}

pub async fn update_company(
    axum::Extension(claims): axum::Extension<Claims>,
    State(state): State<AppState>,
    Path(company_id): Path<Uuid>,
    Json(body): Json<UpdateCompany>,
) -> Result<Json<Company>> {
    require_role(&claims, ADMIN)?;
    let row = sqlx::query_as!(
        Company,
        r#"UPDATE companies SET
             name                    = COALESCE($2, name),
             country_id              = COALESCE($3, country_id),
             address                 = COALESCE($4, address),
             base_currency           = COALESCE($5, base_currency),
             fiscal_year_start_month = COALESCE($6, fiscal_year_start_month),
             registration_number     = COALESCE($7, registration_number),
             tax_id                  = COALESCE($8, tax_id),
             logo_url                = COALESCE($9, logo_url),
             parent_company_id       = COALESCE($10, parent_company_id),
             is_active               = COALESCE($11, is_active)
           WHERE id = $1
           RETURNING id, code, name, country_id, address, base_currency, fiscal_year_start_month,
                     registration_number, tax_id, logo_url, parent_company_id, is_active, created_at"#,
        company_id,
        body.name,
        body.country_id,
        body.address,
        body.base_currency,
        body.fiscal_year_start_month,
        body.registration_number,
        body.tax_id,
        body.logo_url,
        body.parent_company_id,
        body.is_active,
    )
    .fetch_one(&state.db)
    .await?;
    Ok(Json(row))
}

// ---------------------------------------------------------------------------
// Company Groups
// ---------------------------------------------------------------------------

pub async fn list_company_groups(State(state): State<AppState>) -> Result<Json<Vec<CompanyGroup>>> {
    let rows = sqlx::query_as!(
        CompanyGroup,
        "SELECT id, name, description, created_at FROM company_groups ORDER BY name"
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

pub async fn create_company_group(
    axum::Extension(claims): axum::Extension<Claims>,
    State(state): State<AppState>,
    Json(body): Json<CreateCompanyGroup>,
) -> Result<(StatusCode, Json<CompanyGroup>)> {
    require_role(&claims, ADMIN)?;
    let id = Uuid::new_v4();
    let row = sqlx::query_as!(
        CompanyGroup,
        "INSERT INTO company_groups (id, name, description)
         VALUES ($1, $2, $3)
         RETURNING id, name, description, created_at",
        id,
        body.name,
        body.description,
    )
    .fetch_one(&state.db)
    .await?;
    Ok((StatusCode::CREATED, Json(row)))
}

pub async fn update_company_group(
    axum::Extension(claims): axum::Extension<Claims>,
    State(state): State<AppState>,
    Path(group_id): Path<Uuid>,
    Json(body): Json<UpdateCompanyGroup>,
) -> Result<Json<CompanyGroup>> {
    require_role(&claims, ADMIN)?;
    let row = sqlx::query_as!(
        CompanyGroup,
        r#"UPDATE company_groups SET
             name        = COALESCE($2, name),
             description = COALESCE($3, description)
           WHERE id = $1
           RETURNING id, name, description, created_at"#,
        group_id,
        body.name,
        body.description,
    )
    .fetch_one(&state.db)
    .await?;
    Ok(Json(row))
}

// ---------------------------------------------------------------------------
// Group membership
// ---------------------------------------------------------------------------

pub async fn list_group_members(State(state): State<AppState>) -> Result<Json<Vec<CompanyGroupMember>>> {
    let rows = sqlx::query_as!(
        CompanyGroupMember,
        "SELECT group_id, company_id FROM company_group_members"
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

pub async fn add_company_to_group(
    axum::Extension(claims): axum::Extension<Claims>,
    State(state): State<AppState>,
    Path(group_id): Path<Uuid>,
    Json(body): Json<AddCompanyToGroup>,
) -> Result<StatusCode> {
    require_role(&claims, ADMIN)?;
    sqlx::query!(
        "INSERT INTO company_group_members (group_id, company_id)
         VALUES ($1, $2) ON CONFLICT DO NOTHING",
        group_id,
        body.company_id,
    )
    .execute(&state.db)
    .await?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn remove_company_from_group(
    axum::Extension(claims): axum::Extension<Claims>,
    State(state): State<AppState>,
    Path((group_id, company_id)): Path<(Uuid, Uuid)>,
) -> Result<StatusCode> {
    require_role(&claims, ADMIN)?;
    sqlx::query!(
        "DELETE FROM company_group_members WHERE group_id = $1 AND company_id = $2",
        group_id,
        company_id,
    )
    .execute(&state.db)
    .await?;
    Ok(StatusCode::NO_CONTENT)
}

// ---------------------------------------------------------------------------
// User-company membership
// ---------------------------------------------------------------------------

pub async fn list_company_users(
    State(state): State<AppState>,
    Path(company_id): Path<Uuid>,
) -> Result<Json<Vec<UserCompany>>> {
    let rows = sqlx::query_as!(
        UserCompany,
        "SELECT user_id, company_id, role, is_primary, created_at
         FROM user_companies WHERE company_id = $1 ORDER BY created_at",
        company_id,
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

pub async fn add_user_to_company(
    axum::Extension(claims): axum::Extension<Claims>,
    State(state): State<AppState>,
    Path(company_id): Path<Uuid>,
    Json(body): Json<AddUserToCompany>,
) -> Result<StatusCode> {
    require_role(&claims, ADMIN)?;
    sqlx::query!(
        "INSERT INTO user_companies (user_id, company_id, role, is_primary)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, company_id) DO UPDATE SET role = $3, is_primary = $4",
        body.user_id,
        company_id,
        body.role,
        body.is_primary,
    )
    .execute(&state.db)
    .await?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn remove_user_from_company(
    axum::Extension(claims): axum::Extension<Claims>,
    State(state): State<AppState>,
    Path((company_id, user_id)): Path<(Uuid, Uuid)>,
) -> Result<StatusCode> {
    require_role(&claims, ADMIN)?;
    sqlx::query!(
        "DELETE FROM user_companies WHERE company_id = $1 AND user_id = $2",
        company_id,
        user_id,
    )
    .execute(&state.db)
    .await?;
    Ok(StatusCode::NO_CONTENT)
}
