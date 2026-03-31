use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "so_status", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum SalesOrderStatus {
    Artwork,
    Planning,
    Production,
    Packing,
    Shipped,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "artwork_status", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum ArtworkStatus {
    Draft,
    InReview,
    Approved,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "fda_status", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum FdaStatus {
    Pending,
    Submitted,
    Approved,
}

// ---------------------------------------------------------------------------
// Sales Order
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct SalesOrder {
    pub id: Uuid,
    pub order_number: String,
    pub customer_id: Uuid,
    pub country_id: Uuid,
    pub status: SalesOrderStatus,
    pub total_pieces: Decimal,
    pub artwork_status: ArtworkStatus,
    pub fda_required: bool,
    pub fda_status: Option<FdaStatus>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSalesOrder {
    pub customer_id: Uuid,
    pub country_id: Uuid,
    pub total_pieces: Decimal,
    pub fda_required: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSalesOrder {
    pub status: Option<SalesOrderStatus>,
    pub artwork_status: Option<ArtworkStatus>,
    pub fda_status: Option<FdaStatus>,
    pub total_pieces: Option<Decimal>,
}

// ---------------------------------------------------------------------------
// Artwork Documents
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ArtworkDoc {
    pub id: Uuid,
    pub sales_order_id: Uuid,
    pub doc_type: String,
    pub file_url: String,
    pub uploaded_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateArtworkDoc {
    pub sales_order_id: Uuid,
    pub doc_type: String,
    pub file_url: String,
}
