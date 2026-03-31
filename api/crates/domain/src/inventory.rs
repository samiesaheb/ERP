use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "inventory_txn_type", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum InventoryTxnType {
    Receipt,
    Issue,
    Return,
    Conversion,
    Loss,
    Adjustment,
}

// ---------------------------------------------------------------------------
// Inventory Balance
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Inventory {
    pub id: Uuid,
    pub item_id: Uuid,
    pub qty_on_hand: Decimal,
    pub qty_reserved: Decimal,
    pub qty_available: Decimal,
    pub updated_at: DateTime<Utc>,
}

/// Inventory with low-stock flag, returned from GET /inventory
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InventoryWithAlert {
    pub id: Uuid,
    pub item_id: Uuid,
    pub item_code: String,
    pub item_description: String,
    pub qty_on_hand: Decimal,
    pub qty_reserved: Decimal,
    pub qty_available: Decimal,
    pub low_stock: bool,
    pub updated_at: DateTime<Utc>,
}

// ---------------------------------------------------------------------------
// Inventory Transactions
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct InventoryTxn {
    pub id: Uuid,
    pub item_id: Uuid,
    pub txn_type: InventoryTxnType,
    pub qty: Decimal,
    pub ref_doc_type: Option<String>,
    pub ref_doc_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateInventoryTxn {
    pub item_id: Uuid,
    pub txn_type: InventoryTxnType,
    pub qty: Decimal,
    pub ref_doc_type: Option<String>,
    pub ref_doc_id: Option<Uuid>,
}
