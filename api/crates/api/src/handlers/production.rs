use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    middleware::rbac::{require_role, ADMIN_PLANNER, ADMIN_PLANNER_SUPERVISOR, PRODUCTION_ROLES},
    state::AppState,
};
use domain::{
    Claims, BatchComponentIssue, CreateBatchComponentIssue, CreateManufacturingOrder,
    CreateProductionPlan, ManufacturingOrder, ProductionBatch, ProductionPlan,
    UpdateManufacturingOrder, UpdateProductionBatch,
};

#[derive(Deserialize)]
pub struct MoQuery {
    pub status: Option<String>,
}

pub async fn list_manufacturing_orders(
    State(state): State<AppState>,
    Query(q): Query<MoQuery>,
) -> Result<Json<Vec<ManufacturingOrder>>> {
    let rows = match q.status.as_deref() {
        Some(s) => {
            sqlx::query_as!(
                ManufacturingOrder,
                "SELECT id, mo_number, sales_order_id, item_id, bom_id, status,
                        qty_planned, qty_produced, uom_id, planned_start, planned_end,
                        actual_start, actual_end, notes, created_at
                 FROM manufacturing_orders WHERE status = $1 ORDER BY created_at DESC",
                s
            )
            .fetch_all(&state.db)
            .await?
        }
        None => {
            sqlx::query_as!(
                ManufacturingOrder,
                "SELECT id, mo_number, sales_order_id, item_id, bom_id, status,
                        qty_planned, qty_produced, uom_id, planned_start, planned_end,
                        actual_start, actual_end, notes, created_at
                 FROM manufacturing_orders ORDER BY created_at DESC"
            )
            .fetch_all(&state.db)
            .await?
        }
    };
    Ok(Json(rows))
}

