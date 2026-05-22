use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ---------------------------------------------------------------------------
// Tax Rate
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct TaxRate {
    pub id:          Uuid,
    pub company_id:  Uuid,
    pub name:        String,
    pub code:        String,
    pub rate:        Decimal,  // e.g. 0.0700 for 7 %
    pub tax_type:    String,   // vat / gst / withholding / excise / custom
    pub description: Option<String>,
    pub is_default:  bool,
    pub is_active:   bool,
    pub created_at:  DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTaxRate {
    pub name:        String,
    pub code:        String,
    pub rate:        Decimal,
    pub tax_type:    Option<String>,
    pub description: Option<String>,
    pub is_default:  Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTaxRate {
    pub name:        Option<String>,
    pub rate:        Option<Decimal>,
    pub tax_type:    Option<String>,
    pub description: Option<String>,
    pub is_default:  Option<bool>,
    pub is_active:   Option<bool>,
}
