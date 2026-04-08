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
use domain::{
    CreatePurchaseOrder, CreatePurchaseOrderLine, CreateReceipt, PurchaseOrder, PurchaseOrderLine,
    Receipt, ReceiptLine, UpdatePurchaseOrder,
};

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
                "SELECT id, po_number, supplier_id, manufacturing_order_id, status,
                        order_date, expected_date, notes, created_at
                 FROM purchase_orders WHERE status = $1 ORDER BY created_at DESC",
                s
            )
            .fetch_all(&state.db)
            .await?
        }
        None => {
            sqlx::query_as!(
                PurchaseOrder,
                "SELECT id, po_number, supplier_id, manufacturing_order_id, status,
                        order_date, expected_date, notes, created_at
                 FROM purchase_orders ORDER BY created_at DESC"
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
        "SELECT id, po_number, supplier_id, manufacturing_order_id, status,
                order_date, expected_date, notes, created_at
         FROM purchase_orders WHERE id = $1",
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
    let count = sqlx::query_scalar!("SELECT COUNT(*) FROM purchase_orders")
        .fetch_one(&state.db)
        .await?
        .unwrap_or(0);
    let po_number = format!("PO-{}-{:04}", chrono::Utc::now().format("%Y"), count + 1);
    let po_id = Uuid::new_v4();

    let row = sqlx::query_as!(
        PurchaseOrder,
        "INSERT INTO purchase_orders
             (id, po_number, supplier_id, manufacturing_order_id, order_date, expected_date, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, po_number, supplier_id, manufacturing_order_id, status,
                   order_date, expected_date, notes, created_at",
        po_id,
        po_number,
        body.supplier_id,
        body.manufacturing_order_id,
        body.order_date,
        body.expected_date,
        body.notes,
    )
    .fetch_one(&state.db)
    .await?;

    for line in &body.lines {
        let line_id = Uuid::new_v4();
        sqlx::query!(
            "INSERT INTO purchase_order_lines
                 (id, purchase_order_id, item_id, qty_ordered, qty_received, uom_id, unit_cost)
             VALUES ($1, $2, $3, $4, 0, $5, $6)",
            line_id,
            po_id,
            line.item_id,
            line.qty_ordered,
            line.uom_id,
            line.unit_cost,
        )
        .execute(&state.db)
        .await?;
    }

    Ok((StatusCode::CREATED, Json(row)))
}

fn validate_po_transition(from: &str, to: &str) -> Result<()> {
    let allowed: &[&str] = match from {
        "draft"              => &["sent", "cancelled"],
        "sent"               => &["confirmed", "cancelled"],
        "confirmed"          => &["partially_received", "received", "cancelled"],
        "partially_received" => &["received", "cancelled"],
        _                    => &[],
    };
    if allowed.contains(&to) {
        Ok(())
    } else {
        Err(AppError::Unprocessable(format!(
            "Cannot transition purchase order from '{}' to '{}'", from, to
        )))
    }
}

pub async fn update_purchase_order(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdatePurchaseOrder>,
) -> Result<Json<PurchaseOrder>> {
    let existing = sqlx::query_as!(
        PurchaseOrder,
        "SELECT id, po_number, supplier_id, manufacturing_order_id, status,
                order_date, expected_date, notes, created_at
         FROM purchase_orders WHERE id = $1",
        id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Purchase order {id} not found")))?;

    if let Some(ref next) = body.status {
        validate_po_transition(&existing.status, next)?;
    }

    let new_status = body.status.unwrap_or(existing.status);
    let new_expected = body.expected_date.or(existing.expected_date);
    let new_notes = body.notes.or(existing.notes);

    let row = sqlx::query_as!(
        PurchaseOrder,
        "UPDATE purchase_orders
         SET status = $2, expected_date = $3, notes = $4
         WHERE id = $1
         RETURNING id, po_number, supplier_id, manufacturing_order_id, status,
                   order_date, expected_date, notes, created_at",
        id,
        new_status,
        new_expected,
        new_notes,
    )
    .fetch_one(&state.db)
    .await?;
    Ok(Json(row))
}

pub async fn get_po_lines(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Vec<PurchaseOrderLine>>> {
    let rows = sqlx::query_as!(
        PurchaseOrderLine,
        "SELECT id, purchase_order_id, item_id, qty_ordered, qty_received, uom_id, unit_cost
         FROM purchase_order_lines WHERE purchase_order_id = $1 ORDER BY id",
        id
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

pub async fn create_po_line(
    State(state): State<AppState>,
    Path(po_id): Path<Uuid>,
    Json(body): Json<CreatePurchaseOrderLine>,
) -> Result<(StatusCode, Json<PurchaseOrderLine>)> {
    sqlx::query_scalar!("SELECT id FROM purchase_orders WHERE id = $1", po_id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Purchase order {po_id} not found")))?;

    let id = Uuid::new_v4();
    let row = sqlx::query_as!(
        PurchaseOrderLine,
        "INSERT INTO purchase_order_lines
             (id, purchase_order_id, item_id, qty_ordered, qty_received, uom_id, unit_cost)
         VALUES ($1, $2, $3, $4, 0, $5, $6)
         RETURNING id, purchase_order_id, item_id, qty_ordered, qty_received, uom_id, unit_cost",
        id,
        po_id,
        body.item_id,
        body.qty_ordered,
        body.uom_id,
        body.unit_cost,
    )
    .fetch_one(&state.db)
    .await?;
    Ok((StatusCode::CREATED, Json(row)))
}

// ---------------------------------------------------------------------------
// Receipts (Goods Receiving)
// ---------------------------------------------------------------------------

pub async fn list_receipts(
    State(state): State<AppState>,
) -> Result<Json<Vec<Receipt>>> {
    let rows = sqlx::query_as!(
        Receipt,
        "SELECT id, receipt_number, purchase_order_id, received_by, received_at, notes
         FROM receipts ORDER BY received_at DESC"
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

pub async fn create_receipt(
    State(state): State<AppState>,
    Json(body): Json<CreateReceipt>,
) -> Result<(StatusCode, Json<Receipt>)> {
    let count = sqlx::query_scalar!("SELECT COUNT(*) FROM receipts")
        .fetch_one(&state.db)
        .await?
        .unwrap_or(0);
    let receipt_number = format!("REC-{}-{:04}", chrono::Utc::now().format("%Y"), count + 1);
    let receipt_id = Uuid::new_v4();

    let row = sqlx::query_as!(
        Receipt,
        "INSERT INTO receipts (id, receipt_number, purchase_order_id, notes)
         VALUES ($1, $2, $3, $4)
         RETURNING id, receipt_number, purchase_order_id, received_by, received_at, notes",
        receipt_id,
        receipt_number,
        body.purchase_order_id,
        body.notes,
    )
    .fetch_one(&state.db)
    .await?;

    for line in &body.lines {
        let line_id = Uuid::new_v4();
        sqlx::query!(
            "INSERT INTO receipt_lines
                 (id, receipt_id, po_line_id, item_id, qty_received, uom_id, lot_number, expiry_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
            line_id,
            receipt_id,
            line.po_line_id,
            line.item_id,
            line.qty_received,
            line.uom_id,
            line.lot_number,
            line.expiry_date,
        )
        .execute(&state.db)
        .await?;

        // Update qty_received on PO line
        sqlx::query!(
            "UPDATE purchase_order_lines SET qty_received = qty_received + $1 WHERE id = $2",
            line.qty_received,
            line.po_line_id,
        )
        .execute(&state.db)
        .await?;

        // Upsert inventory balance
        sqlx::query!(
            r#"INSERT INTO inventory (id, item_id, qty_available, qty_reserved, uom_id, lot_number)
               VALUES (gen_random_uuid(), $1, $2, 0, $3, $4)
               ON CONFLICT (item_id)
               DO UPDATE SET qty_available = inventory.qty_available + $2,
                             last_updated = NOW()"#,
            line.item_id,
            line.qty_received,
            line.uom_id,
            line.lot_number,
        )
        .execute(&state.db)
        .await?;

        // Inventory transaction
        sqlx::query!(
            "INSERT INTO inventory_transactions
                 (id, item_id, transaction_type, qty, uom_id, lot_number, reference_type, reference_id)
             VALUES (gen_random_uuid(), $1, 'receipt', $2, $3, $4, 'receipt', $5)",
            line.item_id,
            line.qty_received,
            line.uom_id,
            line.lot_number,
            receipt_id,
        )
        .execute(&state.db)
        .await?;
    }

    // If all PO lines fully received → mark PO received
    let open_lines = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM purchase_order_lines
         WHERE purchase_order_id = $1 AND qty_received < qty_ordered",
        body.purchase_order_id
    )
    .fetch_one(&state.db)
    .await?
    .unwrap_or(0);

    let new_status = if open_lines == 0 { "received" } else { "partially_received" };
    sqlx::query!(
        "UPDATE purchase_orders SET status = $2 WHERE id = $1",
        body.purchase_order_id,
        new_status,
    )
    .execute(&state.db)
    .await?;

    Ok((StatusCode::CREATED, Json(row)))
}

pub async fn list_receipt_lines(
    State(state): State<AppState>,
    Path(receipt_id): Path<Uuid>,
) -> Result<Json<Vec<ReceiptLine>>> {
    let rows = sqlx::query_as!(
        ReceiptLine,
        "SELECT id, receipt_id, po_line_id, item_id, qty_received, uom_id, lot_number, expiry_date, qc_status
         FROM receipt_lines WHERE receipt_id = $1",
        receipt_id
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}
