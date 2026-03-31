use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use rust_decimal::Decimal;
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    state::AppState,
};
use domain::{CreateGrn, CreatePurchaseOrder, Grn, GrnLine, PoLine, PurchaseOrder};

#[derive(Deserialize)]
pub struct PoQuery {
    pub status: Option<String>,
}

pub async fn list_purchase_orders(
    State(state): State<AppState>,
    Query(q): Query<PoQuery>,
) -> Result<Json<Vec<PurchaseOrder>>> {
    let rows = match q.status.as_deref() {
        Some(s) => {
            sqlx::query_as!(
                PurchaseOrder,
                r#"SELECT id, po_number, supplier_id,
                          status AS "status: _",
                          expected_date, total_amount,
                          supplier_type AS "supplier_type: _",
                          created_at
                   FROM purchase_orders
                   WHERE status::TEXT = $1
                   ORDER BY created_at DESC"#,
                s
            )
            .fetch_all(&state.db)
            .await?
        }
        None => {
            sqlx::query_as!(
                PurchaseOrder,
                r#"SELECT id, po_number, supplier_id,
                          status AS "status: _",
                          expected_date, total_amount,
                          supplier_type AS "supplier_type: _",
                          created_at
                   FROM purchase_orders
                   ORDER BY created_at DESC"#
            )
            .fetch_all(&state.db)
            .await?
        }
    };
    Ok(Json(rows))
}

