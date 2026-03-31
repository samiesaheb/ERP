use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::{error::Result, state::AppState};
use domain::{
    Country, CreateItem, CreateSupplier, Customer, CustomerType, Item, ItemSupplier,
    Supplier, Uom,
};

// ---------------------------------------------------------------------------
// Customer Types
// ---------------------------------------------------------------------------

pub async fn list_customer_types(
    State(state): State<AppState>,
) -> Result<Json<Vec<CustomerType>>> {
    let rows = sqlx::query_as!(CustomerType, "SELECT id, name FROM customer_types ORDER BY name")
        .fetch_all(&state.db)
        .await?;
    Ok(Json(rows))
}

// ---------------------------------------------------------------------------
// Countries
// ---------------------------------------------------------------------------

pub async fn list_countries(State(state): State<AppState>) -> Result<Json<Vec<Country>>> {
    let rows = sqlx::query_as!(Country, "SELECT id, name, code FROM countries ORDER BY name")
        .fetch_all(&state.db)
        .await?;
    Ok(Json(rows))
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

pub async fn list_customers(State(state): State<AppState>) -> Result<Json<Vec<Customer>>> {
    let rows = sqlx::query_as!(
        Customer,
        "SELECT id, name, customer_type_id, country_id, created_at FROM customers ORDER BY name"
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

// ---------------------------------------------------------------------------
// UOMs
// ---------------------------------------------------------------------------

pub async fn list_uoms(State(state): State<AppState>) -> Result<Json<Vec<Uom>>> {
    let rows =
        sqlx::query_as!(Uom, "SELECT id, name, code FROM uoms ORDER BY name")
            .fetch_all(&state.db)
            .await?;
    Ok(Json(rows))
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct ItemQuery {
    pub item_type: Option<String>,
    pub search: Option<String>,
}

pub async fn list_items(
    State(state): State<AppState>,
    Query(q): Query<ItemQuery>,
) -> Result<Json<Vec<Item>>> {
    // Build query dynamically depending on filters
    let rows = match (q.item_type.as_deref(), q.search.as_deref()) {
        (Some(it), Some(s)) => {
            let pattern = format!("%{s}%");
            sqlx::query_as!(
                Item,
                r#"SELECT id, code, description,
                          item_type AS "item_type: _",
                          uom_id, is_active
                   FROM items
                   WHERE item_type::TEXT = $1
                     AND (code ILIKE $2 OR description ILIKE $2)
                   ORDER BY code"#,
                it,
                pattern
            )
            .fetch_all(&state.db)
            .await?
        }
        (Some(it), None) => {
            sqlx::query_as!(
                Item,
                r#"SELECT id, code, description,
                          item_type AS "item_type: _",
                          uom_id, is_active
                   FROM items
                   WHERE item_type::TEXT = $1
                   ORDER BY code"#,
                it
            )
            .fetch_all(&state.db)
            .await?
        }
        (None, Some(s)) => {
            let pattern = format!("%{s}%");
            sqlx::query_as!(
                Item,
                r#"SELECT id, code, description,
                          item_type AS "item_type: _",
                          uom_id, is_active
                   FROM items
                   WHERE code ILIKE $1 OR description ILIKE $1
                   ORDER BY code"#,
                pattern
            )
            .fetch_all(&state.db)
            .await?
        }
        (None, None) => {
            sqlx::query_as!(
                Item,
                r#"SELECT id, code, description,
                          item_type AS "item_type: _",
                          uom_id, is_active
                   FROM items
                   ORDER BY code"#
            )
            .fetch_all(&state.db)
            .await?
        }
    };
    Ok(Json(rows))
}

pub async fn create_item(
    State(state): State<AppState>,
    Json(body): Json<CreateItem>,
) -> Result<(StatusCode, Json<Item>)> {
    let id = Uuid::new_v4();
    let row = sqlx::query_as!(
        Item,
        r#"INSERT INTO items (id, code, description, item_type, uom_id, is_active)
           VALUES ($1, $2, $3, $4, $5, TRUE)
           RETURNING id, code, description,
                     item_type AS "item_type: _",
                     uom_id, is_active"#,
        id,
        body.code,
        body.description,
        body.item_type as _,
        body.uom_id,
    )
    .fetch_one(&state.db)
    .await?;
    Ok((StatusCode::CREATED, Json(row)))
}

// ---------------------------------------------------------------------------
// Suppliers
// ---------------------------------------------------------------------------

pub async fn list_suppliers(State(state): State<AppState>) -> Result<Json<Vec<Supplier>>> {
    let rows = sqlx::query_as!(
        Supplier,
        r#"SELECT id, name, country_id,
                  supplier_type AS "supplier_type: _",
                  category, lead_time_days, is_active
           FROM suppliers
           ORDER BY name"#
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

pub async fn create_supplier(
    State(state): State<AppState>,
    Json(body): Json<CreateSupplier>,
) -> Result<(StatusCode, Json<Supplier>)> {
    let id = Uuid::new_v4();
    let row = sqlx::query_as!(
        Supplier,
        r#"INSERT INTO suppliers (id, name, country_id, supplier_type, category, lead_time_days, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, TRUE)
           RETURNING id, name, country_id,
                     supplier_type AS "supplier_type: _",
                     category, lead_time_days, is_active"#,
        id,
        body.name,
        body.country_id,
        body.supplier_type as _,
        body.category,
        body.lead_time_days,
    )
    .fetch_one(&state.db)
    .await?;
    Ok((StatusCode::CREATED, Json(row)))
}

// ---------------------------------------------------------------------------
// Item-Supplier
// ---------------------------------------------------------------------------

pub async fn list_item_suppliers(
    State(state): State<AppState>,
    Path(item_id): Path<Uuid>,
) -> Result<Json<Vec<ItemSupplier>>> {
    let rows = sqlx::query_as!(
        ItemSupplier,
        "SELECT id, item_id, supplier_id, is_preferred FROM item_suppliers WHERE item_id = $1",
        item_id
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}
