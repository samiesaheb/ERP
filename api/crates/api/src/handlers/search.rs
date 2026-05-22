use axum::{extract::{Query, State}, Json};
use serde::Deserialize;

use crate::{error::Result, handlers::company_id_from_claims, state::AppState};
use domain::{Claims, SearchResult};

#[derive(Deserialize)]
pub struct SearchQuery {
    pub q: Option<String>,
}

pub async fn global_search(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Query(params): Query<SearchQuery>,
) -> Result<Json<Vec<SearchResult>>> {
    let q = params.q.unwrap_or_default();
    let q = q.trim().to_string();
    if q.is_empty() {
        return Ok(Json(vec![]));
    }
    let cid = company_id_from_claims(&claims)?;
    let pattern = format!("%{}%", q.to_lowercase());

    let rows: Vec<SearchResult> = sqlx::query_as(
        r#"SELECT entity_type, id, label, sublabel
           FROM (
               (SELECT 'sales_order'::text AS entity_type,
                       id::text            AS id,
                       order_number        AS label,
                       status              AS sublabel
                FROM sales_orders
                WHERE company_id = $1 AND LOWER(order_number) LIKE $2
                LIMIT 5)

               UNION ALL

               (SELECT 'purchase_order', id::text, po_number, status
                FROM purchase_orders
                WHERE company_id = $1 AND LOWER(po_number) LIKE $2
                LIMIT 5)

               UNION ALL

               (SELECT 'manufacturing_order', id::text, mo_number, status
                FROM manufacturing_orders
                WHERE company_id = $1 AND LOWER(mo_number) LIKE $2
                LIMIT 5)

               UNION ALL

               (SELECT 'production_batch', id::text, batch_number, status
                FROM production_batches
                WHERE company_id = $1 AND LOWER(batch_number) LIKE $2
                LIMIT 5)

               UNION ALL

               (SELECT 'invoice', id::text, invoice_number, status
                FROM invoices
                WHERE company_id = $1 AND LOWER(invoice_number) LIKE $2
                LIMIT 5)

               UNION ALL

               (SELECT 'shipment', id::text, shipment_number, status
                FROM shipments
                WHERE company_id = $1 AND LOWER(shipment_number) LIKE $2
                LIMIT 5)

               UNION ALL

               (SELECT 'receipt', id::text, receipt_number, NULL::text
                FROM receipts
                WHERE company_id = $1 AND LOWER(receipt_number) LIKE $2
                LIMIT 5)

               UNION ALL

               (SELECT 'item',
                       id::text,
                       item_code || ' — ' || description,
                       item_type
                FROM items
                WHERE company_id = $1
                  AND (LOWER(item_code) LIKE $2 OR LOWER(description) LIKE $2)
                LIMIT 5)

               UNION ALL

               (SELECT 'customer', id::text, name, NULL::text
                FROM customers
                WHERE company_id = $1 AND LOWER(name) LIKE $2
                LIMIT 5)

               UNION ALL

               (SELECT 'supplier', id::text, name, NULL::text
                FROM suppliers
                WHERE company_id = $1 AND LOWER(name) LIKE $2
                LIMIT 5)
           ) results
           ORDER BY entity_type, label
           LIMIT 50"#,
    )
    .bind(cid)
    .bind(&pattern)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(rows))
}
