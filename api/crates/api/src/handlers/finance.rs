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
use domain::{
    CreateInvoice, CreateInvoiceLine, CreatePayment,
    Invoice, InvoiceLine, Payment, UpdateInvoice,
};

#[derive(Deserialize)]
pub struct InvoiceQuery {
    pub status: Option<String>,
}

pub async fn list_invoices(
    State(state): State<AppState>,
    Query(q): Query<InvoiceQuery>,
) -> Result<Json<Vec<Invoice>>> {
    let rows = match q.status.as_deref() {
        Some(s) => {
            sqlx::query_as!(
                Invoice,
                "SELECT id, invoice_number, sales_order_id, customer_id, shipment_id,
                        status, issue_date, due_date, subtotal, tax, total, currency, notes, created_at
                 FROM invoices WHERE status = $1 ORDER BY created_at DESC",
                s
            )
            .fetch_all(&state.db)
            .await?
        }
        None => {
            sqlx::query_as!(
                Invoice,
                "SELECT id, invoice_number, sales_order_id, customer_id, shipment_id,
                        status, issue_date, due_date, subtotal, tax, total, currency, notes, created_at
                 FROM invoices ORDER BY created_at DESC"
            )
            .fetch_all(&state.db)
            .await?
        }
    };
    Ok(Json(rows))
}

