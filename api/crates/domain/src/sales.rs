use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ---------------------------------------------------------------------------
// Sales Order
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct SalesOrder {
    pub id:             Uuid,
    pub order_number:   String,
    pub customer_id:    Uuid,
    pub country_id:     Uuid,
    pub status:         String,          // draft / confirmed / in_production / shipped / invoiced / cancelled
    pub artwork_status: Option<String>,  // pending / in_review / approved
    pub fda_required:   bool,
    pub fda_status:     Option<String>,  // pending / submitted / approved
    pub total_pieces:   Option<Decimal>, // NUMERIC(18,2)
    pub order_date:     Option<NaiveDate>,
    pub required_date:  Option<NaiveDate>,
    pub notes:          Option<String>,
    pub created_at:     DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSalesOrder {
    pub customer_id:   Uuid,
    pub country_id:    Uuid,
    #[serde(default)]
    pub fda_required:  bool,
    pub total_pieces:  Option<Decimal>,
    pub order_date:    Option<NaiveDate>,
    pub required_date: Option<NaiveDate>,
    pub notes:         Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSalesOrder {
    pub status:         Option<String>,
    pub artwork_status: Option<String>,
    pub fda_status:     Option<String>,
    pub total_pieces:   Option<Decimal>,
    pub required_date:  Option<NaiveDate>,
    pub notes:          Option<String>,
}

// ---------------------------------------------------------------------------
// Sales Order Line
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct SalesOrderLine {
    pub id:             Uuid,
    pub sales_order_id: Uuid,
    pub item_id:        Uuid,
    pub qty_ordered:    Decimal,        // NUMERIC(18,4) NOT NULL
    pub uom_id:         Uuid,
    pub unit_price:     Option<Decimal>, // NUMERIC(18,4)
    pub notes:          Option<String>,
    pub bom_id:         Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSalesOrderLine {
    pub item_id:     Uuid,
    pub qty_ordered: Decimal,
    pub uom_id:      Uuid,
    pub unit_price:  Option<Decimal>,
    pub notes:       Option<String>,
    pub bom_id:      Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSalesOrderLine {
    pub item_id:     Option<Uuid>,
    pub qty_ordered: Option<Decimal>,
    pub uom_id:      Option<Uuid>,
    pub unit_price:  Option<Decimal>,
    pub notes:       Option<String>,
    pub bom_id:      Option<Uuid>,
}
