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
use domain::{ArtworkDoc, CreateSalesOrder, SalesOrder, UpdateSalesOrder};

#[derive(Deserialize)]
pub struct SoQuery {
    pub status: Option<String>,
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
                r#"SELECT id, order_number, customer_id, country_id,
                          status AS "status: _",
                          total_pieces,
                          artwork_status AS "artwork_status: _",
                          fda_required,
                          fda_status AS "fda_status: _",
                          created_at
                   FROM sales_orders
                   WHERE status::TEXT = $1 AND customer_id = $2
                   ORDER BY created_at DESC"#,
                s,
                cid
            )
            .fetch_all(&state.db)
            .await?
        }
        (Some(s), None) => {
            sqlx::query_as!(
                SalesOrder,
                r#"SELECT id, order_number, customer_id, country_id,
                          status AS "status: _",
                          total_pieces,
                          artwork_status AS "artwork_status: _",
                          fda_required,
                          fda_status AS "fda_status: _",
                          created_at
                   FROM sales_orders
                   WHERE status::TEXT = $1
                   ORDER BY created_at DESC"#,
                s
            )
            .fetch_all(&state.db)
            .await?
        }
        (None, Some(cid)) => {
            sqlx::query_as!(
                SalesOrder,
                r#"SELECT id, order_number, customer_id, country_id,
                          status AS "status: _",
                          total_pieces,
                          artwork_status AS "artwork_status: _",
                          fda_required,
                          fda_status AS "fda_status: _",
                          created_at
                   FROM sales_orders
                   WHERE customer_id = $1
                   ORDER BY created_at DESC"#,
                cid
            )
            .fetch_all(&state.db)
            .await?
        }
        (None, None) => {
            sqlx::query_as!(
                SalesOrder,
                r#"SELECT id, order_number, customer_id, country_id,
                          status AS "status: _",
                          total_pieces,
                          artwork_status AS "artwork_status: _",
                          fda_required,
                          fda_status AS "fda_status: _",
                          created_at
                   FROM sales_orders
                   ORDER BY created_at DESC"#
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
        r#"SELECT id, order_number, customer_id, country_id,
                  status AS "status: _",
                  total_pieces,
                  artwork_status AS "artwork_status: _",
                  fda_required,
                  fda_status AS "fda_status: _",
                  created_at
           FROM sales_orders WHERE id = $1"#,
        id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Sales order {id} not found")))?;
    Ok(Json(row))
}

pub async fn create_sales_order(
    State(state): State<AppState>,
    Json(body): Json<CreateSalesOrder>,
) -> Result<(StatusCode, Json<SalesOrder>)> {
    let id = Uuid::new_v4();
    // Generate order number: SO-YYYY-NNNN
    let count = sqlx::query_scalar!("SELECT COUNT(*) FROM sales_orders")
        .fetch_one(&state.db)
        .await?
        .unwrap_or(0);
    let order_number = format!("SO-{}-{:04}", chrono::Utc::now().format("%Y"), count + 1);

    let fda_status_val: Option<String> = if body.fda_required {
        Some("pending".to_string())
    } else {
        None
    };

    let row = sqlx::query_as!(
        SalesOrder,
        r#"INSERT INTO sales_orders
               (id, order_number, customer_id, country_id, total_pieces, fda_required, fda_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7::fda_status)
           RETURNING id, order_number, customer_id, country_id,
                     status AS "status: _",
                     total_pieces,
                     artwork_status AS "artwork_status: _",
                     fda_required,
                     fda_status AS "fda_status: _",
                     created_at"#,
        id,
        order_number,
        body.customer_id,
        body.country_id,
        body.total_pieces,
        body.fda_required,
        fda_status_val as _,
    )
    .fetch_one(&state.db)
    .await?;
    Ok((StatusCode::CREATED, Json(row)))
}

pub async fn update_sales_order(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateSalesOrder>,
) -> Result<Json<SalesOrder>> {
    // Fetch existing to merge
    let existing = sqlx::query_as!(
        SalesOrder,
        r#"SELECT id, order_number, customer_id, country_id,
                  status AS "status: _",
                  total_pieces,
                  artwork_status AS "artwork_status: _",
                  fda_required,
                  fda_status AS "fda_status: _",
                  created_at
           FROM sales_orders WHERE id = $1"#,
        id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Sales order {id} not found")))?;

    let new_status = body.status.unwrap_or(existing.status);
    let new_artwork = body.artwork_status.unwrap_or(existing.artwork_status);
    let new_fda = body.fda_status.or(existing.fda_status);
    let new_pieces = body.total_pieces.unwrap_or(existing.total_pieces);

    let row = sqlx::query_as!(
        SalesOrder,
        r#"UPDATE sales_orders
           SET status = $2, artwork_status = $3, fda_status = $4, total_pieces = $5
           WHERE id = $1
           RETURNING id, order_number, customer_id, country_id,
                     status AS "status: _",
                     total_pieces,
                     artwork_status AS "artwork_status: _",
                     fda_required,
                     fda_status AS "fda_status: _",
                     created_at"#,
        id,
        new_status as _,
        new_artwork as _,
        new_fda as _,
        new_pieces,
    )
    .fetch_one(&state.db)
    .await?;
    Ok(Json(row))
}

// ---------------------------------------------------------------------------
// Artwork docs
// ---------------------------------------------------------------------------

pub async fn list_artwork_docs(
    State(state): State<AppState>,
    Path(so_id): Path<Uuid>,
) -> Result<Json<Vec<ArtworkDoc>>> {
    let rows = sqlx::query_as!(
        ArtworkDoc,
        "SELECT id, sales_order_id, doc_type, file_url, uploaded_at
         FROM artwork_docs WHERE sales_order_id = $1 ORDER BY uploaded_at DESC",
        so_id
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}
