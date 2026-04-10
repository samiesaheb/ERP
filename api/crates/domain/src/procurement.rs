use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ---------------------------------------------------------------------------
// Purchase Order
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PurchaseOrder {
    pub id:                     Uuid,
    pub po_number:              String,
    pub supplier_id:            Uuid,
    pub manufacturing_order_id: Option<Uuid>,
    pub status:                 String,         // draft / sent / confirmed / partially_received / received / cancelled
    pub order_date:             Option<NaiveDate>,
    pub expected_date:          Option<NaiveDate>,
    pub notes:                  Option<String>,
    pub created_at:             DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePurchaseOrder {
    pub supplier_id:            Uuid,
    pub manufacturing_order_id: Option<Uuid>,
    pub order_date:             Option<NaiveDate>,
    pub expected_date:          Option<NaiveDate>,
    pub notes:                  Option<String>,
    pub lines:                  Vec<CreatePurchaseOrderLine>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdatePurchaseOrder {
    pub status:        Option<String>,
    pub expected_date: Option<NaiveDate>,
    pub notes:         Option<String>,
}

// ---------------------------------------------------------------------------
// Purchase Order Line
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PurchaseOrderLine {
    pub id:                Uuid,
    pub purchase_order_id: Uuid,
    pub item_id:           Uuid,
    pub qty_ordered:       Decimal,        // NUMERIC(18,4) NOT NULL
    pub qty_received:      Decimal,        // NUMERIC(18,4) NOT NULL DEFAULT 0
    pub uom_id:            Uuid,
    pub unit_cost:         Option<Decimal>, // NUMERIC(18,4)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePurchaseOrderLine {
    pub item_id:     Uuid,
    pub qty_ordered: Decimal,
    pub uom_id:      Uuid,
    pub unit_cost:   Option<Decimal>,
}

// ---------------------------------------------------------------------------
// Receipt  (Goods Receiving Note)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Receipt {
    pub id:                Uuid,
    pub receipt_number:    String,
    pub purchase_order_id: Uuid,
    pub received_by:       Option<Uuid>,  // REFERENCES users(id)
    pub received_at:       DateTime<Utc>, // TIMESTAMPTZ NOT NULL DEFAULT NOW()
    pub notes:             Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateReceipt {
    pub purchase_order_id: Uuid,
    pub notes:             Option<String>,
    pub lines:             Vec<CreateReceiptLine>,
}

// ---------------------------------------------------------------------------
// Receipt Line
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ReceiptLine {
    pub id:           Uuid,
    pub receipt_id:   Uuid,
    pub po_line_id:   Uuid,
    pub item_id:      Uuid,
    pub qty_received: Decimal,          // NUMERIC(18,4) NOT NULL
    pub uom_id:       Uuid,
    pub lot_number:   Option<String>,
    pub expiry_date:  Option<NaiveDate>,
    pub qc_status:    String,           // pending / passed / failed
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateReceiptLine {
    pub po_line_id:   Uuid,
    pub item_id:      Uuid,
    pub qty_received: Decimal,
    pub uom_id:       Uuid,
    pub lot_number:   Option<String>,
    pub expiry_date:  Option<NaiveDate>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateReceiptLine {
    pub qc_status:   String,          // pending / passed / failed
    pub expiry_date: Option<NaiveDate>,
}
