use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ---------------------------------------------------------------------------
// Customer Type
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct CustomerType {
    pub id:         Uuid,
    pub name:       String,
    pub created_at: DateTime<Utc>,
}

// ---------------------------------------------------------------------------
// Country
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Country {
    pub id:         Uuid,
    pub name:       String,
    pub code:       String,    // CHAR(3), e.g. "THA"
    pub created_at: DateTime<Utc>,
}

// ---------------------------------------------------------------------------
// Customer
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Customer {
    pub id:               Uuid,
    pub name:             String,
    pub customer_type_id: Uuid,
    pub country_id:       Uuid,
    pub email:            Option<String>,
    pub phone:            Option<String>,
    pub address:          Option<String>,
    pub created_at:       DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateCustomer {
    pub name:             String,
    pub customer_type_id: Uuid,
    pub country_id:       Uuid,
    pub email:            Option<String>,
    pub phone:            Option<String>,
    pub address:          Option<String>,
}

// ---------------------------------------------------------------------------
// UOM
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Uom {
    pub id:          Uuid,
    pub code:        String,           // VARCHAR(20), e.g. "KG"
    pub description: Option<String>,
}

// ---------------------------------------------------------------------------
// Supplier
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Supplier {
    pub id:            Uuid,
    pub name:          String,
    pub supplier_type: String,        // local / international
    pub country_id:    Uuid,
    pub email:         Option<String>,
    pub phone:         Option<String>,
    pub address:       Option<String>,
    pub payment_terms: Option<String>,
    pub created_at:    DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSupplier {
    pub name:          String,
    pub supplier_type: String,
    pub country_id:    Uuid,
    pub email:         Option<String>,
    pub phone:         Option<String>,
    pub address:       Option<String>,
    pub payment_terms: Option<String>,
}

// ---------------------------------------------------------------------------
// Item
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Item {
    pub id:           Uuid,
    pub item_code:    String,
    pub description:  String,
    pub item_type:    String,   // FG / RawMat / PackMat
    pub uom_id:       Uuid,
    pub fda_required: bool,
    pub is_active:    bool,
    pub created_at:   DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateItem {
    pub item_code:    String,
    pub description:  String,
    pub item_type:    String,
    pub uom_id:       Uuid,
    #[serde(default)]
    pub fda_required: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateItem {
    pub description:  Option<String>,
    pub fda_required: Option<bool>,
    pub is_active:    Option<bool>,
}

// ---------------------------------------------------------------------------
// Item-UOM Conversion
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ItemUomConversion {
    pub id:                Uuid,
    pub item_id:           Uuid,
    pub from_uom_id:       Uuid,
    pub to_uom_id:         Uuid,
    pub conversion_factor: Decimal,   // NUMERIC(18,6)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateItemUomConversion {
    pub from_uom_id:       Uuid,
    pub to_uom_id:         Uuid,
    pub conversion_factor: Decimal,
}

// ---------------------------------------------------------------------------
// Item-Supplier
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ItemSupplier {
    pub id:                 Uuid,
    pub item_id:            Uuid,
    pub supplier_id:        Uuid,
    pub supplier_item_code: Option<String>,
    pub lead_time_days:     Option<i32>,
    pub unit_cost:          Option<Decimal>,   // NUMERIC(18,4)
    pub preferred:          bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateItemSupplier {
    pub supplier_id:        Uuid,
    pub supplier_item_code: Option<String>,
    pub lead_time_days:     Option<i32>,
    pub unit_cost:          Option<Decimal>,
    #[serde(default)]
    pub preferred:          bool,
}
