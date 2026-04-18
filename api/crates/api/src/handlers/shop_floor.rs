use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    middleware::rbac::{require_role, ADMIN, ADMIN_PLANNER, PRODUCTION_ROLES},
    state::AppState,
};
use domain::{
    Claims,
    AccessRequest, CreateAccessRequest, UpdateAccessRequest,
    DowntimeEvent, CreateDowntimeEvent, UpdateDowntimeEvent,
    QcTest, CreateQcTest, UpdateQcTest,
    RoutingStep, CreateRoutingStep,
    WorkCenter, CreateWorkCenter, UpdateWorkCenter,
};

// ---------------------------------------------------------------------------
// Work Centers
// ---------------------------------------------------------------------------

pub async fn list_work_centers(
    State(state): State<AppState>,
) -> Result<Json<Vec<WorkCenter>>> {
    let rows = sqlx::query_as!(
        WorkCenter,
        "SELECT id, code, name, center_type, capacity, status, notes, created_at
         FROM work_centers ORDER BY code"
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

pub async fn create_work_center(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Json(body): Json<CreateWorkCenter>,
) -> Result<(StatusCode, Json<WorkCenter>)> {
    require_role(&claims, ADMIN_PLANNER)?;
    let id = Uuid::new_v4();
    let row = sqlx::query_as!(
        WorkCenter,
        "INSERT INTO work_centers (id, code, name, center_type, capacity, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, code, name, center_type, capacity, status, notes, created_at",
        id,
        body.code,
        body.name,
        body.center_type,
        body.capacity,
        body.notes,
    )
    .fetch_one(&state.db)
    .await?;
    Ok((StatusCode::CREATED, Json(row)))
}

pub async fn update_work_center(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateWorkCenter>,
) -> Result<Json<WorkCenter>> {
    require_role(&claims, ADMIN_PLANNER)?;
    let row = sqlx::query_as!(
        WorkCenter,
        r#"UPDATE work_centers SET
             name        = COALESCE($2, name),
             center_type = COALESCE($3, center_type),
             capacity    = COALESCE($4, capacity),
             status      = COALESCE($5, status),
             notes       = COALESCE($6, notes)
           WHERE id = $1
           RETURNING id, code, name, center_type, capacity, status, notes, created_at"#,
        id,
        body.name,
        body.center_type,
        body.capacity,
        body.status,
        body.notes,
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Work center {id} not found")))?;
    Ok(Json(row))
}

// ---------------------------------------------------------------------------
// Routing Steps
// ---------------------------------------------------------------------------

pub async fn list_routing_steps(
    State(state): State<AppState>,
    Path(bom_id): Path<Uuid>,
) -> Result<Json<Vec<RoutingStep>>> {
    let rows = sqlx::query_as!(
        RoutingStep,
        "SELECT id, bom_id, step_number, name, work_center_id, std_time_min, instructions
         FROM routing_steps WHERE bom_id = $1 ORDER BY step_number",
        bom_id
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

pub async fn create_routing_step(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Path(bom_id): Path<Uuid>,
    Json(body): Json<CreateRoutingStep>,
) -> Result<(StatusCode, Json<RoutingStep>)> {
    require_role(&claims, ADMIN_PLANNER)?;
    let id = Uuid::new_v4();
    let row = sqlx::query_as!(
        RoutingStep,
        "INSERT INTO routing_steps (id, bom_id, step_number, name, work_center_id, std_time_min, instructions)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, bom_id, step_number, name, work_center_id, std_time_min, instructions",
        id,
        bom_id,
        body.step_number,
        body.name,
        body.work_center_id,
        body.std_time_min,
        body.instructions,
    )
    .fetch_one(&state.db)
    .await?;
    Ok((StatusCode::CREATED, Json(row)))
}

pub async fn delete_routing_step(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Path((_bom_id, step_id)): Path<(Uuid, Uuid)>,
) -> Result<StatusCode> {
    require_role(&claims, ADMIN_PLANNER)?;
    sqlx::query!("DELETE FROM routing_steps WHERE id = $1", step_id)
        .execute(&state.db)
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

// ---------------------------------------------------------------------------
// QC Tests
// ---------------------------------------------------------------------------

pub async fn list_qc_tests(
    State(state): State<AppState>,
    Path(batch_id): Path<Uuid>,
) -> Result<Json<Vec<QcTest>>> {
    let rows = sqlx::query_as!(
        QcTest,
        "SELECT id, batch_id, test_type, result_value, min_spec, max_spec,
                pass_fail, tested_by, tested_at, notes
         FROM qc_tests WHERE batch_id = $1 ORDER BY tested_at DESC",
        batch_id
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

pub async fn create_qc_test(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Path(batch_id): Path<Uuid>,
    Json(body): Json<CreateQcTest>,
) -> Result<(StatusCode, Json<QcTest>)> {
    require_role(&claims, PRODUCTION_ROLES)?;
    let id = Uuid::new_v4();
    let user_id: Uuid = claims.sub.parse().map_err(|_| AppError::NotFound("Invalid user id".into()))?;
    let pass_fail = body.pass_fail.unwrap_or_else(|| "pending".to_string());
    let row = sqlx::query_as!(
        QcTest,
        "INSERT INTO qc_tests (id, batch_id, test_type, result_value, min_spec, max_spec,
                               pass_fail, tested_by, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, batch_id, test_type, result_value, min_spec, max_spec,
                   pass_fail, tested_by, tested_at, notes",
        id,
        batch_id,
        body.test_type,
        body.result_value,
        body.min_spec,
        body.max_spec,
        pass_fail,
        user_id,
        body.notes,
    )
    .fetch_one(&state.db)
    .await?;
    Ok((StatusCode::CREATED, Json(row)))
}

pub async fn update_qc_test(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Path((_batch_id, test_id)): Path<(Uuid, Uuid)>,
    Json(body): Json<UpdateQcTest>,
) -> Result<Json<QcTest>> {
    require_role(&claims, PRODUCTION_ROLES)?;
    let row = sqlx::query_as!(
        QcTest,
        r#"UPDATE qc_tests SET
             result_value = COALESCE($2, result_value),
             pass_fail    = COALESCE($3, pass_fail),
             notes        = COALESCE($4, notes)
           WHERE id = $1
           RETURNING id, batch_id, test_type, result_value, min_spec, max_spec,
                     pass_fail, tested_by, tested_at, notes"#,
        test_id,
        body.result_value,
        body.pass_fail,
        body.notes,
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("QC test {test_id} not found")))?;
    Ok(Json(row))
}

// ---------------------------------------------------------------------------
// Downtime Events
// ---------------------------------------------------------------------------

pub async fn list_downtime_events(
    State(state): State<AppState>,
    Path(batch_id): Path<Uuid>,
) -> Result<Json<Vec<DowntimeEvent>>> {
    let rows = sqlx::query_as!(
        DowntimeEvent,
        "SELECT id, batch_id, work_center_id, reason_code, description,
                start_time, end_time, reported_by, created_at
         FROM downtime_events WHERE batch_id = $1 ORDER BY start_time DESC",
        batch_id
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

pub async fn create_downtime_event(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Path(batch_id): Path<Uuid>,
    Json(body): Json<CreateDowntimeEvent>,
) -> Result<(StatusCode, Json<DowntimeEvent>)> {
    require_role(&claims, PRODUCTION_ROLES)?;
    let id = Uuid::new_v4();
    let user_id: Uuid = claims.sub.parse().map_err(|_| AppError::NotFound("Invalid user id".into()))?;
    let start_time = body.start_time.unwrap_or_else(chrono::Utc::now);
    let row = sqlx::query_as!(
        DowntimeEvent,
        "INSERT INTO downtime_events (id, batch_id, work_center_id, reason_code,
                                      description, start_time, reported_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, batch_id, work_center_id, reason_code, description,
                   start_time, end_time, reported_by, created_at",
        id,
        batch_id,
        body.work_center_id,
        body.reason_code,
        body.description,
        start_time,
        user_id,
    )
    .fetch_one(&state.db)
    .await?;
    Ok((StatusCode::CREATED, Json(row)))
}

pub async fn close_downtime_event(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Path((_batch_id, event_id)): Path<(Uuid, Uuid)>,
    Json(body): Json<UpdateDowntimeEvent>,
) -> Result<Json<DowntimeEvent>> {
    require_role(&claims, PRODUCTION_ROLES)?;
    let row = sqlx::query_as!(
        DowntimeEvent,
        r#"UPDATE downtime_events SET
             end_time    = COALESCE($2, end_time),
             description = COALESCE($3, description)
           WHERE id = $1
           RETURNING id, batch_id, work_center_id, reason_code, description,
                     start_time, end_time, reported_by, created_at"#,
        event_id,
        body.end_time,
        body.description,
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Downtime event {event_id} not found")))?;
    Ok(Json(row))
}

// ---------------------------------------------------------------------------
// Access Requests
// ---------------------------------------------------------------------------

pub async fn list_access_requests(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
) -> Result<Json<Vec<AccessRequest>>> {
    let rows = if claims.role == "admin" {
        sqlx::query_as!(
            AccessRequest,
            "SELECT id, user_id, permission, reason, status, reviewed_by, reviewed_at, created_at
             FROM access_requests ORDER BY created_at DESC"
        )
        .fetch_all(&state.db)
        .await?
    } else {
        let uid: Uuid = claims.sub.parse().map_err(|_| AppError::NotFound("Invalid user id".into()))?;
        sqlx::query_as!(
            AccessRequest,
            "SELECT id, user_id, permission, reason, status, reviewed_by, reviewed_at, created_at
             FROM access_requests WHERE user_id = $1 ORDER BY created_at DESC",
            uid
        )
        .fetch_all(&state.db)
        .await?
    };
    Ok(Json(rows))
}

pub async fn create_access_request(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Json(body): Json<CreateAccessRequest>,
) -> Result<(StatusCode, Json<AccessRequest>)> {
    let id = Uuid::new_v4();
    let uid: Uuid = claims.sub.parse().map_err(|_| AppError::NotFound("Invalid user id".into()))?;
    let row = sqlx::query_as!(
        AccessRequest,
        "INSERT INTO access_requests (id, user_id, permission, reason)
         VALUES ($1, $2, $3, $4)
         RETURNING id, user_id, permission, reason, status, reviewed_by, reviewed_at, created_at",
        id,
        uid,
        body.permission,
        body.reason,
    )
    .fetch_one(&state.db)
    .await?;
    Ok((StatusCode::CREATED, Json(row)))
}

pub async fn update_access_request(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateAccessRequest>,
) -> Result<Json<AccessRequest>> {
    require_role(&claims, ADMIN)?;
    let now = chrono::Utc::now();
    let reviewer: Uuid = claims.sub.parse().map_err(|_| AppError::NotFound("Invalid user id".into()))?;
    let row = sqlx::query_as!(
        AccessRequest,
        r#"UPDATE access_requests SET
             status      = $2,
             reviewed_by = $3,
             reviewed_at = $4
           WHERE id = $1
           RETURNING id, user_id, permission, reason, status, reviewed_by, reviewed_at, created_at"#,
        id,
        body.status,
        reviewer,
        now,
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Access request {id} not found")))?;
    Ok(Json(row))
}
