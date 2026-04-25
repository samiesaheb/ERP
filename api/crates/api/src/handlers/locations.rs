use axum::{extract::{Path, State}, http::StatusCode, Json};
use uuid::Uuid;

use crate::{error::Result, state::AppState};
use domain::{CreateWarehouseLocation, UpdateWarehouseLocation, WarehouseLocation};

pub async fn list_locations(
    State(state): State<AppState>,
) -> Result<Json<Vec<WarehouseLocation>>> {
    let rows = sqlx::query_as!(
        WarehouseLocation,
        "SELECT id, code, zone, aisle, section, shelf_level, travel_sequence,
                location_type, is_active, is_virtual, notes, created_at
         FROM warehouse_locations
         ORDER BY travel_sequence NULLS LAST, code"
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

pub async fn create_location(
    State(state): State<AppState>,
    Json(body): Json<CreateWarehouseLocation>,
) -> Result<(StatusCode, Json<WarehouseLocation>)> {
    let id = Uuid::new_v4();
    let location_type = body.location_type.unwrap_or_else(|| "bin".to_string());
    let is_virtual    = body.is_virtual.unwrap_or(false);

    let row = sqlx::query_as!(
        WarehouseLocation,
        "INSERT INTO warehouse_locations
             (id, code, zone, aisle, section, shelf_level, travel_sequence,
              location_type, is_virtual, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, code, zone, aisle, section, shelf_level, travel_sequence,
                   location_type, is_active, is_virtual, notes, created_at",
        id,
        body.code,
        body.zone,
        body.aisle,
        body.section,
        body.shelf_level,
        body.travel_sequence,
        location_type,
        is_virtual,
        body.notes,
    )
    .fetch_one(&state.db)
    .await?;
    Ok((StatusCode::CREATED, Json(row)))
}

pub async fn update_location(
    State(state): State<AppState>,
    Path(loc_id): Path<Uuid>,
    Json(body): Json<UpdateWarehouseLocation>,
) -> Result<Json<WarehouseLocation>> {
    let row = sqlx::query_as!(
        WarehouseLocation,
        r#"UPDATE warehouse_locations SET
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
           RETURNING id, code, zone, aisle, section, shelf_level, travel_sequence,
                     location_type, is_active, is_virtual, notes, created_at"#,
        loc_id,
        body.zone,
        body.aisle,
        body.section,
        body.shelf_level,
        body.travel_sequence,
        body.location_type,
        body.is_active,
        body.is_virtual,
        body.notes,
    )
    .fetch_one(&state.db)
    .await?;
    Ok(Json(row))
}
