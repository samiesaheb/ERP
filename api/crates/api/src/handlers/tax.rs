use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    handlers::company_id_from_claims,
    middleware::rbac::{require_role, FINANCE_ROLES},
    state::AppState,
};
use domain::{Claims, TaxRate, CreateTaxRate, UpdateTaxRate};

pub async fn list_tax_rates(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
) -> Result<Json<Vec<TaxRate>>> {
    let cid = company_id_from_claims(&claims)?;
    let rows = sqlx::query_as::<_, TaxRate>(
        "SELECT id, company_id, name, code, rate, tax_type, description,
                is_default, is_active, created_at
         FROM tax_rates WHERE company_id = $1 ORDER BY tax_type, name",
    )
    .bind(cid)
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

pub async fn get_tax_rate(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<TaxRate>> {
    let row = sqlx::query_as::<_, TaxRate>(
        "SELECT id, company_id, name, code, rate, tax_type, description,
                is_default, is_active, created_at
         FROM tax_rates WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Tax rate {id} not found")))?;
    Ok(Json(row))
}

pub async fn create_tax_rate(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Json(body): Json<CreateTaxRate>,
) -> Result<(StatusCode, Json<TaxRate>)> {
    require_role(&claims, FINANCE_ROLES)?;
    let cid = company_id_from_claims(&claims)?;
    let id = Uuid::new_v4();
    let tax_type   = body.tax_type.unwrap_or_else(|| "vat".to_string());
    let is_default = body.is_default.unwrap_or(false);

    // Clear existing default for this tax_type if needed
    if is_default {
        sqlx::query(
            "UPDATE tax_rates SET is_default = FALSE WHERE company_id = $1 AND tax_type = $2",
        )
        .bind(cid)
        .bind(&tax_type)
        .execute(&state.db)
        .await?;
    }

    let row = sqlx::query_as::<_, TaxRate>(
        "INSERT INTO tax_rates
             (id, company_id, name, code, rate, tax_type, description, is_default)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, company_id, name, code, rate, tax_type, description,
                   is_default, is_active, created_at",
    )
    .bind(id)
    .bind(cid)
    .bind(&body.name)
    .bind(&body.code)
    .bind(body.rate)
    .bind(&tax_type)
    .bind(&body.description)
    .bind(is_default)
    .fetch_one(&state.db)
    .await?;
    Ok((StatusCode::CREATED, Json(row)))
}

pub async fn update_tax_rate(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateTaxRate>,
) -> Result<Json<TaxRate>> {
    require_role(&claims, FINANCE_ROLES)?;
    let cid = company_id_from_claims(&claims)?;

    // Fetch current row to know the tax_type (needed for default-clearing)
    let existing = sqlx::query_as::<_, TaxRate>(
        "SELECT id, company_id, name, code, rate, tax_type, description,
                is_default, is_active, created_at
         FROM tax_rates WHERE id = $1 AND company_id = $2",
    )
    .bind(id)
    .bind(cid)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Tax rate {id} not found")))?;

    let new_tax_type = body.tax_type.as_deref().unwrap_or(&existing.tax_type).to_string();

    if body.is_default == Some(true) {
        sqlx::query(
            "UPDATE tax_rates SET is_default = FALSE WHERE company_id = $1 AND tax_type = $2 AND id != $3",
        )
        .bind(cid)
        .bind(&new_tax_type)
        .bind(id)
        .execute(&state.db)
        .await?;
    }

    let row = sqlx::query_as::<_, TaxRate>(
        "UPDATE tax_rates SET
             name        = COALESCE($2, name),
             rate        = COALESCE($3, rate),
             tax_type    = COALESCE($4, tax_type),
             description = COALESCE($5, description),
             is_default  = COALESCE($6, is_default),
             is_active   = COALESCE($7, is_active)
         WHERE id = $1 AND company_id = $8
         RETURNING id, company_id, name, code, rate, tax_type, description,
                   is_default, is_active, created_at",
    )
    .bind(id)
    .bind(&body.name)
    .bind(body.rate)
    .bind(&body.tax_type)
    .bind(&body.description)
    .bind(body.is_default)
    .bind(body.is_active)
    .bind(cid)
    .fetch_one(&state.db)
    .await?;
    Ok(Json(row))
}