pub async fn get_manufacturing_order(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ManufacturingOrder>> {
    let row = sqlx::query_as!(
        ManufacturingOrder,
        "SELECT id, mo_number, sales_order_id, item_id, bom_id, status,
                qty_planned, qty_produced, uom_id, planned_start, planned_end,
                actual_start, actual_end, notes, created_at
         FROM manufacturing_orders WHERE id = $1",
        id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Manufacturing order {id} not found")))?;
    Ok(Json(row))
}

pub async fn create_manufacturing_order(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Json(body): Json<CreateManufacturingOrder>,
) -> Result<(StatusCode, Json<ManufacturingOrder>)> {
    require_role(&claims, ADMIN_PLANNER)?;
    let count = sqlx::query_scalar!("SELECT COUNT(*) FROM manufacturing_orders")
        .fetch_one(&state.db)
        .await?
        .unwrap_or(0);
    let mo_number = format!("MO-{}-{:04}", chrono::Utc::now().format("%Y"), count + 1);
    let id = Uuid::new_v4();

    let row = sqlx::query_as!(
        ManufacturingOrder,
        "INSERT INTO manufacturing_orders
             (id, mo_number, sales_order_id, item_id, bom_id, qty_planned, uom_id,
              planned_start, planned_end, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, mo_number, sales_order_id, item_id, bom_id, status,
                   qty_planned, qty_produced, uom_id, planned_start, planned_end,
                   actual_start, actual_end, notes, created_at",
        id,
        mo_number,
        body.sales_order_id,
        body.item_id,
        body.bom_id,
        body.qty_planned,
        body.uom_id,
        body.planned_start,
        body.planned_end,
        body.notes,
    )
    .fetch_one(&state.db)
    .await?;

    Ok((StatusCode::CREATED, Json(row)))
}

fn validate_mo_transition(from: &str, to: &str) -> Result<()> {
    let allowed: &[&str] = match from {
        "draft"       => &["planned", "cancelled"],
        "planned"     => &["in_progress", "cancelled"],
        "in_progress" => &["completed", "cancelled"],
        _             => &[],
    };
    if allowed.contains(&to) {
        Ok(())
    } else {
        Err(AppError::Unprocessable(format!(
            "Cannot transition manufacturing order from '{}' to '{}'", from, to
        )))
    }
}

fn validate_batch_transition(from: &str, to: &str) -> Result<()> {
    let allowed: &[&str] = match from {
        "planned"         => &["bulk_production"],
        "bulk_production" => &["filling"],
        "filling"         => &["packing"],
        "packing"         => &["completed"],
        _                 => &[],
    };
    if allowed.contains(&to) {
        Ok(())
    } else {
        Err(AppError::Unprocessable(format!(
            "Cannot transition production batch from '{}' to '{}'", from, to
        )))
    }
}

pub async fn update_manufacturing_order(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateManufacturingOrder>,
) -> Result<Json<ManufacturingOrder>> {
    require_role(&claims, ADMIN_PLANNER_SUPERVISOR)?;
    let existing = sqlx::query_as!(
        ManufacturingOrder,
        "SELECT id, mo_number, sales_order_id, item_id, bom_id, status,
                qty_planned, qty_produced, uom_id, planned_start, planned_end,
                actual_start, actual_end, notes, created_at
         FROM manufacturing_orders WHERE id = $1",
        id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Manufacturing order {id} not found")))?;

    if let Some(ref next) = body.status {
        validate_mo_transition(&existing.status, next)?;
    }

    let now = chrono::Utc::now();
    let new_status = body.status.as_deref().unwrap_or(&existing.status).to_string();
    let new_qty_produced = body.qty_produced.unwrap_or(existing.qty_produced);
    let new_actual_start = if new_status == "in_progress" && existing.actual_start.is_none() {
        Some(now)
    } else {
        body.actual_start.or(existing.actual_start)
    };
    let new_actual_end = if new_status == "completed" && existing.actual_end.is_none() {
        Some(now)
    } else {
        body.actual_end.or(existing.actual_end)
    };
    let new_notes = body.notes.or(existing.notes);

    let row = sqlx::query_as!(
        ManufacturingOrder,
        "UPDATE manufacturing_orders
         SET status = $2, qty_produced = $3, actual_start = $4, actual_end = $5, notes = $6
         WHERE id = $1
         RETURNING id, mo_number, sales_order_id, item_id, bom_id, status,
                   qty_planned, qty_produced, uom_id, planned_start, planned_end,
                   actual_start, actual_end, notes, created_at",
        id,
        new_status,
        new_qty_produced,
        new_actual_start,
        new_actual_end,
        new_notes,
    )
    .fetch_one(&state.db)
    .await?;
    Ok(Json(row))
}

// ---------------------------------------------------------------------------
// Production Batches
// ---------------------------------------------------------------------------

pub async fn list_production_batches(
    State(state): State<AppState>,
) -> Result<Json<Vec<ProductionBatch>>> {
    let rows = sqlx::query_as!(
        ProductionBatch,
        "SELECT id, batch_number, manufacturing_order_id, bom_id, status,
                qty_bulk_produced, qty_filled, qty_packed, uom_id,
                bulk_start, bulk_end, fill_start, fill_end, pack_start, pack_end,
                notes, created_at
         FROM production_batches
         WHERE status != 'completed'
         ORDER BY created_at DESC"
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

pub async fn list_mo_batches(
    State(state): State<AppState>,
    Path(mo_id): Path<Uuid>,
) -> Result<Json<Vec<ProductionBatch>>> {
    let rows = sqlx::query_as!(
        ProductionBatch,
        "SELECT id, batch_number, manufacturing_order_id, bom_id, status,
                qty_bulk_produced, qty_filled, qty_packed, uom_id,
                bulk_start, bulk_end, fill_start, fill_end, pack_start, pack_end,
                notes, created_at
         FROM production_batches WHERE manufacturing_order_id = $1 ORDER BY created_at",
        mo_id
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

pub async fn create_production_batch(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Path(mo_id): Path<Uuid>,
) -> Result<(StatusCode, Json<ProductionBatch>)> {
    require_role(&claims, ADMIN_PLANNER_SUPERVISOR)?;
    let mo = sqlx::query!(
        "SELECT mo_number, bom_id, uom_id FROM manufacturing_orders WHERE id = $1",
        mo_id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Manufacturing order {mo_id} not found")))?;

    let count = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM production_batches WHERE manufacturing_order_id = $1",
        mo_id
    )
    .fetch_one(&state.db)
    .await?
    .unwrap_or(0);

    let batch_number = format!("BATCH-{}-{:03}", mo.mo_number, count + 1);
    let id = Uuid::new_v4();

    let row = sqlx::query_as!(
        ProductionBatch,
        "INSERT INTO production_batches (id, batch_number, manufacturing_order_id, bom_id, uom_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, batch_number, manufacturing_order_id, bom_id, status,
                   qty_bulk_produced, qty_filled, qty_packed, uom_id,
                   bulk_start, bulk_end, fill_start, fill_end, pack_start, pack_end,
                   notes, created_at",
        id,
        batch_number,
        mo_id,
        mo.bom_id,
        mo.uom_id,
    )
    .fetch_one(&state.db)
    .await?;
    Ok((StatusCode::CREATED, Json(row)))
}

pub async fn update_production_batch(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateProductionBatch>,
) -> Result<Json<ProductionBatch>> {
    require_role(&claims, PRODUCTION_ROLES)?;
    let existing = sqlx::query_as!(
        ProductionBatch,
        "SELECT id, batch_number, manufacturing_order_id, bom_id, status,
                qty_bulk_produced, qty_filled, qty_packed, uom_id,
                bulk_start, bulk_end, fill_start, fill_end, pack_start, pack_end,
                notes, created_at
         FROM production_batches WHERE id = $1",
        id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Production batch {id} not found")))?;

    if let Some(ref next) = body.status {
        validate_batch_transition(&existing.status, next)?;
    }

    let now = chrono::Utc::now();
    let new_status = body.status.as_deref().unwrap_or(&existing.status).to_string();
    let new_qty_bulk = body.qty_bulk_produced.or(existing.qty_bulk_produced);
    let new_qty_filled = body.qty_filled.or(existing.qty_filled);
    let new_qty_packed = body.qty_packed.or(existing.qty_packed);
    let new_notes = body.notes.or(existing.notes);

    // Auto-set timestamps based on stage transitions
    let bulk_start = if new_status == "bulk_production" && existing.bulk_start.is_none() {
        Some(now)
    } else {
        existing.bulk_start
    };
    let bulk_end = if new_status == "filling" && existing.bulk_end.is_none() {
        Some(now)
    } else {
        existing.bulk_end
    };
    let fill_start = if new_status == "filling" && existing.fill_start.is_none() {
        Some(now)
    } else {
        existing.fill_start
    };
    let fill_end = if new_status == "packing" && existing.fill_end.is_none() {
        Some(now)
    } else {
        existing.fill_end
    };
    let pack_start = if new_status == "packing" && existing.pack_start.is_none() {
        Some(now)
    } else {
        existing.pack_start
    };
    let pack_end = if new_status == "completed" && existing.pack_end.is_none() {
        Some(now)
    } else {
        existing.pack_end
    };

    let row = sqlx::query_as!(
        ProductionBatch,
        "UPDATE production_batches
         SET status            = $2,
             qty_bulk_produced = $3,
             qty_filled        = $4,
             qty_packed        = $5,
             bulk_start        = $6,
             bulk_end          = $7,
             fill_start        = $8,
             fill_end          = $9,
             pack_start        = $10,
             pack_end          = $11,
             notes             = $12
         WHERE id = $1
         RETURNING id, batch_number, manufacturing_order_id, bom_id, status,
                   qty_bulk_produced, qty_filled, qty_packed, uom_id,
                   bulk_start, bulk_end, fill_start, fill_end, pack_start, pack_end,
                   notes, created_at",
        id,
        new_status,
        new_qty_bulk,
        new_qty_filled,
        new_qty_packed,
        bulk_start,
        bulk_end,
        fill_start,
        fill_end,
        pack_start,
        pack_end,
        new_notes,
    )
    .fetch_one(&state.db)
    .await?;
    Ok(Json(row))
}

// ---------------------------------------------------------------------------
// Batch Component Issues
// ---------------------------------------------------------------------------

pub async fn list_batch_issues(
    State(state): State<AppState>,
    Path(batch_id): Path<Uuid>,
) -> Result<Json<Vec<BatchComponentIssue>>> {
    let rows = sqlx::query_as!(
        BatchComponentIssue,
        "SELECT id, batch_id, item_id, qty_issued, qty_returned, qty_loss, uom_id, lot_number, issued_at
         FROM batch_component_issues WHERE batch_id = $1 ORDER BY issued_at",
        batch_id
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

pub async fn create_batch_issue(
    State(state): State<AppState>,
    Path(batch_id): Path<Uuid>,
    Json(body): Json<CreateBatchComponentIssue>,
) -> Result<(StatusCode, Json<BatchComponentIssue>)> {
    let id = Uuid::new_v4();
    let row = sqlx::query_as!(
        BatchComponentIssue,
        "INSERT INTO batch_component_issues (id, batch_id, item_id, qty_issued, uom_id, lot_number)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, batch_id, item_id, qty_issued, qty_returned, qty_loss, uom_id, lot_number, issued_at",
        id,
        batch_id,
        body.item_id,
        body.qty_issued,
        body.uom_id,
        body.lot_number,
    )
    .fetch_one(&state.db)
    .await?;

    // Deduct from inventory
    sqlx::query!(
        "UPDATE inventory SET qty_available = GREATEST(0, qty_available - $1)
         WHERE item_id = $2",
        body.qty_issued,
        body.item_id,
    )
    .execute(&state.db)
    .await?;

    Ok((StatusCode::CREATED, Json(row)))
}

// ---------------------------------------------------------------------------
// Production Plans
// ---------------------------------------------------------------------------

pub async fn list_production_plans(
    State(state): State<AppState>,
) -> Result<Json<Vec<ProductionPlan>>> {
    let rows = sqlx::query_as!(
        ProductionPlan,
        "SELECT id, plan_date, manufacturing_order_id, purchase_order_id,
                planned_qty, notes, created_by, created_at
         FROM production_plans ORDER BY plan_date DESC",
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

pub async fn create_production_plan(
    State(state): State<AppState>,
    Json(body): Json<CreateProductionPlan>,
) -> Result<(StatusCode, Json<ProductionPlan>)> {
    let id = Uuid::new_v4();
    let row = sqlx::query_as!(
        ProductionPlan,
        "INSERT INTO production_plans
             (id, plan_date, manufacturing_order_id, purchase_order_id, planned_qty, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, plan_date, manufacturing_order_id, purchase_order_id,
                   planned_qty, notes, created_by, created_at",
        id,
        body.plan_date,
        body.manufacturing_order_id,
        body.purchase_order_id,
        body.planned_qty,
        body.notes,
    )
    .fetch_one(&state.db)
    .await?;
    Ok((StatusCode::CREATED, Json(row)))
}
