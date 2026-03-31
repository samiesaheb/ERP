use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "bom_status", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum BomStatus {
    Draft,
    Active,
    UnderReview,
}

// ---------------------------------------------------------------------------
// BOM Header
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Bom {
    pub id: Uuid,
    pub code: String,
    pub item_id: Uuid,
    pub version: i32,
    pub status: BomStatus,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateBom {
    pub code: String,
    pub item_id: Uuid,
    pub version: i32,
}

// ---------------------------------------------------------------------------
// BOM Lines
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct BomLine {
    pub id: Uuid,
    pub bom_id: Uuid,
    pub component_item_id: Uuid,
    pub qty_per_batch: Decimal,
    pub uom_id: Uuid,
    pub line_order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateBomLine {
    pub component_item_id: Uuid,
    pub qty_per_batch: Decimal,
    pub uom_id: Uuid,
    pub line_order: i32,
}

// ---------------------------------------------------------------------------
// BOM Explosion Result
// ---------------------------------------------------------------------------

/// One row in the flat explosion output for GET /boms/:id/explode
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BomExplosionLine {
    pub item_id: Uuid,
    pub item_code: String,
    pub description: String,
    pub required_qty: Decimal,
    pub uom: String,
    pub on_hand: Decimal,
    pub available: Decimal,
    pub shortfall: Decimal,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BomExplosionResult {
    pub bom_id: Uuid,
    pub bom_code: String,
    pub fg_item_id: Uuid,
    pub target_qty: Decimal,
    pub lines: Vec<BomExplosionLine>,
}
