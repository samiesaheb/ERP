use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ---------------------------------------------------------------------------
// BOM Header
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Bom {
    pub id:               Uuid,
    pub finished_good_id: Uuid,
    pub version:          i32,            // INT NOT NULL DEFAULT 1
    pub description:      Option<String>,
    pub is_active:        bool,           // BOOLEAN NOT NULL DEFAULT TRUE
    pub created_at:       DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateBom {
    pub finished_good_id: Uuid,
    pub version:          i32,
    pub description:      Option<String>,
}

// ---------------------------------------------------------------------------
// BOM Line
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct BomLine {
    pub id:                Uuid,
    pub bom_id:            Uuid,
    pub component_item_id: Uuid,
    pub qty_required:      Decimal,   // NUMERIC(18,6) NOT NULL
    pub uom_id:            Uuid,
    pub notes:             Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateBomLine {
    pub component_item_id: Uuid,
    pub qty_required:      Decimal,
    pub uom_id:            Uuid,
    pub notes:             Option<String>,
}

// ---------------------------------------------------------------------------
// BOM Explosion (computed, not stored)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BomExplosionLine {
    pub item_id:      Uuid,
    pub item_code:    String,
    pub description:  String,
    pub required_qty: Decimal,
    pub uom:          String,
    pub on_hand:      Decimal,
    pub available:    Decimal,
    pub shortfall:    Decimal,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BomExplosionResult {
    pub bom_id:     Uuid,
    pub fg_item_id: Uuid,
    pub target_qty: Decimal,
    pub lines:      Vec<BomExplosionLine>,
}
