use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    handlers::company_id_from_claims,
    middleware::rbac::{require_role, WAREHOUSE_ROLES},
    state::AppState,
};
use domain::{
    Claims,
    Warehouse, CreateWarehouse, UpdateWarehouse,
    WarehouseZone, CreateWarehouseZone, UpdateWarehouseZone,
};

// ---------------------------------------------------------------------------
// Warehouses
// ---------------------------------------------------------------------------

pub async fn list_warehouses(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
) -> Result<Json<Vec<Warehouse>>> {
    let cid = company_id_from_claims(&claims)?;
    let rows = sqlx::query_as::<_, Warehouse>(
        "SELECT id, company_id, code, name, address, city, country_code,
                is_default, is_active, notes, created_at
         FROM warehouses WHERE company_id = $1 ORDER BY is_default DESC, name",
    )
    .bind(cid)
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

pub async fn get_warehouse(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Warehouse>> {
    let row = sqlx::query_as::<_, Warehouse>(
        "SELECT id, company_id, code, name, address, city, country_code,
                is_default, is_active, notes, created_at
         FROM warehouses WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Warehouse {id} not found")))?;
    Ok(Json(row))
}

pub async fn create_warehouse(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Json(body): Json<CreateWarehouse>,
) -> Result<(StatusCode, Json<Warehouse>)> {
    require_role(&claims, WAREHOUSE_ROLES)?;
    let cid = company_id_from_claims(&claims)?;
    let id = Uuid::new_v4();
    let is_default = body.is_default.unwrap_or(false);

    // If this will be the default, clear existing default first
    if is_default {
        sqlx::query("UPDATE warehouses SET is_default = FALSE WHERE company_id = $1")
            .bind(cid)
            .execute(&state.db)
            .await?;
    }

    let row = sqlx::query_as::<_, Warehouse>(
        "INSERT INTO warehouses
             (id, company_id, code, name, address, city, country_code, is_default, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, company_id, code, name, address, city, country_code,
                   is_default, is_active, notes, created_at",
    )
    .bind(id)
    .bind(cid)
    .bind(&body.code)
    .bind(&body.name)
    .bind(&body.address)
    .bind(&body.city)
    .bind(&body.country_code)
    .bind(is_default)
    .bind(&body.notes)
    .fetch_one(&state.db)
    .await?;
    Ok((StatusCode::CREATED, Json(row)))
}

pub async fn update_warehouse(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateWarehouse>,
) -> Result<Json<Warehouse>> {
    require_role(&claims, WAREHOUSE_ROLES)?;
    let cid = company_id_from_claims(&claims)?;

    // If promoting to default, clear existing default first
    if body.is_default == Some(true) {
        sqlx::query("UPDATE warehouses SET is_default = FALSE WHERE company_id = $1 AND id != $2")
            .bind(cid)
            .bind(id)
            .execute(&state.db)
            .await?;
    }

    let row = sqlx::query_as::<_, Warehouse>(
        "UPDATE warehouses SET
             name         = COALESCE($2, name),
             address      = COALESCE($3, address),
             city         = COALESCE($4, city),
             country_code = COALESCE($5, country_code),
             is_default   = COALESCE($6, is_default),
             is_active    = COALESCE($7, is_active),
             notes        = COALESCE($8, notes)
         WHERE id = $1 AND company_id = $9
         RETURNING id, company_id, code, name, address, city, country_code,
                   is_default, is_active, notes, created_at",
    )
    .bind(id)
    .bind(&body.name)
    .bind(&body.address)
    .bind(&body.city)
    .bind(&body.country_code)
    .bind(body.is_default)
    .bind(body.is_active)
    .bind(&body.notes)
    .bind(cid)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Warehouse {id} not found")))?;
    Ok(Json(row))
}

// ---------------------------------------------------------------------------
// Warehouse Zones
// ---------------------------------------------------------------------------

pub async fn list_zones(
    State(state): State<AppState>,
    Path(warehouse_id): Path<Uuid>,
) -> Result<Json<Vec<WarehouseZone>>> {
    let rows = sqlx::query_as::<_, WarehouseZone>(
        "SELECT id, warehouse_id, company_id, code, name, zone_type, is_active, notes, created_at
         FROM warehouse_zones WHERE warehouse_id = $1 ORDER BY zone_type, code",
    )
    .bind(warehouse_id)
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

pub async fn create_zone(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Path(warehouse_id): Path<Uuid>,
    Json(body): Json<CreateWarehouseZone>,
) -> Result<(StatusCode, Json<WarehouseZone>)> {
    require_role(&claims, WAREHOUSE_ROLES)?;
    let cid = company_id_from_claims(&claims)?;

    // Verify warehouse belongs to this company
    sqlx::query_scalar::<_, Uuid>("SELECT id FROM warehouses WHERE id = $1 AND company_id = $2")
        .bind(warehouse_id)
        .bind(cid)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Warehouse {warehouse_id} not found")))?;

    let id = Uuid::new_v4();
    let zone_type = body.zone_type.unwrap_or_else(|| "storage".to_string());

    let row = sqlx::query_as::<_, WarehouseZone>(
        "INSERT INTO warehouse_zones
             (id, warehouse_id, company_id, code, name, zone_type, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, warehouse_id, company_id, code, name, zone_type, is_active, notes, created_at",
    )
    .bind(id)
    .bind(warehouse_id)
    .bind(cid)
    .bind(&body.code)
    .bind(&body.name)
    .bind(zone_type)
    .bind(&body.notes)
    .fetch_one(&state.db)
    .await?;
    Ok((StatusCode::CREATED, Json(row)))
}

pub async fn update_zone(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Path((warehouse_id, zone_id)): Path<(Uuid, Uuid)>,
    Json(body): Json<UpdateWarehouseZone>,
) -> Result<Json<WarehouseZone>> {
    require_role(&claims, WAREHOUSE_ROLES)?;
    let cid = company_id_from_claims(&claims)?;

    let row = sqlx::query_as::<_, WarehouseZone>(
        "UPDATE warehouse_zones SET
             name      = COALESCE($3, name),
             zone_type = COALESCE($4, zone_type),
             is_active = COALESCE($5, is_active),
             notes     = COALESCE($6, notes)
         WHERE id = $1 AND warehouse_id = $2 AND company_id = $7
         RETURNING id, warehouse_id, company_id, code, name, zone_type, is_active, notes, created_at",
    )
    .bind(zone_id)
    .bind(warehouse_id)
    .bind(&body.name)
    .bind(&body.zone_type)
    .bind(body.is_active)
    .bind(&body.notes)
    .bind(cid)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Zone {zone_id} not found")))?;
    Ok(Json(row))
}
