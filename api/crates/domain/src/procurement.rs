use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::masters::SupplierType;

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "po_status", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum PoStatus {
    Ordered,
    Confirmed,
    InTransit,
    Received,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "qc_status", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum QcStatus {
    Pending,
    Passed,
    Failed,
    Hold,
}

// ---------------------------------------------------------------------------
// Purchase Order
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PurchaseOrder {
    pub id: Uuid,
    pub po_number: String,
    pub supplier_id: Uuid,
    pub status: PoStatus,
    pub expected_date: NaiveDate,
    pub total_amount: Decimal,
    pub supplier_type: SupplierType,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePurchaseOrder {
    pub supplier_id: Uuid,
    pub expected_date: NaiveDate,
    pub lines: Vec<CreatePoLine>,
}

// ---------------------------------------------------------------------------
// PO Lines
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PoLine {
    pub id: Uuid,
    pub po_id: Uuid,
    pub item_id: Uuid,
    pub qty_ordered: Decimal,
    pub qty_received: Decimal,
    pub unit_price: Decimal,
    pub uom_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePoLine {
    pub item_id: Uuid,
    pub qty_ordered: Decimal,
    pub unit_price: Decimal,
    pub uom_id: Uuid,
}

// ---------------------------------------------------------------------------
// Goods Receiving Note (GRN)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Grn {
    pub id: Uuid,
    pub grn_number: String,
    pub po_id: Uuid,
    pub received_date: NaiveDate,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateGrn {
    pub po_id: Uuid,
    pub received_date: NaiveDate,
    pub lines: Vec<CreateGrnLine>,
}

// ---------------------------------------------------------------------------
// GRN Lines
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct GrnLine {
    pub id: Uuid,
    pub grn_id: Uuid,
    pub po_line_id: Uuid,
    pub item_id: Uuid,
    pub qty_received: Decimal,
    pub batch_number: String,
    pub qc_status: QcStatus,
    pub into_stock: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateGrnLine {
    pub po_line_id: Uuid,
    pub item_id: Uuid,
    pub qty_received: Decimal,
    pub batch_number: String,
    pub into_stock: bool,
}
