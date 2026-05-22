use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ---------------------------------------------------------------------------
// Warehouse
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Warehouse {
    pub id:           Uuid,
    pub company_id:   Uuid,
    pub code:         String,
    pub name:         String,
    pub address:      Option<String>,
    pub city:         Option<String>,
    pub country_code: Option<String>,
    pub is_default:   bool,
    pub is_active:    bool,
    pub notes:        Option<String>,
    pub created_at:   DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateWarehouse {
    pub code:         String,
    pub name:         String,
    pub address:      Option<String>,
    pub city:         Option<String>,
    pub country_code: Option<String>,
    pub is_default:   Option<bool>,
    pub notes:        Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateWarehouse {
    pub name:         Option<String>,
    pub address:      Option<String>,
    pub city:         Option<String>,
    pub country_code: Option<String>,
    pub is_default:   Option<bool>,
    pub is_active:    Option<bool>,
    pub notes:        Option<String>,
}

// ---------------------------------------------------------------------------
// Warehouse Zone
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct WarehouseZone {
    pub id:           Uuid,
    pub warehouse_id: Uuid,
    pub company_id:   Uuid,
    pub code:         String,
    pub name:         String,
    pub zone_type:    String,
    pub is_active:    bool,
    pub notes:        Option<String>,
    pub created_at:   DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateWarehouseZone {
    pub code:      String,
    pub name:      String,
    pub zone_type: Option<String>,
    pub notes:     Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateWarehouseZone {
    pub name:      Option<String>,
    pub zone_type: Option<String>,
    pub is_active: Option<bool>,
    pub notes:     Option<String>,
}
