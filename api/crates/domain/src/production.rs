use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ---------------------------------------------------------------------------
// Manufacturing Order
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ManufacturingOrder {
    pub id:             Uuid,
    pub mo_number:      String,
    pub sales_order_id: Option<Uuid>,    // nullable — standalone MO
    pub item_id:        Uuid,
    pub bom_id:         Uuid,
    pub status:         String,          // draft / planned / in_progress / completed / cancelled
    pub qty_planned:    Decimal,         // NUMERIC(18,4) NOT NULL
    pub qty_produced:   Decimal,         // NUMERIC(18,4) NOT NULL DEFAULT 0
    pub uom_id:         Uuid,
    pub planned_start:  Option<NaiveDate>,
    pub planned_end:    Option<NaiveDate>,
    pub actual_start:   Option<DateTime<Utc>>,
    pub actual_end:     Option<DateTime<Utc>>,
    pub notes:          Option<String>,
    pub created_at:     DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateManufacturingOrder {
    pub sales_order_id: Option<Uuid>,
    pub item_id:        Uuid,
    pub bom_id:         Uuid,
    pub qty_planned:    Decimal,
    pub uom_id:         Uuid,
    pub planned_start:  Option<NaiveDate>,
    pub planned_end:    Option<NaiveDate>,
    pub notes:          Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateManufacturingOrder {
    pub status:       Option<String>,
    pub qty_produced: Option<Decimal>,
    pub actual_start: Option<DateTime<Utc>>,
    pub actual_end:   Option<DateTime<Utc>>,
    pub notes:        Option<String>,
}

// ---------------------------------------------------------------------------
// Production Batch
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ProductionBatch {
    pub id:                     Uuid,
    pub batch_number:           String,
    pub manufacturing_order_id: Uuid,
    pub bom_id:                 Uuid,
    pub status:                 String,          // planned / bulk_production / filling / packing / completed
    pub qty_bulk_produced:      Option<Decimal>, // NUMERIC(18,4)
    pub qty_filled:             Option<Decimal>,
    pub qty_packed:             Option<Decimal>,
    pub uom_id:                 Uuid,
    pub bulk_start:             Option<DateTime<Utc>>,
    pub bulk_end:               Option<DateTime<Utc>>,
    pub fill_start:             Option<DateTime<Utc>>,
    pub fill_end:               Option<DateTime<Utc>>,
    pub pack_start:             Option<DateTime<Utc>>,
    pub pack_end:               Option<DateTime<Utc>>,
    pub notes:                  Option<String>,
    pub created_at:             DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateProductionBatch {
    pub status:            Option<String>,
    pub qty_bulk_produced: Option<Decimal>,
    pub qty_filled:        Option<Decimal>,
    pub qty_packed:        Option<Decimal>,
    pub bulk_start:        Option<DateTime<Utc>>,
    pub bulk_end:          Option<DateTime<Utc>>,
    pub fill_start:        Option<DateTime<Utc>>,
    pub fill_end:          Option<DateTime<Utc>>,
    pub pack_start:        Option<DateTime<Utc>>,
    pub pack_end:          Option<DateTime<Utc>>,
    pub notes:             Option<String>,
}

// ---------------------------------------------------------------------------
// Batch Component Issue
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct BatchComponentIssue {
    pub id:           Uuid,
    pub batch_id:     Uuid,
    pub item_id:      Uuid,
    pub qty_issued:   Decimal,   // NUMERIC(18,4) NOT NULL
    pub qty_returned: Decimal,   // NUMERIC(18,4) NOT NULL DEFAULT 0
    pub qty_loss:     Decimal,   // NUMERIC(18,4) NOT NULL DEFAULT 0
    pub uom_id:       Uuid,
    pub lot_number:   Option<String>,
    pub issued_at:    DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateBatchComponentIssue {
    pub item_id:    Uuid,
    pub qty_issued: Decimal,
    pub uom_id:     Uuid,
    pub lot_number: Option<String>,
}

// ---------------------------------------------------------------------------
// Production Plan
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ProductionPlan {
    pub id:                     Uuid,
    pub plan_date:              NaiveDate,
    pub manufacturing_order_id: Uuid,
    pub purchase_order_id:      Option<Uuid>,
    pub planned_qty:            Option<Decimal>, // NUMERIC(18,4)
    pub notes:                  Option<String>,
    pub created_by:             Option<Uuid>,    // REFERENCES users(id)
    pub created_at:             DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProductionPlan {
    pub plan_date:              NaiveDate,
    pub manufacturing_order_id: Uuid,
    pub purchase_order_id:      Option<Uuid>,
    pub planned_qty:            Option<Decimal>,
    pub notes:                  Option<String>,
}
