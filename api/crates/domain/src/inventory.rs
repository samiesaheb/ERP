use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ---------------------------------------------------------------------------
// Inventory  (stock balance — one row per item / location / lot)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Inventory {
    pub id:             Uuid,
    pub item_id:        Uuid,
    pub location:       Option<String>,
    pub lot_number:     Option<String>,
    pub qty_available:  Decimal,
    pub qty_reserved:   Decimal,
    pub uom_id:         Uuid,
    pub last_updated:   DateTime<Utc>,
    pub last_counted_at: Option<DateTime<Utc>>,
}

/// Joined row returned by GET /api/v1/inventory
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct InventoryWithItem {
    pub id:              Uuid,
    pub item_id:         Uuid,
    pub item_code:       String,
    pub description:     String,
    pub location:        Option<String>,
    pub lot_number:      Option<String>,
    pub qty_available:   Decimal,
    pub qty_reserved:    Decimal,
    pub uom_id:          Uuid,
    pub last_updated:    DateTime<Utc>,
    pub last_counted_at: Option<DateTime<Utc>>,
    pub reorder_point:   Option<Decimal>,
    pub reorder_alert:   bool,   // ATP (available - reserved) < reorder_point
}

// ---------------------------------------------------------------------------
// Inventory Transaction
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct InventoryTransaction {
    pub id:               Uuid,
    pub item_id:          Uuid,
    pub transaction_type: String,
    pub reference_type:   Option<String>,
    pub reference_id:     Option<Uuid>,
    pub qty:              Decimal,
    pub uom_id:           Option<Uuid>,
    pub lot_number:       Option<String>,
    pub notes:            Option<String>,
    pub created_by:       Option<Uuid>,
    pub created_at:       DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateInventoryTransaction {
    pub item_id:          Uuid,
    pub transaction_type: String,
    pub qty:              Decimal,
    pub uom_id:           Option<Uuid>,
    pub lot_number:       Option<String>,
    pub location:         Option<String>,
    pub notes:            Option<String>,
    pub reference_type:   Option<String>,
    pub reference_id:     Option<Uuid>,
}

// ---------------------------------------------------------------------------
// Cycle Count
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CycleCount {
    pub counted_qty: Decimal,
    pub notes:       Option<String>,
}

// ---------------------------------------------------------------------------
// Warehouse Location
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct WarehouseLocation {
    pub id:              Uuid,
    pub code:            String,
    pub warehouse_id:    Option<Uuid>,
    pub zone_id:         Option<Uuid>,
    pub zone:            Option<String>,
    pub aisle:           Option<String>,
    pub section:         Option<String>,
    pub shelf_level:     Option<String>,
    pub travel_sequence: Option<i32>,
    pub location_type:   String,   // rack / bin / virtual / dock
    pub is_active:       bool,
    pub is_virtual:      bool,
    pub notes:           Option<String>,
    pub created_at:      DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateWarehouseLocation {
    pub code:            String,
    pub warehouse_id:    Option<Uuid>,
    pub zone_id:         Option<Uuid>,
    pub zone:            Option<String>,
    pub aisle:           Option<String>,
    pub section:         Option<String>,
    pub shelf_level:     Option<String>,
    pub travel_sequence: Option<i32>,
    pub location_type:   Option<String>,
    pub is_virtual:      Option<bool>,
    pub notes:           Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateWarehouseLocation {
    pub zone:            Option<String>,
    pub aisle:           Option<String>,
    pub section:         Option<String>,
    pub shelf_level:     Option<String>,
    pub travel_sequence: Option<i32>,
    pub location_type:   Option<String>,
    pub is_active:       Option<bool>,
    pub is_virtual:      Option<bool>,
    pub notes:           Option<String>,
}
