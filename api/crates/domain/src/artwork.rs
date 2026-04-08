use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ---------------------------------------------------------------------------
// Artwork
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Artwork {
    pub id:             Uuid,
    pub sales_order_id: Uuid,
    pub item_id:        Uuid,
    pub version:        i32,            // INT NOT NULL DEFAULT 1
    pub status:         String,         // draft / in_review / approved / rejected
    pub file_url:       Option<String>,
    pub submitted_at:   Option<DateTime<Utc>>,
    pub approved_at:    Option<DateTime<Utc>>,
    pub notes:          Option<String>,
    pub created_at:     DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateArtwork {
    pub sales_order_id: Uuid,
    pub item_id:        Uuid,
    pub version:        Option<i32>,    // defaults to 1 in DB
    pub file_url:       Option<String>,
    pub notes:          Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateArtwork {
    pub status:   Option<String>,
    pub file_url: Option<String>,
    pub notes:    Option<String>,
}

// ---------------------------------------------------------------------------
// FDA Registration
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct FdaRegistration {
    pub id:                  Uuid,
    pub sales_order_id:      Uuid,
    pub item_id:             Uuid,
    pub registration_number: Option<String>,
    pub status:              String,          // pending / submitted / approved / rejected
    pub submitted_at:        Option<DateTime<Utc>>,
    pub approved_at:         Option<DateTime<Utc>>,
    pub expiry_date:         Option<NaiveDate>,
    pub notes:               Option<String>,
    pub created_at:          DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateFdaRegistration {
    pub sales_order_id: Uuid,
    pub item_id:        Uuid,
    pub notes:          Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateFdaRegistration {
    pub registration_number: Option<String>,
    pub status:              Option<String>,
    pub expiry_date:         Option<NaiveDate>,
    pub notes:               Option<String>,
}

// ---------------------------------------------------------------------------
// FDA Document
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct FdaDocument {
    pub id:                  Uuid,
    pub fda_registration_id: Uuid,
    pub doc_type:            String,
    pub file_url:            String,
    pub uploaded_at:         DateTime<Utc>,   // TIMESTAMPTZ NOT NULL DEFAULT NOW()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateFdaDocument {
    pub fda_registration_id: Uuid,
    pub doc_type:            String,
    pub file_url:            String,
}
