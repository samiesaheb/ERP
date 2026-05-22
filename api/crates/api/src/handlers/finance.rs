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
    handlers::company_id_from_claims,
    middleware::rbac::{require_role, FINANCE_ROLES},
    state::AppState,
};
use domain::{
    Claims, CreateInvoice, CreateInvoiceLine, CreatePayment,
    Invoice, InvoiceLine, Payment, UpdateInvoice,
};

#[derive(Deserialize)]
pub struct InvoiceQuery {
    pub status: Option<String>,
}

pub async fn list_invoices(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Query(q): Query<InvoiceQuery>,
) -> Result<Json<Vec<Invoice>>> {
    let cid = company_id_from_claims(&claims)?;
    let rows = match q.status.as_deref() {
        Some(s) => {
            sqlx::query_as::<_, Invoice>(
                "SELECT id, invoice_number, sales_order_id, customer_id, shipment_id,
                        tax_rate_id, status, issue_date, due_date, subtotal, tax, total,
                        currency, notes, created_at
                 FROM invoices WHERE company_id = $1 AND status = $2 ORDER BY created_at DESC",
            )
            .bind(cid)
            .bind(s)
            .fetch_all(&state.db)
            .await?
        }
        None => {
            sqlx::query_as::<_, Invoice>(
                "SELECT id, invoice_number, sales_order_id, customer_id, shipment_id,
                        tax_rate_id, status, issue_date, due_date, subtotal, tax, total,
                        currency, notes, created_at
                 FROM invoices WHERE company_id = $1 ORDER BY created_at DESC",
            )
            .bind(cid)
            .fetch_all(&state.db)
            .await?
        }
    };
    Ok(Json(rows))
}

