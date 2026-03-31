use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    state::AppState,
};
use domain::{CreateInvoice, CreatePayment, Invoice, Payment};

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
                r#"SELECT id, invoice_number, sales_order_id, customer_id,
                          amount, due_date,
                          status AS "status: _",
                          created_at
                   FROM invoices
                   WHERE status::TEXT = $1
                   ORDER BY created_at DESC"#,
                s
            )
            .fetch_all(&state.db)
            .await?
        }
        None => {
            sqlx::query_as!(
                Invoice,
                r#"SELECT id, invoice_number, sales_order_id, customer_id,
                          amount, due_date,
                          status AS "status: _",
                          created_at
                   FROM invoices
                   ORDER BY created_at DESC"#
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

    let row = sqlx::query_as!(
        Invoice,
        r#"INSERT INTO invoices (id, invoice_number, sales_order_id, customer_id, amount, due_date)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, invoice_number, sales_order_id, customer_id,
                     amount, due_date,
                     status AS "status: _",
                     created_at"#,
        id,
        invoice_number,
        body.sales_order_id,
        body.customer_id,
        body.amount,
        body.due_date,
    )
    .fetch_one(&state.db)
    .await?;
    Ok((StatusCode::CREATED, Json(row)))
}

pub async fn create_payment(
    State(state): State<AppState>,
    Json(body): Json<CreatePayment>,
) -> Result<(StatusCode, Json<Payment>)> {
    // Verify invoice exists and get current amount
    let inv = sqlx::query!(
        "SELECT id, amount FROM invoices WHERE id = $1",
        body.invoice_id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Invoice not found".to_string()))?;

    let id = Uuid::new_v4();
    let row = sqlx::query_as!(
        Payment,
        "INSERT INTO payments (id, invoice_id, amount_paid, reference)
         VALUES ($1, $2, $3, $4)
         RETURNING id, invoice_id, amount_paid, paid_at, reference",
        id,
        body.invoice_id,
        body.amount_paid,
        body.reference,
    )
    .fetch_one(&state.db)
    .await?;

    // Calculate total paid and update invoice status
    let total_paid = sqlx::query_scalar!(
        "SELECT COALESCE(SUM(amount_paid), 0) FROM payments WHERE invoice_id = $1",
        body.invoice_id
    )
    .fetch_one(&state.db)
    .await?
    .unwrap_or_default();

    use domain::InvoiceStatus;
    let new_status = if total_paid >= inv.amount {
        InvoiceStatus::Paid
    } else if total_paid > rust_decimal::Decimal::ZERO {
        InvoiceStatus::Partial
    } else {
        InvoiceStatus::NotDue
    };

    sqlx::query!(
        r#"UPDATE invoices SET status = $2 WHERE id = $1"#,
        body.invoice_id,
        new_status as InvoiceStatus,
    )
    .execute(&state.db)
    .await?;

    Ok((StatusCode::CREATED, Json(row)))
}
