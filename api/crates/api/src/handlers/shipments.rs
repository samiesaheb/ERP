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
    Claims, CreateShipment, CreateShipmentLine, CreateShippingDocument,
    Shipment, ShipmentLine, ShippingDocument, UpdateShipment,
};

pub async fn list_shipments(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
) -> Result<Json<Vec<Shipment>>> {
    let cid = company_id_from_claims(&claims)?;
    let rows = sqlx::query_as::<_, Shipment>(
        "SELECT id, shipment_number, sales_order_id, status, carrier,
                tracking_number, loaded_at, dispatched_at, delivered_at, notes, created_at
         FROM shipments WHERE company_id = $1 ORDER BY created_at DESC",
    )
    .bind(cid)
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

pub async fn get_shipment(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Shipment>> {
    let row = sqlx::query_as!(
        Shipment,
        "SELECT id, shipment_number, sales_order_id, status, carrier,
                tracking_number, loaded_at, dispatched_at, delivered_at, notes, created_at
         FROM shipments WHERE id = $1",
        id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Shipment {id} not found")))?;
    Ok(Json(row))
}

pub async fn create_shipment(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Json(body): Json<CreateShipment>,
) -> Result<(StatusCode, Json<Shipment>)> {
    require_role(&claims, WAREHOUSE_ROLES)?;
    let cid = company_id_from_claims(&claims)?;
    let count: i64 = sqlx::query_scalar::<_, Option<i64>>("SELECT COUNT(*) FROM shipments WHERE company_id = $1")
        .bind(cid)
        .fetch_one(&state.db)
        .await?
        .unwrap_or(0);
    let shipment_number = format!("SHP-{}-{:04}", chrono::Utc::now().format("%Y"), count + 1);
    let id = Uuid::new_v4();

    let row = sqlx::query_as::<_, Shipment>(
        "INSERT INTO shipments (id, company_id, shipment_number, sales_order_id, carrier, tracking_number, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, shipment_number, sales_order_id, status, carrier,
                   tracking_number, loaded_at, dispatched_at, delivered_at, notes, created_at",
    )
    .bind(id)
    .bind(cid)
    .bind(&shipment_number)
    .bind(body.sales_order_id)
    .bind(&body.carrier)
    .bind(&body.tracking_number)
    .bind(&body.notes)
    .fetch_one(&state.db)
    .await?;
    Ok((StatusCode::CREATED, Json(row)))
}

fn validate_shipment_transition(from: &str, to: &str) -> Result<()> {
    let allowed: &[&str] = match from {
        "loading"    => &["dispatched"],
        "dispatched" => &["in_transit"],
        "in_transit" => &["delivered"],
        _            => &[],
    };
    if allowed.contains(&to) {
        Ok(())
    } else {
        Err(AppError::Unprocessable(format!(
            "Cannot transition shipment from '{}' to '{}'", from, to
        )))
    }
}

pub async fn update_shipment(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateShipment>,
) -> Result<Json<Shipment>> {
    require_role(&claims, WAREHOUSE_ROLES)?;
    let existing = sqlx::query_as!(
        Shipment,
        "SELECT id, shipment_number, sales_order_id, status, carrier,
                tracking_number, loaded_at, dispatched_at, delivered_at, notes, created_at
         FROM shipments WHERE id = $1",
        id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Shipment {id} not found")))?;

    if let Some(ref next) = body.status {
        validate_shipment_transition(&existing.status, next)?;
    }

    let now = chrono::Utc::now();
    let new_status = body.status.as_deref().unwrap_or(&existing.status).to_string();
    let new_carrier = body.carrier.or(existing.carrier);
    let new_tracking = body.tracking_number.or(existing.tracking_number);
    let new_notes = body.notes.or(existing.notes);

    let loaded_at = if new_status == "dispatched" && existing.loaded_at.is_none() {
        Some(now)
    } else {
        body.loaded_at.or(existing.loaded_at)
    };
    let dispatched_at = if new_status == "dispatched" && existing.dispatched_at.is_none() {
        Some(now)
    } else {
        body.dispatched_at.or(existing.dispatched_at)
    };
    let delivered_at = if new_status == "delivered" && existing.delivered_at.is_none() {
        Some(now)
    } else {
        body.delivered_at.or(existing.delivered_at)
    };

    let row = sqlx::query_as!(
        Shipment,
        "UPDATE shipments
         SET status = $2, carrier = $3, tracking_number = $4,
             loaded_at = $5, dispatched_at = $6, delivered_at = $7, notes = $8
         WHERE id = $1
         RETURNING id, shipment_number, sales_order_id, status, carrier,
                   tracking_number, loaded_at, dispatched_at, delivered_at, notes, created_at",
        id,
        new_status,
        new_carrier,
        new_tracking,
        loaded_at,
        dispatched_at,
        delivered_at,
        new_notes,
    )
    .fetch_one(&state.db)
    .await?;
    Ok(Json(row))
}

// ---------------------------------------------------------------------------
// Shipment Lines — child table, scoped by shipment
// ---------------------------------------------------------------------------

pub async fn list_shipment_lines(
    State(state): State<AppState>,
    Path(shipment_id): Path<Uuid>,
) -> Result<Json<Vec<ShipmentLine>>> {
    let rows = sqlx::query_as!(
        ShipmentLine,
        "SELECT id, shipment_id, item_id, batch_id, qty_shipped, uom_id
         FROM shipment_lines WHERE shipment_id = $1",
        shipment_id
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

pub async fn create_shipment_line(
    State(state): State<AppState>,
    Path(shipment_id): Path<Uuid>,
    Json(body): Json<CreateShipmentLine>,
) -> Result<(StatusCode, Json<ShipmentLine>)> {
    let id = Uuid::new_v4();
    let row = sqlx::query_as!(
        ShipmentLine,
        "INSERT INTO shipment_lines (id, shipment_id, item_id, batch_id, qty_shipped, uom_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, shipment_id, item_id, batch_id, qty_shipped, uom_id",
        id,
        shipment_id,
        body.item_id,
        body.batch_id,
        body.qty_shipped,
        body.uom_id,
    )
    .fetch_one(&state.db)
    .await?;
    Ok((StatusCode::CREATED, Json(row)))
}

// ---------------------------------------------------------------------------
// Shipping Documents — child table, scoped by shipment
// ---------------------------------------------------------------------------

pub async fn list_shipping_documents(
    State(state): State<AppState>,
    Path(shipment_id): Path<Uuid>,
) -> Result<Json<Vec<ShippingDocument>>> {
    let rows = sqlx::query_as!(
        ShippingDocument,
        "SELECT id, shipment_id, doc_type, file_url, issued_at
         FROM shipping_documents WHERE shipment_id = $1 ORDER BY issued_at DESC",
        shipment_id
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

pub async fn create_shipping_document(
    State(state): State<AppState>,
    Json(body): Json<CreateShippingDocument>,
) -> Result<(StatusCode, Json<ShippingDocument>)> {
    let id = Uuid::new_v4();
    let row = sqlx::query_as!(
        ShippingDocument,
        "INSERT INTO shipping_documents (id, shipment_id, doc_type, file_url)
         VALUES ($1, $2, $3, $4)
         RETURNING id, shipment_id, doc_type, file_url, issued_at",
        id,
        body.shipment_id,
        body.doc_type,
        body.file_url,
    )
    .fetch_one(&state.db)
    .await?;
    Ok((StatusCode::CREATED, Json(row)))
}