pub async fn create_invoice(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Json(body): Json<CreateInvoice>,
) -> Result<(StatusCode, Json<Invoice>)> {
    require_role(&claims, FINANCE_ROLES)?;
    let cid = company_id_from_claims(&claims)?;
    let count: i64 = sqlx::query_scalar::<_, Option<i64>>("SELECT COUNT(*) FROM invoices WHERE company_id = $1")
        .bind(cid)
        .fetch_one(&state.db)
        .await?
        .unwrap_or(0);
    let invoice_number = format!("INV-{}-{:04}", chrono::Utc::now().format("%Y"), count + 1);
    let id = Uuid::new_v4();
    let tax = body.tax.unwrap_or(Decimal::ZERO);
    let currency = body.currency.unwrap_or_else(|| "USD".to_string());

    let row = sqlx::query_as::<_, Invoice>(
        "INSERT INTO invoices
             (id, company_id, invoice_number, sales_order_id, customer_id, shipment_id,
              tax_rate_id, issue_date, due_date, tax, currency, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id, invoice_number, sales_order_id, customer_id, shipment_id,
                   tax_rate_id, status, issue_date, due_date, subtotal, tax, total,
                   currency, notes, created_at",
    )
    .bind(id)
    .bind(cid)
    .bind(&invoice_number)
    .bind(body.sales_order_id)
    .bind(body.customer_id)
    .bind(body.shipment_id)
    .bind(body.tax_rate_id)
    .bind(body.issue_date)
    .bind(body.due_date)
    .bind(tax)
    .bind(&currency)
    .bind(&body.notes)
    .fetch_one(&state.db)
    .await?;
    Ok((StatusCode::CREATED, Json(row)))
}

// ---------------------------------------------------------------------------
// Invoice Lines — child table, scoped by invoice
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

    // Recompute subtotal; if invoice has a named tax rate, derive tax from rate * subtotal
    sqlx::query(
        "UPDATE invoices
         SET subtotal = lines.s,
             tax      = CASE
                          WHEN tax_rate_id IS NOT NULL
                          THEN lines.s * (SELECT rate FROM tax_rates WHERE id = invoices.tax_rate_id)
                          ELSE tax
                        END,
             total    = lines.s + CASE
                          WHEN tax_rate_id IS NOT NULL
                          THEN lines.s * (SELECT rate FROM tax_rates WHERE id = invoices.tax_rate_id)
                          ELSE tax
                        END
         FROM (SELECT COALESCE(SUM(line_total), 0) AS s FROM invoice_lines WHERE invoice_id = $1) AS lines
         WHERE invoices.id = $1",
    )
    .bind(invoice_id)
    .execute(&state.db)
    .await?;

    Ok((StatusCode::CREATED, Json(row)))
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

pub async fn list_payments(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
) -> Result<Json<Vec<Payment>>> {
    let cid = company_id_from_claims(&claims)?;
    let rows = sqlx::query_as::<_, Payment>(
        "SELECT id, payment_number, payment_type, customer_id, supplier_id,
                invoice_id, purchase_order_id, amount, currency,
                payment_date, method, reference, status, notes, created_at
         FROM payments WHERE company_id = $1 ORDER BY created_at DESC",
    )
    .bind(cid)
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

pub async fn create_payment(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Json(body): Json<CreatePayment>,
) -> Result<(StatusCode, Json<Payment>)> {
    require_role(&claims, FINANCE_ROLES)?;
    let cid = company_id_from_claims(&claims)?;
    let count: i64 = sqlx::query_scalar::<_, Option<i64>>("SELECT COUNT(*) FROM payments WHERE company_id = $1")
        .bind(cid)
        .fetch_one(&state.db)
        .await?
        .unwrap_or(0);
    let payment_number = format!("PAY-{}-{:04}", chrono::Utc::now().format("%Y"), count + 1);
    let id = Uuid::new_v4();
    let currency = body.currency.unwrap_or_else(|| "USD".to_string());

    let row = sqlx::query_as::<_, Payment>(
        "INSERT INTO payments
             (id, company_id, payment_number, payment_type, customer_id, supplier_id,
              invoice_id, purchase_order_id, amount, currency,
              payment_date, method, reference, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING id, payment_number, payment_type, customer_id, supplier_id,
                   invoice_id, purchase_order_id, amount, currency,
                   payment_date, method, reference, status, notes, created_at",
    )
    .bind(id)
    .bind(cid)
    .bind(&payment_number)
    .bind(&body.payment_type)
    .bind(body.customer_id)
    .bind(body.supplier_id)
    .bind(body.invoice_id)
    .bind(body.purchase_order_id)
    .bind(body.amount)
    .bind(&currency)
    .bind(body.payment_date)
    .bind(&body.method)
    .bind(&body.reference)
    .bind(&body.notes)
    .fetch_one(&state.db)
    .await?;

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
    axum::Extension(claims): axum::Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateInvoice>,
) -> Result<Json<Invoice>> {
    require_role(&claims, FINANCE_ROLES)?;
    let existing = sqlx::query_as::<_, Invoice>(
        "SELECT id, invoice_number, sales_order_id, customer_id, shipment_id,
                tax_rate_id, status, issue_date, due_date, subtotal, tax, total,
                currency, notes, created_at
         FROM invoices WHERE id = $1",
    )
    .bind(id)
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

    let row = sqlx::query_as::<_, Invoice>(
        "UPDATE invoices
         SET status = $2, issue_date = $3, due_date = $4, tax = $5,
             total = COALESCE(subtotal, 0) + $5, notes = $6
         WHERE id = $1
         RETURNING id, invoice_number, sales_order_id, customer_id, shipment_id,
                   tax_rate_id, status, issue_date, due_date, subtotal, tax, total,
                   currency, notes, created_at",
    )
    .bind(id)
    .bind(new_status)
    .bind(new_issue_date)
    .bind(new_due_date)
    .bind(new_tax)
    .bind(new_notes)
    .fetch_one(&state.db)
    .await?;
    Ok(Json(row))
}

pub async fn get_invoice(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Invoice>> {
    let row = sqlx::query_as::<_, Invoice>(
        "SELECT id, invoice_number, sales_order_id, customer_id, shipment_id,
                tax_rate_id, status, issue_date, due_date, subtotal, tax, total,
                currency, notes, created_at
         FROM invoices WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Invoice {id} not found")))?;
    Ok(Json(row))
}
