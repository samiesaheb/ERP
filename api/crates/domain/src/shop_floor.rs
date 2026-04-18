use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ---------------------------------------------------------------------------
// Work Center
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct WorkCenter {
    pub id:          Uuid,
    pub code:        String,
    pub name:        String,
    pub center_type: String,    // mixer / filler / packer / lab / general
    pub capacity:    Option<Decimal>,
    pub status:      String,    // active / maintenance / inactive
    pub notes:       Option<String>,
    pub created_at:  DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateWorkCenter {
    pub code:        String,
    pub name:        String,
    pub center_type: String,
    pub capacity:    Option<Decimal>,
    pub notes:       Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateWorkCenter {
    pub name:        Option<String>,
    pub center_type: Option<String>,
    pub capacity:    Option<Decimal>,
    pub status:      Option<String>,
    pub notes:       Option<String>,
}

// ---------------------------------------------------------------------------
// Routing Step
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct RoutingStep {
    pub id:             Uuid,
    pub bom_id:         Uuid,
    pub step_number:    i32,
    pub name:           String,
    pub work_center_id: Uuid,
    pub std_time_min:   Decimal,
    pub instructions:   Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateRoutingStep {
    pub step_number:    i32,
    pub name:           String,
    pub work_center_id: Uuid,
    pub std_time_min:   Decimal,
    pub instructions:   Option<String>,
}

// ---------------------------------------------------------------------------
// QC Test
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct QcTest {
    pub id:           Uuid,
    pub batch_id:     Uuid,
    pub test_type:    String,   // viscosity / ph / microbial / temperature / appearance / weight / other
    pub result_value: Option<String>,
    pub min_spec:     Option<Decimal>,
    pub max_spec:     Option<Decimal>,
    pub pass_fail:    String,   // pending / pass / fail
    pub tested_by:    Option<Uuid>,
    pub tested_at:    DateTime<Utc>,
    pub notes:        Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateQcTest {
    pub test_type:    String,
    pub result_value: Option<String>,
    pub min_spec:     Option<Decimal>,
    pub max_spec:     Option<Decimal>,
    pub pass_fail:    Option<String>,
    pub notes:        Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateQcTest {
    pub result_value: Option<String>,
    pub pass_fail:    Option<String>,
    pub notes:        Option<String>,
}

// ---------------------------------------------------------------------------
// Downtime Event
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DowntimeEvent {
    pub id:             Uuid,
    pub batch_id:       Uuid,
    pub work_center_id: Option<Uuid>,
    pub reason_code:    String,
    pub description:    Option<String>,
    pub start_time:     DateTime<Utc>,
    pub end_time:       Option<DateTime<Utc>>,
    pub reported_by:    Option<Uuid>,
    pub created_at:     DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateDowntimeEvent {
    pub work_center_id: Option<Uuid>,
    pub reason_code:    String,
    pub description:    Option<String>,
    pub start_time:     Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateDowntimeEvent {
    pub end_time:    Option<DateTime<Utc>>,
    pub description: Option<String>,
}

// ---------------------------------------------------------------------------
// Access Request
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct AccessRequest {
    pub id:          Uuid,
    pub user_id:     Uuid,
    pub permission:  String,
    pub reason:      Option<String>,
    pub status:      String,    // pending / approved / denied
    pub reviewed_by: Option<Uuid>,
    pub reviewed_at: Option<DateTime<Utc>>,
    pub created_at:  DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateAccessRequest {
    pub permission: String,
    pub reason:     Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateAccessRequest {
    pub status: String,    // approved / denied
}
