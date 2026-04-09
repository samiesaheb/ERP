use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    middleware::rbac::{require_role, SALES_ROLES},
    state::AppState,
};
use domain::{Claims, CreateSalesOrder, CreateSalesOrderLine, SalesOrder, SalesOrderLine, UpdateSalesOrder};

#[derive(Deserialize)]
pub struct SoQuery {
    pub status:      Option<String>,
    pub customer_id: Option<Uuid>,
}

pub async fn list_sales_orders(
    State(state): State<AppState>,
    Query(q): Query<SoQuery>,
) -> Result<Json<Vec<SalesOrder>>> {
    let rows = match (q.status.as_deref(), q.customer_id) {
        (Some(s), Some(cid)) => {
            sqlx::query_as!(
                SalesOrder,
                "SELECT id, order_number, customer_id, country_id, status, artwork_status,
                        fda_required, fda_status, total_pieces, order_date, required_date, notes, created_at
                 FROM sales_orders
                 WHERE status = $1 AND customer_id = $2
                 ORDER BY created_at DESC",
                s, cid
            )
            .fetch_all(&state.db)
            .await?
        }
        (Some(s), None) => {
            sqlx::query_as!(
                SalesOrder,
                "SELECT id, order_number, customer_id, country_id, status, artwork_status,
                        fda_required, fda_status, total_pieces, order_date, required_date, notes, created_at
                 FROM sales_orders WHERE status = $1 ORDER BY created_at DESC",
                s
            )
            .fetch_all(&state.db)
            .await?
        }
        (None, Some(cid)) => {
            sqlx::query_as!(
                SalesOrder,
                "SELECT id, order_number, customer_id, country_id, status, artwork_status,
                        fda_required, fda_status, total_pieces, order_date, required_date, notes, created_at
                 FROM sales_orders WHERE customer_id = $1 ORDER BY created_at DESC",
                cid
            )
            .fetch_all(&state.db)
            .await?
        }
        (None, None) => {
            sqlx::query_as!(
                SalesOrder,
                "SELECT id, order_number, customer_id, country_id, status, artwork_status,
                        fda_required, fda_status, total_pieces, order_date, required_date, notes, created_at
                 FROM sales_orders ORDER BY created_at DESC"
            )
            .fetch_all(&state.db)
            .await?
        }
    };
    Ok(Json(rows))
}

pub async fn get_sales_order(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<SalesOrder>> {
    let row = sqlx::query_as!(
        SalesOrder,
        "SELECT id, order_number, customer_id, country_id, status, artwork_status,
                fda_required, fda_status, total_pieces, order_date, required_date, notes, created_at
         FROM sales_orders WHERE id = $1",
        id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Sales order {id} not found")))?;
    Ok(Json(row))
}

pub async fn create_sales_order(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Json(body): Json<CreateSalesOrder>,
) -> Result<(StatusCode, Json<SalesOrder>)> {
    require_role(&claims, SALES_ROLES)?;
    let id = Uuid::new_v4();
    let count = sqlx::query_scalar!("SELECT COUNT(*) FROM sales_orders")
        .fetch_one(&state.db)
        .await?
        .unwrap_or(0);
    let order_number = format!("SO-{}-{:04}", chrono::Utc::now().format("%Y"), count + 1);

    let fda_status: Option<String> = if body.fda_required {
        Some("pending".to_string())
    } else {
        None
    };

    let row = sqlx::query_as!(
        SalesOrder,
        "INSERT INTO sales_orders
             (id, order_number, customer_id, country_id, fda_required, fda_status,
              total_pieces, order_date, required_date, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, order_number, customer_id, country_id, status, artwork_status,
                   fda_required, fda_status, total_pieces, order_date, required_date, notes, created_at",
        id,
        order_number,
        body.customer_id,
        body.country_id,
        body.fda_required,
        fda_status,
        body.total_pieces,
        body.order_date,
        body.required_date,
        body.notes,
    )
    .fetch_one(&state.db)
    .await?;
    Ok((StatusCode::CREATED, Json(row)))
}

fn validate_so_transition(from: &str, to: &str) -> Result<()> {
    let allowed: &[&str] = match from {
        "draft"         => &["confirmed", "cancelled"],
        "confirmed"     => &["in_production", "cancelled"],
        "in_production" => &["shipped", "cancelled"],
        "shipped"       => &["invoiced"],
        _               => &[],
    };
    if allowed.contains(&to) {
        Ok(())
    } else {
        Err(AppError::Unprocessable(format!(
            "Cannot transition sales order from '{}' to '{}'", from, to
        )))
    }
}

pub async fn update_sales_order(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateSalesOrder>,
) -> Result<Json<SalesOrder>> {
    require_role(&claims, SALES_ROLES)?;
    let existing = sqlx::query_as!(
        SalesOrder,
        "SELECT id, order_number, customer_id, country_id, status, artwork_status,
                fda_required, fda_status, total_pieces, order_date, required_date, notes, created_at
         FROM sales_orders WHERE id = $1",
        id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Sales order {id} not found")))?;

    if let Some(ref next) = body.status {
        validate_so_transition(&existing.status, next)?;
    }

    let new_status = body.status.unwrap_or(existing.status);
    let new_artwork = body.artwork_status.or(existing.artwork_status);
    let new_fda = body.fda_status.or(existing.fda_status);
    let new_pieces = body.total_pieces.or(existing.total_pieces);
    let new_required = body.required_date.or(existing.required_date);
    let new_notes = body.notes.or(existing.notes);

    let row = sqlx::query_as!(
        SalesOrder,
        "UPDATE sales_orders
         SET status = $2, artwork_status = $3, fda_status = $4,
             total_pieces = $5, required_date = $6, notes = $7
         WHERE id = $1
         RETURNING id, order_number, customer_id, country_id, status, artwork_status,
                   fda_required, fda_status, total_pieces, order_date, required_date, notes, created_at",
        id,
        new_status,
        new_artwork,
        new_fda,
        new_pieces,
        new_required,
        new_notes,
    )
    .fetch_one(&state.db)
    .await?;
    Ok(Json(row))
}

// ---------------------------------------------------------------------------
// Sales Order Lines
// ---------------------------------------------------------------------------

pub async fn list_so_lines(
    State(state): State<AppState>,
    Path(so_id): Path<Uuid>,
) -> Result<Json<Vec<SalesOrderLine>>> {
    let rows = sqlx::query_as!(
        SalesOrderLine,
        "SELECT id, sales_order_id, item_id, qty_ordered, uom_id, unit_price, notes
         FROM sales_order_lines WHERE sales_order_id = $1 ORDER BY id",
        so_id
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

pub async fn create_so_line(
    State(state): State<AppState>,
    Path(so_id): Path<Uuid>,
    Json(body): Json<CreateSalesOrderLine>,
) -> Result<(StatusCode, Json<SalesOrderLine>)> {
    let id = Uuid::new_v4();
    let row = sqlx::query_as!(
        SalesOrderLine,
        "INSERT INTO sales_order_lines (id, sales_order_id, item_id, qty_ordered, uom_id, unit_price, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, sales_order_id, item_id, qty_ordered, uom_id, unit_price, notes",
        id,
        so_id,
        body.item_id,
        body.qty_ordered,
        body.uom_id,
        body.unit_price,
        body.notes,
    )
    .fetch_one(&state.db)
    .await?;
    Ok((StatusCode::CREATED, Json(row)))
}
