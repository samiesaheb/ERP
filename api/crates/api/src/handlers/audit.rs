use axum::{extract::{Query, State}, Json};

use crate::{error::Result, middleware::rbac::{require_role, ADMIN}, state::AppState};
use domain::{AuditLog, AuditLogQuery, Claims};

// ---------------------------------------------------------------------------
// GET /api/v1/audit-logs
// ---------------------------------------------------------------------------

pub async fn list_audit_logs(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Query(q): Query<AuditLogQuery>,
) -> Result<Json<Vec<AuditLog>>> {
    require_role(&claims, ADMIN)?;
    let limit  = q.limit.unwrap_or(200).min(1000);
    let offset = q.offset.unwrap_or(0);

    let rows = sqlx::query_as!(
        AuditLog,
        r#"
        SELECT
            al.id,
            al.table_name,
            al.record_id,
            al.action,
            al.old_data,
            al.new_data,
            al.changed_by,
            u.full_name AS changed_by_name,
            al.changed_at
        FROM audit_logs al
        LEFT JOIN users u ON u.id = al.changed_by
        WHERE ($1::TEXT IS NULL OR al.table_name = $1)
          AND ($2::TEXT IS NULL OR al.record_id  = $2)
          AND ($3::TEXT IS NULL OR al.action     = $3)
        ORDER BY al.changed_at DESC
        LIMIT  $4
        OFFSET $5
        "#,
        q.table_name,
        q.record_id,
        q.action,
        limit,
        offset,
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(rows))
}
