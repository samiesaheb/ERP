use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::{error::Result, state::AppState};
use domain::{
    Country, CreateCustomer, UpdateCustomer, CreateItem, UpdateItem, CreateItemSupplier, CreateItemUomConversion, CreateSupplier, UpdateSupplier,
    Customer, CustomerType, Item, ItemSupplier, ItemUomConversion, Supplier, Uom,
};

// ---------------------------------------------------------------------------
// Customer Types
// ---------------------------------------------------------------------------

pub async fn list_customer_types(
    State(state): State<AppState>,
) -> Result<Json<Vec<CustomerType>>> {
    let rows = sqlx::query_as!(
        CustomerType,
        "SELECT id, name, created_at FROM customer_types ORDER BY name"
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

// ---------------------------------------------------------------------------
// Countries
// ---------------------------------------------------------------------------

pub async fn list_countries(State(state): State<AppState>) -> Result<Json<Vec<Country>>> {
    let rows =
        sqlx::query_as!(Country, "SELECT id, name, code, created_at FROM countries ORDER BY name")
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
        "SELECT id, name, customer_type_id, country_id, email, phone, address, created_at
         FROM customers ORDER BY name"
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

pub async fn create_customer(
    State(state): State<AppState>,
    Json(body): Json<CreateCustomer>,
) -> Result<(StatusCode, Json<Customer>)> {
    let id = Uuid::new_v4();
    let row = sqlx::query_as!(
        Customer,
        "INSERT INTO customers (id, name, customer_type_id, country_id, email, phone, address)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, name, customer_type_id, country_id, email, phone, address, created_at",
        id,
        body.name,
        body.customer_type_id,
        body.country_id,
        body.email,
        body.phone,
        body.address,
    )
    .fetch_one(&state.db)
    .await?;
    Ok((StatusCode::CREATED, Json(row)))
}

pub async fn update_customer(
    State(state): State<AppState>,
    Path(customer_id): Path<Uuid>,
    Json(body): Json<UpdateCustomer>,
) -> Result<Json<Customer>> {
    let row = sqlx::query_as!(
        Customer,
        r#"UPDATE customers SET
             name             = COALESCE($2, name),
             customer_type_id = COALESCE($3, customer_type_id),
             country_id       = COALESCE($4, country_id),
             email            = COALESCE($5, email),
             phone            = COALESCE($6, phone),
             address          = COALESCE($7, address)
           WHERE id = $1
           RETURNING id, name, customer_type_id, country_id, email, phone, address, created_at"#,
        customer_id,
        body.name,
        body.customer_type_id,
        body.country_id,
        body.email,
        body.phone,
        body.address,
    )
    .fetch_one(&state.db)
    .await?;
    Ok(Json(row))
}

// ---------------------------------------------------------------------------
// UOMs
// ---------------------------------------------------------------------------

pub async fn list_uoms(State(state): State<AppState>) -> Result<Json<Vec<Uom>>> {
    let rows = sqlx::query_as!(Uom, "SELECT id, code, description FROM uoms ORDER BY code")
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
    pub search:    Option<String>,
}

pub async fn list_items(
    State(state): State<AppState>,
    Query(q): Query<ItemQuery>,
) -> Result<Json<Vec<Item>>> {
    let rows = match (q.item_type.as_deref(), q.search.as_deref()) {
        (Some(it), Some(s)) => {
            let pattern = format!("%{s}%");
            sqlx::query_as!(
                Item,
                "SELECT id, item_code, description, item_type, uom_id, fda_required, is_active,
                        created_at, reorder_point, abc_class, lifecycle_status
                 FROM items
                 WHERE item_type = $1 AND (item_code ILIKE $2 OR description ILIKE $2)
                 ORDER BY item_code",
                it,
                pattern
            )
            .fetch_all(&state.db)
            .await?
        }
        (Some(it), None) => {
            sqlx::query_as!(
                Item,
                "SELECT id, item_code, description, item_type, uom_id, fda_required, is_active,
                        created_at, reorder_point, abc_class, lifecycle_status
                 FROM items WHERE item_type = $1 ORDER BY item_code",
                it
            )
            .fetch_all(&state.db)
            .await?
        }
        (None, Some(s)) => {
            let pattern = format!("%{s}%");
            sqlx::query_as!(
                Item,
                "SELECT id, item_code, description, item_type, uom_id, fda_required, is_active,
                        created_at, reorder_point, abc_class, lifecycle_status
                 FROM items WHERE item_code ILIKE $1 OR description ILIKE $1
                 ORDER BY item_code",
                pattern
            )
            .fetch_all(&state.db)
            .await?
        }
        (None, None) => {
            sqlx::query_as!(
                Item,
                "SELECT id, item_code, description, item_type, uom_id, fda_required, is_active,
                        created_at, reorder_point, abc_class, lifecycle_status
                 FROM items ORDER BY item_code"
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
        "INSERT INTO items (id, item_code, description, item_type, uom_id, fda_required, is_active,
                            reorder_point, abc_class)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, $8)
         RETURNING id, item_code, description, item_type, uom_id, fda_required, is_active,
                   created_at, reorder_point, abc_class, lifecycle_status",
        id,
        body.item_code,
        body.description,
        body.item_type,
        body.uom_id,
        body.fda_required,
        body.reorder_point,
        body.abc_class,
    )
    .fetch_one(&state.db)
    .await?;
    Ok((StatusCode::CREATED, Json(row)))
}

pub async fn update_item(
    State(state): State<AppState>,
    Path(item_id): Path<Uuid>,
    Json(body): Json<UpdateItem>,
) -> Result<Json<Item>> {
    let row = sqlx::query_as!(
        Item,
        r#"UPDATE items SET
             description      = COALESCE($2, description),
             fda_required     = COALESCE($3, fda_required),
             is_active        = COALESCE($4, is_active),
             reorder_point    = COALESCE($5, reorder_point),
             abc_class        = COALESCE($6, abc_class),
             lifecycle_status = COALESCE($7, lifecycle_status)
           WHERE id = $1
           RETURNING id, item_code, description, item_type, uom_id, fda_required, is_active,
                     created_at, reorder_point, abc_class, lifecycle_status"#,
        item_id,
        body.description,
        body.fda_required,
        body.is_active,
        body.reorder_point,
        body.abc_class,
        body.lifecycle_status,
    )
    .fetch_one(&state.db)
    .await?;
    Ok(Json(row))
}

// ---------------------------------------------------------------------------
// Suppliers
// ---------------------------------------------------------------------------

pub async fn list_suppliers(State(state): State<AppState>) -> Result<Json<Vec<Supplier>>> {
    let rows = sqlx::query_as!(
        Supplier,
        "SELECT id, name, supplier_type, country_id, email, phone, address, payment_terms, created_at
         FROM suppliers ORDER BY name"
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
        "INSERT INTO suppliers (id, name, supplier_type, country_id, email, phone, address, payment_terms)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, name, supplier_type, country_id, email, phone, address, payment_terms, created_at",
        id,
        body.name,
        body.supplier_type,
        body.country_id,
        body.email,
        body.phone,
        body.address,
        body.payment_terms,
    )
    .fetch_one(&state.db)
    .await?;
    Ok((StatusCode::CREATED, Json(row)))
}

pub async fn update_supplier(
    State(state): State<AppState>,
    Path(supplier_id): Path<Uuid>,
    Json(body): Json<UpdateSupplier>,
) -> Result<Json<Supplier>> {
    let row = sqlx::query_as!(
        Supplier,
        r#"UPDATE suppliers SET
             name          = COALESCE($2, name),
             supplier_type = COALESCE($3, supplier_type),
             country_id    = COALESCE($4, country_id),
             email         = COALESCE($5, email),
             phone         = COALESCE($6, phone),
             address       = COALESCE($7, address),
             payment_terms = COALESCE($8, payment_terms)
           WHERE id = $1
           RETURNING id, name, supplier_type, country_id, email, phone, address, payment_terms, created_at"#,
        supplier_id,
        body.name,
        body.supplier_type,
        body.country_id,
        body.email,
        body.phone,
        body.address,
        body.payment_terms,
    )
    .fetch_one(&state.db)
    .await?;
    Ok(Json(row))
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
        "SELECT id, item_id, supplier_id, supplier_item_code, lead_time_days, unit_cost, preferred
         FROM item_supplier WHERE item_id = $1",
        item_id
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

pub async fn create_item_supplier(
    State(state): State<AppState>,
    Path(item_id): Path<Uuid>,
    Json(body): Json<CreateItemSupplier>,
) -> Result<(StatusCode, Json<ItemSupplier>)> {
    let id = Uuid::new_v4();
    let row = sqlx::query_as!(
        ItemSupplier,
        "INSERT INTO item_supplier (id, item_id, supplier_id, supplier_item_code, lead_time_days, unit_cost, preferred)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, item_id, supplier_id, supplier_item_code, lead_time_days, unit_cost, preferred",
        id,
        item_id,
        body.supplier_id,
        body.supplier_item_code,
        body.lead_time_days,
        body.unit_cost,
        body.preferred,
    )
    .fetch_one(&state.db)
    .await?;
    Ok((StatusCode::CREATED, Json(row)))
}

// ---------------------------------------------------------------------------
// Item-UOM Conversions
// ---------------------------------------------------------------------------

pub async fn list_item_uom_conversions(
    State(state): State<AppState>,
    Path(item_id): Path<Uuid>,
) -> Result<Json<Vec<ItemUomConversion>>> {
    let rows = sqlx::query_as!(
        ItemUomConversion,
        "SELECT id, item_id, from_uom_id, to_uom_id, conversion_factor
         FROM item_uom_conversions WHERE item_id = $1",
        item_id
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

pub async fn create_item_uom_conversion(
    State(state): State<AppState>,
    Path(item_id): Path<Uuid>,
    Json(body): Json<CreateItemUomConversion>,
) -> Result<(StatusCode, Json<ItemUomConversion>)> {
    let id = Uuid::new_v4();
    let row = sqlx::query_as!(
        ItemUomConversion,
        "INSERT INTO item_uom_conversions (id, item_id, from_uom_id, to_uom_id, conversion_factor)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, item_id, from_uom_id, to_uom_id, conversion_factor",
        id,
        item_id,
        body.from_uom_id,
        body.to_uom_id,
        body.conversion_factor,
    )
    .fetch_one(&state.db)
    .await?;
    Ok((StatusCode::CREATED, Json(row)))
}
