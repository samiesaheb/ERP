use axum::{extract::State, http::StatusCode, Json};
use rust_decimal::Decimal;
use uuid::Uuid;

use crate::{error::Result, state::AppState};
use domain::{CreateInventoryTxn, InventoryTxn, InventoryWithAlert};

/// Low-stock threshold (absolute qty)
const LOW_STOCK_THRESHOLD: Decimal = rust_decimal_macros::dec!(20);

pub async fn list_inventory(State(state): State<AppState>) -> Result<Json<Vec<InventoryWithAlert>>> {
    let rows = sqlx::query!(
        r#"SELECT i.id, i.item_id,
                  it.code AS item_code,
                  it.description AS item_description,
                  i.qty_on_hand, i.qty_reserved,
                  COALESCE(i.qty_available, 0) AS "qty_available!: Decimal",
                  i.updated_at
           FROM inventory i
           JOIN items it ON it.id = i.item_id
           ORDER BY it.code"#
    )
    .fetch_all(&state.db)
    .await?;

    let result = rows
        .into_iter()
        .map(|r| InventoryWithAlert {
            id: r.id,
            item_id: r.item_id,
            item_code: r.item_code,
            item_description: r.item_description,
            qty_on_hand: r.qty_on_hand,
            qty_reserved: r.qty_reserved,
            qty_available: r.qty_available,
            low_stock: r.qty_available < LOW_STOCK_THRESHOLD,
            updated_at: r.updated_at,
        })
        .collect();

    Ok(Json(result))
}

pub async fn transact_inventory(
    State(state): State<AppState>,
    Json(body): Json<CreateInventoryTxn>,
) -> Result<(StatusCode, Json<InventoryTxn>)> {
    // Determine delta: receipts/returns add, issues/losses/adjustments may subtract
    use domain::InventoryTxnType::*;
    let delta: Decimal = match body.txn_type {
        Receipt | Return => body.qty,
        Issue | Loss | Conversion => -body.qty,
        Adjustment => body.qty, // signed qty passed directly
    };

    // Upsert inventory balance
    sqlx::query!(
        r#"INSERT INTO inventory (id, item_id, qty_on_hand, qty_reserved)
           VALUES (uuid_generate_v4(), $1, GREATEST(0::numeric, $2), 0)
           ON CONFLICT (item_id)
           DO UPDATE SET qty_on_hand = GREATEST(0::numeric, inventory.qty_on_hand + $2),
                         updated_at = NOW()"#,
        body.item_id,
        delta,
    )
    .execute(&state.db)
    .await?;

    // Record transaction
    let id = Uuid::new_v4();
    let row = sqlx::query_as!(
        InventoryTxn,
        r#"INSERT INTO inventory_txns (id, item_id, txn_type, qty, ref_doc_type, ref_doc_id)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, item_id,
                     txn_type AS "txn_type: _",
                     qty, ref_doc_type, ref_doc_id, created_at"#,
        id,
        body.item_id,
        body.txn_type as _,
        body.qty,
        body.ref_doc_type,
        body.ref_doc_id,
    )
    .fetch_one(&state.db)
    .await?;

    Ok((StatusCode::CREATED, Json(row)))
}
