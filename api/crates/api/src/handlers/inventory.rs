use axum::{extract::{Path, State}, http::StatusCode, Json};
use rust_decimal::Decimal;
use uuid::Uuid;

use crate::{error::Result, state::AppState};
use domain::{CycleCount, CreateInventoryTransaction, InventoryTransaction, InventoryWithItem};

pub async fn list_inventory(
    State(state): State<AppState>,
) -> Result<Json<Vec<InventoryWithItem>>> {
    let rows = sqlx::query!(
        r#"SELECT i.id, i.item_id,
                  it.item_code,
                  it.description,
                  i.location,
                  i.lot_number,
                  i.qty_available,
                  i.qty_reserved,
                  i.uom_id,
                  i.last_updated,
                  i.last_counted_at,
                  it.reorder_point
           FROM inventory i
           JOIN items it ON it.id = i.item_id
           ORDER BY it.item_code"#
    )
    .fetch_all(&state.db)
    .await?;

    let result = rows
        .into_iter()
        .map(|r| {
            let atp = r.qty_available - r.qty_reserved;
            let reorder_alert = r.reorder_point.map_or(false, |rop| atp < rop);
            InventoryWithItem {
                id:              r.id,
                item_id:         r.item_id,
                item_code:       r.item_code,
                description:     r.description,
                location:        r.location,
                lot_number:      r.lot_number,
                qty_available:   r.qty_available,
                qty_reserved:    r.qty_reserved,
                uom_id:          r.uom_id,
                last_updated:    r.last_updated,
                last_counted_at: r.last_counted_at,
                reorder_point:   r.reorder_point,
                reorder_alert,
            }
        })
        .collect();

    Ok(Json(result))
}

pub async fn transact_inventory(
    State(state): State<AppState>,
    Json(body): Json<CreateInventoryTransaction>,
) -> Result<(StatusCode, Json<InventoryTransaction>)> {
    let delta: Decimal = match body.transaction_type.as_str() {
        "receipt" | "return" => body.qty,
        "issue" | "loss" | "conversion" => -body.qty,
        _ => body.qty, // adjustment: signed qty
    };

    let uom_id = body.uom_id.unwrap_or_else(Uuid::new_v4);
    sqlx::query!(
        r#"INSERT INTO inventory (id, item_id, qty_available, qty_reserved, uom_id, lot_number, location)
           VALUES (gen_random_uuid(), $1, GREATEST(0::numeric, $2), 0, $3, $4, $5)
           ON CONFLICT (item_id)
           DO UPDATE SET qty_available = GREATEST(0::numeric, inventory.qty_available + $2),
                         lot_number    = COALESCE($4, inventory.lot_number),
                         location      = COALESCE($5, inventory.location),
                         last_updated  = NOW()"#,
        body.item_id,
        delta,
        uom_id,
        body.lot_number,
        body.location,
    )
    .execute(&state.db)
    .await?;

    let id = Uuid::new_v4();
    let row = sqlx::query_as!(
        InventoryTransaction,
        "INSERT INTO inventory_transactions
             (id, item_id, transaction_type, qty, uom_id, lot_number, notes, reference_type, reference_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, item_id, transaction_type, reference_type, reference_id,
                   qty, uom_id, lot_number, notes, created_by, created_at",
        id,
        body.item_id,
        body.transaction_type,
        body.qty,
        body.uom_id,
        body.lot_number,
        body.notes,
        body.reference_type,
        body.reference_id,
    )
    .fetch_one(&state.db)
    .await?;

    Ok((StatusCode::CREATED, Json(row)))
}

pub async fn list_inventory_transactions(
    State(state): State<AppState>,
) -> Result<Json<Vec<InventoryTransaction>>> {
    let rows = sqlx::query_as!(
        InventoryTransaction,
        "SELECT id, item_id, transaction_type, reference_type, reference_id,
                qty, uom_id, lot_number, notes, created_by, created_at
         FROM inventory_transactions ORDER BY created_at DESC LIMIT 200"
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

/// POST /api/v1/inventory/:item_id/cycle-count
/// Records a physical count: creates an adjustment transaction for the delta
/// and stamps last_counted_at on the inventory row.
pub async fn cycle_count(
    State(state): State<AppState>,
    Path(item_id): Path<Uuid>,
    Json(body): Json<CycleCount>,
) -> Result<Json<InventoryTransaction>> {
    // Read current balance
    let current = sqlx::query!(
        "SELECT qty_available, uom_id FROM inventory WHERE item_id = $1",
        item_id
    )
    .fetch_one(&state.db)
    .await?;

    let delta = body.counted_qty - current.qty_available;

    // Update the balance and stamp the count timestamp
    sqlx::query!(
        r#"UPDATE inventory
           SET qty_available  = $2,
               last_counted_at = NOW(),
               last_updated    = NOW()
           WHERE item_id = $1"#,
        item_id,
        body.counted_qty,
    )
    .execute(&state.db)
    .await?;

    let id = Uuid::new_v4();
    let notes = body.notes.as_deref().unwrap_or("Cycle count adjustment");
    let row = sqlx::query_as!(
        InventoryTransaction,
        "INSERT INTO inventory_transactions
             (id, item_id, transaction_type, qty, uom_id, notes, reference_type)
         VALUES ($1, $2, 'adjustment', $3, $4, $5, 'cycle_count')
         RETURNING id, item_id, transaction_type, reference_type, reference_id,
                   qty, uom_id, lot_number, notes, created_by, created_at",
        id,
        item_id,
        delta,
        current.uom_id,
        notes,
    )
    .fetch_one(&state.db)
    .await?;

    Ok(Json(row))
}