pub async fn create_invoice(
    State(state): State<AppState>,
    Json(body): Json<CreateInvoice>,
) -> Result<(StatusCode, Json<Invoice>)> {
    let count = sqlx::query_scalar!("SELECT COUNT(*) FROM invoices")
        .fetch_one(&state.db)
        .await?
        .unwrap_or(0);
    let invoice_number = format!("INV-{}-{:04}", chrono::Utc::now().format("%Y"), count + 1);
    let id = Uuid::new_v4();
    let tax = body.tax.unwrap_or(Decimal::ZERO);
    let currency = body.currency.unwrap_or_else(|| "USD".to_string());

    let row = sqlx::query_as!(
        Invoice,
        "INSERT INTO invoices
             (id, invoice_number, sales_order_id, customer_id, shipment_id, issue_date, due_date, tax, currency, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, invoice_number, sales_order_id, customer_id, shipment_id,
                   status, issue_date, due_date, subtotal, tax, total, currency, notes, created_at",
        id,
        invoice_number,
        body.sales_order_id,
        body.customer_id,
        body.shipment_id,
        body.issue_date,
        body.due_date,
        tax,
        currency,
        body.notes,
    )
    .fetch_one(&state.db)
    .await?;
    Ok((StatusCode::CREATED, Json(row)))
}

// ---------------------------------------------------------------------------
// Invoice Lines
// ---------------------------------------------------------------------------

pub async fn list_invoice_lines(
    State(state): State<AppState>,
    Path(invoice_id): Path<Uuid>,
) -> Result<Json<Vec<InvoiceLine>>> {
    let rows = sqlx::query_as!(
        InvoiceLine,
        "SELECT id, invoice_id, item_id, description, qty, uom_id, unit_price, line_total
         FROM invoice_lines WHERE invoice_id = $1 ORDER BY id",
        invoice_id
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

pub async fn create_invoice_line(
    State(state): State<AppState>,
    Path(invoice_id): Path<Uuid>,
    Json(body): Json<CreateInvoiceLine>,
) -> Result<(StatusCode, Json<InvoiceLine>)> {
    let id = Uuid::new_v4();
    let line_total = body.qty * body.unit_price;

    let row = sqlx::query_as!(
        InvoiceLine,
        "INSERT INTO invoice_lines (id, invoice_id, item_id, description, qty, uom_id, unit_price, line_total)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, invoice_id, item_id, description, qty, uom_id, unit_price, line_total",
        id,
        invoice_id,
        body.item_id,
        body.description,
        body.qty,
        body.uom_id,
        body.unit_price,
        line_total,
    )
    .fetch_one(&state.db)
    .await?;

    // Recalculate subtotal and total on invoice
    sqlx::query!(
        "UPDATE invoices
         SET subtotal = (SELECT COALESCE(SUM(line_total), 0) FROM invoice_lines WHERE invoice_id = $1),
             total    = (SELECT COALESCE(SUM(line_total), 0) FROM invoice_lines WHERE invoice_id = $1) + tax
         WHERE id = $1",
        invoice_id,
    )
    .execute(&state.db)
    .await?;

    Ok((StatusCode::CREATED, Json(row)))
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

pub async fn list_payments(State(state): State<AppState>) -> Result<Json<Vec<Payment>>> {
    let rows = sqlx::query_as!(
        Payment,
        "SELECT id, payment_number, payment_type, customer_id, supplier_id,
                invoice_id, purchase_order_id, amount, currency,
                payment_date, method, reference, status, notes, created_at
         FROM payments ORDER BY created_at DESC"
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

pub async fn create_payment(
    State(state): State<AppState>,
    Json(body): Json<CreatePayment>,
) -> Result<(StatusCode, Json<Payment>)> {
    let count = sqlx::query_scalar!("SELECT COUNT(*) FROM payments")
        .fetch_one(&state.db)
        .await?
        .unwrap_or(0);
    let payment_number = format!("PAY-{}-{:04}", chrono::Utc::now().format("%Y"), count + 1);
    let id = Uuid::new_v4();
    let currency = body.currency.unwrap_or_else(|| "USD".to_string());

    let row = sqlx::query_as!(
        Payment,
        "INSERT INTO payments
             (id, payment_number, payment_type, customer_id, supplier_id,
              invoice_id, purchase_order_id, amount, currency,
              payment_date, method, reference, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING id, payment_number, payment_type, customer_id, supplier_id,
                   invoice_id, purchase_order_id, amount, currency,
                   payment_date, method, reference, status, notes, created_at",
        id,
        payment_number,
        body.payment_type,
        body.customer_id,
        body.supplier_id,
        body.invoice_id,
        body.purchase_order_id,
        body.amount,
        currency,
        body.payment_date,
        body.method,
        body.reference,
        body.notes,
    )
    .fetch_one(&state.db)
    .await?;

    // Update invoice status if linked
    if let Some(invoice_id) = body.invoice_id {
        let inv = sqlx::query!(
            "SELECT total FROM invoices WHERE id = $1",
            invoice_id
        )
        .fetch_optional(&state.db)
        .await?;

        if let Some(inv) = inv {
            let total_paid: Decimal = sqlx::query_scalar!(
                "SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = $1 AND status = 'cleared'",
                invoice_id
            )
            .fetch_one(&state.db)
            .await?
            .unwrap_or_default();

            let new_status = match inv.total {
                Some(t) if total_paid >= t => "paid",
                Some(_) if total_paid > Decimal::ZERO => "partially_paid",
                _ => "sent",
            };
            sqlx::query!("UPDATE invoices SET status = $2 WHERE id = $1", invoice_id, new_status)
                .execute(&state.db)
                .await?;
        }
    }

    Ok((StatusCode::CREATED, Json(row)))
}

fn validate_invoice_transition(from: &str, to: &str) -> Result<()> {
    let allowed: &[&str] = match from {
        "draft"          => &["sent", "cancelled"],
        "sent"           => &["partially_paid", "paid", "overdue", "cancelled"],
        "partially_paid" => &["paid", "overdue", "cancelled"],
        "overdue"        => &["paid", "cancelled"],
        _                => &[],
    };
    if allowed.contains(&to) {
        Ok(())
    } else {
        Err(AppError::Unprocessable(format!(
            "Cannot transition invoice from '{}' to '{}'", from, to
        )))
    }
}

pub async fn update_invoice(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateInvoice>,
) -> Result<Json<Invoice>> {
    let existing = sqlx::query_as!(
        Invoice,
        "SELECT id, invoice_number, sales_order_id, customer_id, shipment_id,
                status, issue_date, due_date, subtotal, tax, total, currency, notes, created_at
         FROM invoices WHERE id = $1",
        id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Invoice {id} not found")))?;

    if let Some(ref next) = body.status {
        validate_invoice_transition(&existing.status, next)?;
    }

    let new_status = body.status.unwrap_or(existing.status);
    let new_issue_date = body.issue_date.or(existing.issue_date);
    let new_due_date = body.due_date.or(existing.due_date);
    let new_tax = body.tax.unwrap_or(existing.tax);
    let new_notes = body.notes.or(existing.notes);

    let row = sqlx::query_as!(
        Invoice,
        "UPDATE invoices
         SET status = $2, issue_date = $3, due_date = $4, tax = $5,
             total = COALESCE(subtotal, 0) + $5, notes = $6
         WHERE id = $1
         RETURNING id, invoice_number, sales_order_id, customer_id, shipment_id,
                   status, issue_date, due_date, subtotal, tax, total, currency, notes, created_at",
        id,
        new_status,
        new_issue_date,
        new_due_date,
        new_tax,
        new_notes,
    )
    .fetch_one(&state.db)
    .await?;
    Ok(Json(row))
}

pub async fn get_invoice(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Invoice>> {
    let row = sqlx::query_as!(
        Invoice,
        "SELECT id, invoice_number, sales_order_id, customer_id, shipment_id,
                status, issue_date, due_date, subtotal, tax, total, currency, notes, created_at
         FROM invoices WHERE id = $1",
        id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Invoice {id} not found")))?;
    Ok(Json(row))
}
