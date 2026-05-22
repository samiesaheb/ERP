use axum::{extract::{Path, State}, http::StatusCode, Json};
use uuid::Uuid;

use crate::{error::Result, handlers::company_id_from_claims, state::AppState};
use domain::{Claims, CreateWarehouseLocation, UpdateWarehouseLocation, WarehouseLocation};

pub async fn list_locations(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
) -> Result<Json<Vec<WarehouseLocation>>> {
    let cid = company_id_from_claims(&claims)?;
    let rows = sqlx::query_as::<_, WarehouseLocation>(
        "SELECT id, code, warehouse_id, zone_id, zone, aisle, section, shelf_level,
                travel_sequence, location_type, is_active, is_virtual, notes, created_at
         FROM warehouse_locations
         WHERE company_id = $1
         ORDER BY travel_sequence NULLS LAST, code",
    )
    .bind(cid)
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

pub async fn create_location(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Json(body): Json<CreateWarehouseLocation>,
) -> Result<(StatusCode, Json<WarehouseLocation>)> {
    let cid = company_id_from_claims(&claims)?;
    let id = Uuid::new_v4();
    let location_type = body.location_type.unwrap_or_else(|| "bin".to_string());
    let is_virtual    = body.is_virtual.unwrap_or(false);

    let row = sqlx::query_as::<_, WarehouseLocation>(
        "INSERT INTO warehouse_locations
             (id, company_id, warehouse_id, zone_id, code, zone, aisle, section,
              shelf_level, travel_sequence, location_type, is_virtual, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING id, code, warehouse_id, zone_id, zone, aisle, section, shelf_level,
                   travel_sequence, location_type, is_active, is_virtual, notes, created_at",
    )
    .bind(id)
    .bind(cid)
    .bind(body.warehouse_id)
    .bind(body.zone_id)
    .bind(&body.code)
    .bind(&body.zone)
    .bind(&body.aisle)
    .bind(&body.section)
    .bind(&body.shelf_level)
    .bind(body.travel_sequence)
    .bind(location_type)
    .bind(is_virtual)
    .bind(&body.notes)
    .fetch_one(&state.db)
    .await?;
    Ok((StatusCode::CREATED, Json(row)))
}

pub async fn update_location(
    State(state): State<AppState>,
    Path(loc_id): Path<Uuid>,
    Json(body): Json<UpdateWarehouseLocation>,
) -> Result<Json<WarehouseLocation>> {
    let row = sqlx::query_as::<_, WarehouseLocation>(
        "UPDATE warehouse_locations SET
             zone            = COALESCE($2, zone),
             aisle           = COALESCE($3, aisle),
             section         = COALESCE($4, section),
             shelf_level     = COALESCE($5, shelf_level),
             travel_sequence = COALESCE($6, travel_sequence),
             location_type   = COALESCE($7, location_type),
             is_active       = COALESCE($8, is_active),
             is_virtual      = COALESCE($9, is_virtual),
             notes           = COALESCE($10, notes)
         WHERE id = $1
         RETURNING id, code, warehouse_id, zone_id, zone, aisle, section, shelf_level,
                   travel_sequence, location_type, is_active, is_virtual, notes, created_at",
    )
    .bind(loc_id)
    .bind(&body.zone)
    .bind(&body.aisle)
    .bind(&body.section)
    .bind(&body.shelf_level)
    .bind(body.travel_sequence)
    .bind(&body.location_type)
    .bind(body.is_active)
    .bind(body.is_virtual)
    .bind(&body.notes)
    .fetch_one(&state.db)
    .await?;
    Ok(Json(row))
}