pub async fn get_purchase_order(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<PurchaseOrder>> {
    let row = sqlx::query_as!(
        PurchaseOrder,
        r#"SELECT id, po_number, supplier_id,
                  status AS "status: _",
                  expected_date, total_amount,
                  supplier_type AS "supplier_type: _",
                  created_at
           FROM purchase_orders WHERE id = $1"#,
        id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Purchase order {id} not found")))?;
    Ok(Json(row))
}

pub async fn create_purchase_order(
    State(state): State<AppState>,
    Json(body): Json<CreatePurchaseOrder>,
) -> Result<(StatusCode, Json<PurchaseOrder>)> {
    // Fetch supplier to get supplier_type
    let supplier = sqlx::query!(
        r#"SELECT supplier_type::TEXT AS supplier_type FROM suppliers WHERE id = $1"#,
        body.supplier_id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Supplier not found".to_string()))?;

    let supplier_type_str = supplier.supplier_type.unwrap_or_default();

    let count = sqlx::query_scalar!("SELECT COUNT(*) FROM purchase_orders")
        .fetch_one(&state.db)
        .await?
        .unwrap_or(0);
    let po_number = format!("PO-{}-{:04}", chrono::Utc::now().format("%Y"), count + 1);

    // Calculate total amount from lines
    let total: Decimal = body
        .lines
        .iter()
        .map(|l| l.qty_ordered * l.unit_price)
        .sum();

    let po_id = Uuid::new_v4();
    let row = sqlx::query_as!(
        PurchaseOrder,
        r#"INSERT INTO purchase_orders
               (id, po_number, supplier_id, expected_date, total_amount, supplier_type)
           VALUES ($1, $2, $3, $4, $5, $6::supplier_type)
           RETURNING id, po_number, supplier_id,
                     status AS "status: _",
                     expected_date, total_amount,
                     supplier_type AS "supplier_type: _",
                     created_at"#,
        po_id,
        po_number,
        body.supplier_id,
        body.expected_date,
        total,
        supplier_type_str as _,
    )
    .fetch_one(&state.db)
    .await?;

    // Insert PO lines
    for line in &body.lines {
        let line_id = Uuid::new_v4();
        sqlx::query!(
            "INSERT INTO po_lines (id, po_id, item_id, qty_ordered, qty_received, unit_price, uom_id)
             VALUES ($1, $2, $3, $4, 0, $5, $6)",
            line_id,
            po_id,
            line.item_id,
            line.qty_ordered,
            line.unit_price,
            line.uom_id,
        )
        .execute(&state.db)
        .await?;
    }

    Ok((StatusCode::CREATED, Json(row)))
}

pub async fn get_po_lines(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Vec<PoLine>>> {
    let rows = sqlx::query_as!(
        PoLine,
        "SELECT id, po_id, item_id, qty_ordered, qty_received, unit_price, uom_id
         FROM po_lines WHERE po_id = $1 ORDER BY id",
        id
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

// ---------------------------------------------------------------------------
// GRN — Goods Receiving
// ---------------------------------------------------------------------------

pub async fn create_grn(
    State(state): State<AppState>,
    Json(body): Json<CreateGrn>,
) -> Result<(StatusCode, Json<Grn>)> {
    let count = sqlx::query_scalar!("SELECT COUNT(*) FROM grn")
        .fetch_one(&state.db)
        .await?
        .unwrap_or(0);
    let grn_number = format!("GRN-{}-{:04}", chrono::Utc::now().format("%Y"), count + 1);

    let grn_id = Uuid::new_v4();
    let row = sqlx::query_as!(
        Grn,
        "INSERT INTO grn (id, grn_number, po_id, received_date)
         VALUES ($1, $2, $3, $4)
         RETURNING id, grn_number, po_id, received_date, created_at",
        grn_id,
        grn_number,
        body.po_id,
        body.received_date,
    )
    .fetch_one(&state.db)
    .await?;

    for line in &body.lines {
        let line_id = Uuid::new_v4();
        sqlx::query!(
            "INSERT INTO grn_lines (id, grn_id, po_line_id, item_id, qty_received, batch_number, qc_status, into_stock)
             VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)",
            line_id,
            grn_id,
            line.po_line_id,
            line.item_id,
            line.qty_received,
            line.batch_number,
            line.into_stock,
        )
        .execute(&state.db)
        .await?;

        // Update qty_received on PO line
        sqlx::query!(
            "UPDATE po_lines SET qty_received = qty_received + $1 WHERE id = $2",
            line.qty_received,
            line.po_line_id,
        )
        .execute(&state.db)
        .await?;

        // If into_stock, update inventory
        if line.into_stock {
            sqlx::query!(
                r#"INSERT INTO inventory (id, item_id, qty_on_hand, qty_reserved)
                   VALUES (uuid_generate_v4(), $1, $2, 0)
                   ON CONFLICT (item_id)
                   DO UPDATE SET qty_on_hand = inventory.qty_on_hand + $2,
                                 updated_at = NOW()"#,
                line.item_id,
                line.qty_received,
            )
            .execute(&state.db)
            .await?;

            // Record inventory transaction
            sqlx::query!(
                "INSERT INTO inventory_txns (id, item_id, txn_type, qty, ref_doc_type, ref_doc_id)
                 VALUES (uuid_generate_v4(), $1, 'receipt', $2, 'grn', $3)",
                line.item_id,
                line.qty_received,
                grn_id,
            )
            .execute(&state.db)
            .await?;
        }
    }

    // Check if all PO lines are fully received → mark PO as received
    let open_lines = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM po_lines
         WHERE po_id = $1 AND qty_received < qty_ordered",
        body.po_id
    )
    .fetch_one(&state.db)
    .await?
    .unwrap_or(0);

    if open_lines == 0 {
        sqlx::query!(
            "UPDATE purchase_orders SET status = 'received' WHERE id = $1",
            body.po_id
        )
        .execute(&state.db)
        .await?;
    }

    Ok((StatusCode::CREATED, Json(row)))
}

pub async fn list_grn_lines(
    State(state): State<AppState>,
    Path(grn_id): Path<Uuid>,
) -> Result<Json<Vec<GrnLine>>> {
    let rows = sqlx::query_as!(
        GrnLine,
        r#"SELECT id, grn_id, po_line_id, item_id, qty_received, batch_number,
                  qc_status AS "qc_status: _",
                  into_stock
           FROM grn_lines WHERE grn_id = $1"#,
        grn_id
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}
