use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    state::AppState,
};
use domain::{CreateManufacturingOrder, ManufacturingOrder, ProductionBatch, UpdateProductionBatch};

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
                r#"SELECT id, mo_number, sales_order_id, item_id, bom_id,
                          target_qty, status AS "status: _", created_at
                   FROM manufacturing_orders
                   WHERE status::TEXT = $1
                   ORDER BY created_at DESC"#,
                s
            )
            .fetch_all(&state.db)
            .await?
        }
        None => {
            sqlx::query_as!(
                ManufacturingOrder,
                r#"SELECT id, mo_number, sales_order_id, item_id, bom_id,
                          target_qty, status AS "status: _", created_at
                   FROM manufacturing_orders
                   ORDER BY created_at DESC"#
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
        r#"SELECT id, mo_number, sales_order_id, item_id, bom_id,
                  target_qty, status AS "status: _", created_at
           FROM manufacturing_orders WHERE id = $1"#,
        id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Manufacturing order {id} not found")))?;
    Ok(Json(row))
}

pub async fn create_manufacturing_order(
    State(state): State<AppState>,
    Json(body): Json<CreateManufacturingOrder>,
) -> Result<(StatusCode, Json<ManufacturingOrder>)> {
    let count = sqlx::query_scalar!("SELECT COUNT(*) FROM manufacturing_orders")
        .fetch_one(&state.db)
        .await?
        .unwrap_or(0);
    let mo_number = format!("MO-{}-{:04}", chrono::Utc::now().format("%Y"), count + 1);
    let id = Uuid::new_v4();

    let row = sqlx::query_as!(
        ManufacturingOrder,
        r#"INSERT INTO manufacturing_orders
               (id, mo_number, sales_order_id, item_id, bom_id, target_qty)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, mo_number, sales_order_id, item_id, bom_id,
                     target_qty, status AS "status: _", created_at"#,
        id,
        mo_number,
        body.sales_order_id,
        body.item_id,
        body.bom_id,
        body.target_qty,
    )
    .fetch_one(&state.db)
    .await?;

    // Auto-create first production batch at bulk stage
    let batch_id = Uuid::new_v4();
    let batch_number = format!("BATCH-{}-001", mo_number);
    sqlx::query!(
        "INSERT INTO production_batches (id, batch_number, mo_id, stage, pct_complete, status)
         VALUES ($1, $2, $3, 'bulk', 0, 'running')",
        batch_id,
        batch_number,
        id,
    )
    .execute(&state.db)
    .await?;

    Ok((StatusCode::CREATED, Json(row)))
}

// ---------------------------------------------------------------------------
// Production batches (floor view)
// ---------------------------------------------------------------------------

pub async fn list_production_batches(
    State(state): State<AppState>,
) -> Result<Json<Vec<ProductionBatch>>> {
    let rows = sqlx::query_as!(
        ProductionBatch,
        r#"SELECT id, batch_number, mo_id,
                  stage AS "stage: _",
                  pct_complete,
                  status AS "status: _",
                  created_at
           FROM production_batches
           WHERE status != 'done'
           ORDER BY created_at DESC"#
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

pub async fn update_production_batch(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateProductionBatch>,
) -> Result<Json<ProductionBatch>> {
    let existing = sqlx::query_as!(
        ProductionBatch,
        r#"SELECT id, batch_number, mo_id,
                  stage AS "stage: _",
                  pct_complete,
                  status AS "status: _",
                  created_at
           FROM production_batches WHERE id = $1"#,
        id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Production batch {id} not found")))?;

    let new_stage = body.stage.unwrap_or(existing.stage);
    let new_pct = body.pct_complete.unwrap_or(existing.pct_complete);
    let new_status = body.status.unwrap_or(existing.status);

    let row = sqlx::query_as!(
        ProductionBatch,
        r#"UPDATE production_batches
           SET stage = $2, pct_complete = $3, status = $4
           WHERE id = $1
           RETURNING id, batch_number, mo_id,
                     stage AS "stage: _",
                     pct_complete,
                     status AS "status: _",
                     created_at"#,
        id,
        new_stage as _,
        new_pct,
        new_status as _,
    )
    .fetch_one(&state.db)
    .await?;
    Ok(Json(row))
}
