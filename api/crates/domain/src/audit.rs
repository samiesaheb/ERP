use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use uuid::Uuid;

/// A single row from audit_logs, joined with the user who made the change.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLog {
    pub id:              Uuid,
    pub table_name:      String,
    pub record_id:       Option<String>,
    pub action:          String,           // INSERT | UPDATE | DELETE
    pub old_data:        Option<Value>,
    pub new_data:        Option<Value>,
    pub changed_by:      Option<Uuid>,
    pub changed_by_name: Option<String>,   // joined from users.full_name
    pub changed_at:      DateTime<Utc>,
}

/// Query parameters for GET /api/v1/audit-logs
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLogQuery {
    pub table_name: Option<String>,
    pub record_id:  Option<String>,
    pub action:     Option<String>,
    pub limit:      Option<i64>,
    pub offset:     Option<i64>,
}
