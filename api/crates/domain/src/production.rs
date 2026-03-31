use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "mo_status", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum MoStatus {
    Planned,
    Running,
    Packing,
    Done,
    OnHold,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "batch_stage", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum BatchStage {
    Bulk,
    Formulation,
    Filling,
    Packing,
    Loading,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "batch_status", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum BatchStatus {
    Running,
    Delayed,
    Done,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "item_mgmt_txn_type", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum ItemMgmtTxnType {
    Issue,
    Return,
    Conversion,
    Loss,
    Receipt,
}

// ---------------------------------------------------------------------------
// Manufacturing Order
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ManufacturingOrder {
    pub id: Uuid,
    pub mo_number: String,
    pub sales_order_id: Uuid,
    pub item_id: Uuid,
    pub bom_id: Uuid,
    pub target_qty: Decimal,
    pub status: MoStatus,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateManufacturingOrder {
    pub sales_order_id: Uuid,
    pub item_id: Uuid,
    pub bom_id: Uuid,
    pub target_qty: Decimal,
}

// ---------------------------------------------------------------------------
// Production Batch
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ProductionBatch {
    pub id: Uuid,
    pub batch_number: String,
    pub mo_id: Uuid,
    pub stage: BatchStage,
    pub pct_complete: Decimal,
    pub status: BatchStatus,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateProductionBatch {
    pub stage: Option<BatchStage>,
    pub pct_complete: Option<Decimal>,
    pub status: Option<BatchStatus>,
}

// ---------------------------------------------------------------------------
// Item Management Transactions (floor-level issues / returns / conversions)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ItemManagementTxn {
    pub id: Uuid,
    pub batch_id: Uuid,
    pub txn_type: ItemMgmtTxnType,
    pub item_id: Uuid,
    pub qty: Decimal,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateItemManagementTxn {
    pub batch_id: Uuid,
    pub txn_type: ItemMgmtTxnType,
    pub item_id: Uuid,
    pub qty: Decimal,
    pub notes: Option<String>,
}
