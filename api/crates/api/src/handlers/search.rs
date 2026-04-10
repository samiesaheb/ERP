use axum::{extract::{Query, State}, Json};
use serde::Deserialize;

use crate::{error::Result, state::AppState};
use domain::SearchResult;

#[derive(Deserialize)]
pub struct SearchQuery {
    pub q: Option<String>,
}

pub async fn global_search(
    State(state): State<AppState>,
    Query(params): Query<SearchQuery>,
) -> Result<Json<Vec<SearchResult>>> {
    let q = params.q.unwrap_or_default();
    let q = q.trim().to_string();
    if q.is_empty() {
        return Ok(Json(vec![]));
    }
    let pattern = format!("%{}%", q.to_lowercase());

    // Uses non-macro query_as so no sqlx offline cache entry is needed.
    // All UNION branches return (entity_type TEXT, id TEXT, label TEXT, sublabel TEXT?).
    let rows: Vec<SearchResult> = sqlx::query_as(
        r#"SELECT entity_type, id, label, sublabel FROM (
            SELECT 'sales_order'          AS entity_type,
                   id::text              AS id,
                   order_number          AS label,
                   status                AS sublabel
            FROM sales_orders
            WHERE LOWER(order_number) LIKE $1
            LIMIT 5

            UNION ALL

            SELECT 'purchase_order',
                   id::text,
                   po_number,
                   status
            FROM purchase_orders
            WHERE LOWER(po_number) LIKE $1
            LIMIT 5

            UNION ALL

            SELECT 'manufacturing_order',
                   id::text,
                   mo_number,
                   status
            FROM manufacturing_orders
            WHERE LOWER(mo_number) LIKE $1
            LIMIT 5

            UNION ALL

            SELECT 'production_batch',
                   id::text,
                   batch_number,
                   status
            FROM production_batches
            WHERE LOWER(batch_number) LIKE $1
            LIMIT 5

            UNION ALL

            SELECT 'invoice',
                   id::text,
                   invoice_number,
                   status
            FROM invoices
            WHERE LOWER(invoice_number) LIKE $1
            LIMIT 5

            UNION ALL

            SELECT 'shipment',
                   id::text,
                   shipment_number,
                   status
            FROM shipments
            WHERE LOWER(shipment_number) LIKE $1
            LIMIT 5

            UNION ALL

            SELECT 'receipt',
                   id::text,
                   receipt_number,
                   NULL::text
            FROM receipts
            WHERE LOWER(receipt_number) LIKE $1
            LIMIT 5

            UNION ALL

            SELECT 'item',
                   id::text,
                   item_code || ' — ' || description,
                   item_type
            FROM items
            WHERE LOWER(item_code) LIKE $1
               OR LOWER(description) LIKE $1
            LIMIT 5

            UNION ALL

            SELECT 'customer',
                   id::text,
                   name,
                   NULL::text
            FROM customers
            WHERE LOWER(name) LIKE $1
            LIMIT 5

            UNION ALL

            SELECT 'supplier',
                   id::text,
                   name,
                   NULL::text
            FROM suppliers
            WHERE LOWER(name) LIKE $1
            LIMIT 5
        ) results
        ORDER BY entity_type, label
        LIMIT 50"#,
    )
    .bind(&pattern)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(rows))
}
