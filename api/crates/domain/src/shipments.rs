use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ---------------------------------------------------------------------------
// Shipment
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Shipment {
    pub id:              Uuid,
    pub shipment_number: String,
    pub sales_order_id:  Uuid,
    pub status:          String,          // loading / dispatched / in_transit / delivered
    pub carrier:         Option<String>,
    pub tracking_number: Option<String>,
    pub loaded_at:       Option<DateTime<Utc>>,
    pub dispatched_at:   Option<DateTime<Utc>>,
    pub delivered_at:    Option<DateTime<Utc>>,
    pub notes:           Option<String>,
    pub created_at:      DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateShipment {
    pub sales_order_id:  Uuid,
    pub carrier:         Option<String>,
    pub tracking_number: Option<String>,
    pub notes:           Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateShipment {
    pub status:          Option<String>,
    pub carrier:         Option<String>,
    pub tracking_number: Option<String>,
    pub loaded_at:       Option<DateTime<Utc>>,
    pub dispatched_at:   Option<DateTime<Utc>>,
    pub delivered_at:    Option<DateTime<Utc>>,
    pub notes:           Option<String>,
}

// ---------------------------------------------------------------------------
// Shipment Line
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ShipmentLine {
    pub id:          Uuid,
    pub shipment_id: Uuid,
    pub item_id:     Uuid,
    pub batch_id:    Option<Uuid>,   // REFERENCES production_batches(id)
    pub qty_shipped: Decimal,        // NUMERIC(18,4) NOT NULL
    pub uom_id:      Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateShipmentLine {
    pub item_id:     Uuid,
    pub batch_id:    Option<Uuid>,
    pub qty_shipped: Decimal,
    pub uom_id:      Uuid,
}

// ---------------------------------------------------------------------------
// Shipping Document
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ShippingDocument {
    pub id:          Uuid,
    pub shipment_id: Uuid,
    pub doc_type:    String,
    pub file_url:    String,
    pub issued_at:   Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateShippingDocument {
    pub shipment_id: Uuid,
    pub doc_type:    String,
    pub file_url:    String,
}
