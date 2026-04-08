use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ---------------------------------------------------------------------------
// Inventory  (stock balance — one row per item / location / lot)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Inventory {
    pub id:            Uuid,
    pub item_id:       Uuid,
    pub location:      Option<String>,
    pub lot_number:    Option<String>,
    pub qty_available: Decimal,   // NUMERIC(18,4) NOT NULL DEFAULT 0
    pub qty_reserved:  Decimal,   // NUMERIC(18,4) NOT NULL DEFAULT 0
    pub uom_id:        Uuid,
    pub last_updated:  DateTime<Utc>,
}

/// Joined row returned by GET /api/v1/inventory
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct InventoryWithItem {
    pub id:            Uuid,
    pub item_id:       Uuid,
    pub item_code:     String,
    pub description:   String,
    pub location:      Option<String>,
    pub lot_number:    Option<String>,
    pub qty_available: Decimal,
    pub qty_reserved:  Decimal,
    pub uom_id:        Uuid,
    pub last_updated:  DateTime<Utc>,
    pub low_stock:     bool,   // computed: qty_available < reorder threshold
}

// ---------------------------------------------------------------------------
// Inventory Transaction
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct InventoryTransaction {
    pub id:               Uuid,
    pub item_id:          Uuid,
    pub transaction_type: String,         // receipt / issue / return / conversion / loss / adjustment
    pub reference_type:   Option<String>, // e.g. "receipt", "batch_issue"
    pub reference_id:     Option<Uuid>,
    pub qty:              Decimal,        // NUMERIC(18,4) NOT NULL
    pub uom_id:           Option<Uuid>,   // REFERENCES uoms(id) — nullable
    pub lot_number:       Option<String>,
    pub notes:            Option<String>,
    pub created_by:       Option<Uuid>,   // REFERENCES users(id)
    pub created_at:       DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateInventoryTransaction {
    pub item_id:          Uuid,
    pub transaction_type: String,
    pub qty:              Decimal,
    pub uom_id:           Option<Uuid>,
    pub lot_number:       Option<String>,
    pub notes:            Option<String>,
    pub reference_type:   Option<String>,
    pub reference_id:     Option<Uuid>,
}
