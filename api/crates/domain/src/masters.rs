use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ---------------------------------------------------------------------------
// Customer Type Master
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct CustomerType {
    pub id: Uuid,
    pub name: String,
}

// ---------------------------------------------------------------------------
// Country Master
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Country {
    pub id: Uuid,
    pub name: String,
    pub code: String,
}

// ---------------------------------------------------------------------------
// Customer Master
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Customer {
    pub id: Uuid,
    pub name: String,
    pub customer_type_id: Uuid,
    pub country_id: Uuid,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateCustomer {
    pub name: String,
    pub customer_type_id: Uuid,
    pub country_id: Uuid,
}

// ---------------------------------------------------------------------------
// UOM
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Uom {
    pub id: Uuid,
    pub name: String,
    pub code: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct UomConversion {
    pub id: Uuid,
    pub from_uom_id: Uuid,
    pub to_uom_id: Uuid,
    pub item_id: Option<Uuid>,
    pub factor: Decimal,
}

// ---------------------------------------------------------------------------
// Item Master
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "item_type", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum ItemType {
    Fg,
    RawMat,
    PackMat,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Item {
    pub id: Uuid,
    pub code: String,
    pub description: String,
    pub item_type: ItemType,
    pub uom_id: Uuid,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateItem {
    pub code: String,
    pub description: String,
    pub item_type: ItemType,
    pub uom_id: Uuid,
}

// ---------------------------------------------------------------------------
// Supplier Master
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "supplier_type", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum SupplierType {
    International,
    Local,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Supplier {
    pub id: Uuid,
    pub name: String,
    pub country_id: Uuid,
    pub supplier_type: SupplierType,
    pub category: String,
    pub lead_time_days: i32,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSupplier {
    pub name: String,
    pub country_id: Uuid,
    pub supplier_type: SupplierType,
    pub category: String,
    pub lead_time_days: i32,
}

// ---------------------------------------------------------------------------
// Item-Supplier Master
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ItemSupplier {
    pub id: Uuid,
    pub item_id: Uuid,
    pub supplier_id: Uuid,
    pub is_preferred: bool,
}
