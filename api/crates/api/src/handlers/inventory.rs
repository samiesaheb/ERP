use axum::{extract::State, http::StatusCode, Json};
use rust_decimal::Decimal;
use uuid::Uuid;

use crate::{error::Result, state::AppState};
use domain::{CreateInventoryTransaction, InventoryTransaction, InventoryWithItem};

const LOW_STOCK_THRESHOLD: Decimal = rust_decimal_macros::dec!(20);

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
                  i.last_updated
           FROM inventory i
           JOIN items it ON it.id = i.item_id
           ORDER BY it.item_code"#
    )
    .fetch_all(&state.db)
    .await?;

    let result = rows
        .into_iter()
        .map(|r| InventoryWithItem {
            id:            r.id,
            item_id:       r.item_id,
            item_code:     r.item_code,
            description:   r.description,
            location:      r.location,
            lot_number:    r.lot_number,
            qty_available: r.qty_available,
            qty_reserved:  r.qty_reserved,
            uom_id:        r.uom_id,
            last_updated:  r.last_updated,
            low_stock:     r.qty_available < LOW_STOCK_THRESHOLD,
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

    // Upsert inventory balance
    let uom_id = body.uom_id.unwrap_or_else(Uuid::new_v4);
    sqlx::query!(
        r#"INSERT INTO inventory (id, item_id, qty_available, qty_reserved, uom_id)
           VALUES (gen_random_uuid(), $1, GREATEST(0::numeric, $2), 0, $3)
           ON CONFLICT (item_id)
           DO UPDATE SET qty_available = GREATEST(0::numeric, inventory.qty_available + $2),
                         last_updated = NOW()"#,
        body.item_id,
        delta,
        uom_id,
    )
    .execute(&state.db)
    .await?;

    // Record transaction
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
