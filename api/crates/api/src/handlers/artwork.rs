use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    state::AppState,
};
use domain::{
    Artwork, CreateArtwork, UpdateArtwork,
    FdaDocument, FdaRegistration, CreateFdaDocument, CreateFdaRegistration, UpdateFdaRegistration,
};

// ---------------------------------------------------------------------------
// Artwork
// ---------------------------------------------------------------------------

pub async fn list_artworks(
    State(state): State<AppState>,
) -> Result<Json<Vec<Artwork>>> {
    let rows = sqlx::query_as!(
        Artwork,
        "SELECT id, sales_order_id, item_id, version, status, file_url,
                submitted_at, approved_at, notes, created_at
         FROM artworks ORDER BY created_at DESC"
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

pub async fn list_artworks_by_so(
    State(state): State<AppState>,
    Path(so_id): Path<Uuid>,
) -> Result<Json<Vec<Artwork>>> {
    let rows = sqlx::query_as!(
        Artwork,
        "SELECT id, sales_order_id, item_id, version, status, file_url,
                submitted_at, approved_at, notes, created_at
         FROM artworks WHERE sales_order_id = $1 ORDER BY version DESC",
        so_id
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

pub async fn create_artwork(
    State(state): State<AppState>,
    Json(body): Json<CreateArtwork>,
) -> Result<(StatusCode, Json<Artwork>)> {
    let id = Uuid::new_v4();
    let version = body.version.unwrap_or(1);
    let row = sqlx::query_as!(
        Artwork,
        "INSERT INTO artworks (id, sales_order_id, item_id, version, file_url, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, sales_order_id, item_id, version, status, file_url,
                   submitted_at, approved_at, notes, created_at",
        id,
        body.sales_order_id,
        body.item_id,
        version,
        body.file_url,
        body.notes,
    )
    .fetch_one(&state.db)
    .await?;
    Ok((StatusCode::CREATED, Json(row)))
}

pub async fn update_artwork(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateArtwork>,
) -> Result<Json<Artwork>> {
    let existing = sqlx::query_as!(
        Artwork,
        "SELECT id, sales_order_id, item_id, version, status, file_url,
                submitted_at, approved_at, notes, created_at
         FROM artworks WHERE id = $1",
        id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Artwork {id} not found")))?;

    let new_status = body.status.unwrap_or(existing.status);
    let new_file = body.file_url.or(existing.file_url);
    let new_notes = body.notes.or(existing.notes);

    let submitted_at = if new_status == "in_review" && existing.submitted_at.is_none() {
        Some(chrono::Utc::now())
    } else {
        existing.submitted_at
    };
    let approved_at = if new_status == "approved" && existing.approved_at.is_none() {
        Some(chrono::Utc::now())
    } else {
        existing.approved_at
    };

    let row = sqlx::query_as!(
        Artwork,
        "UPDATE artworks
         SET status = $2, file_url = $3, notes = $4, submitted_at = $5, approved_at = $6
         WHERE id = $1
         RETURNING id, sales_order_id, item_id, version, status, file_url,
                   submitted_at, approved_at, notes, created_at",
        id,
        new_status,
        new_file,
        new_notes,
        submitted_at,
        approved_at,
    )
    .fetch_one(&state.db)
    .await?;
    Ok(Json(row))
}

// ---------------------------------------------------------------------------
// FDA Registrations
// ---------------------------------------------------------------------------

pub async fn list_fda_registrations(
    State(state): State<AppState>,
) -> Result<Json<Vec<FdaRegistration>>> {
    let rows = sqlx::query_as!(
        FdaRegistration,
        "SELECT id, sales_order_id, item_id, registration_number, status,
                submitted_at, approved_at, expiry_date, notes, created_at
         FROM fda_registrations ORDER BY created_at DESC"
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

pub async fn create_fda_registration(
    State(state): State<AppState>,
    Json(body): Json<CreateFdaRegistration>,
) -> Result<(StatusCode, Json<FdaRegistration>)> {
    let id = Uuid::new_v4();
    let row = sqlx::query_as!(
        FdaRegistration,
        "INSERT INTO fda_registrations (id, sales_order_id, item_id, notes)
         VALUES ($1, $2, $3, $4)
         RETURNING id, sales_order_id, item_id, registration_number, status,
                   submitted_at, approved_at, expiry_date, notes, created_at",
        id,
        body.sales_order_id,
        body.item_id,
        body.notes,
    )
    .fetch_one(&state.db)
    .await?;
    Ok((StatusCode::CREATED, Json(row)))
}

pub async fn update_fda_registration(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateFdaRegistration>,
) -> Result<Json<FdaRegistration>> {
    let existing = sqlx::query_as!(
        FdaRegistration,
        "SELECT id, sales_order_id, item_id, registration_number, status,
                submitted_at, approved_at, expiry_date, notes, created_at
         FROM fda_registrations WHERE id = $1",
        id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("FDA Registration {id} not found")))?;

    let new_status = body.status.unwrap_or(existing.status);
    let new_reg_num = body.registration_number.or(existing.registration_number);
    let new_expiry = body.expiry_date.or(existing.expiry_date);
    let new_notes = body.notes.or(existing.notes);

    let submitted_at = if new_status == "submitted" && existing.submitted_at.is_none() {
        Some(chrono::Utc::now())
    } else {
        existing.submitted_at
    };
    let approved_at = if new_status == "approved" && existing.approved_at.is_none() {
        Some(chrono::Utc::now())
    } else {
        existing.approved_at
    };

    let row = sqlx::query_as!(
        FdaRegistration,
        "UPDATE fda_registrations
         SET registration_number = $2, status = $3, expiry_date = $4,
             notes = $5, submitted_at = $6, approved_at = $7
         WHERE id = $1
         RETURNING id, sales_order_id, item_id, registration_number, status,
                   submitted_at, approved_at, expiry_date, notes, created_at",
        id,
        new_reg_num,
        new_status,
        new_expiry,
        new_notes,
        submitted_at,
        approved_at,
    )
    .fetch_one(&state.db)
    .await?;
    Ok(Json(row))
}

// ---------------------------------------------------------------------------
// FDA Documents
// ---------------------------------------------------------------------------

pub async fn list_fda_documents(
    State(state): State<AppState>,
    Path(reg_id): Path<Uuid>,
) -> Result<Json<Vec<FdaDocument>>> {
    let rows = sqlx::query_as!(
        FdaDocument,
        "SELECT id, fda_registration_id, doc_type, file_url, uploaded_at
         FROM fda_documents WHERE fda_registration_id = $1 ORDER BY uploaded_at DESC",
        reg_id
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

pub async fn create_fda_document(
    State(state): State<AppState>,
    Json(body): Json<CreateFdaDocument>,
) -> Result<(StatusCode, Json<FdaDocument>)> {
    let id = Uuid::new_v4();
    let row = sqlx::query_as!(
        FdaDocument,
        "INSERT INTO fda_documents (id, fda_registration_id, doc_type, file_url)
         VALUES ($1, $2, $3, $4)
         RETURNING id, fda_registration_id, doc_type, file_url, uploaded_at",
        id,
        body.fda_registration_id,
        body.doc_type,
        body.file_url,
    )
    .fetch_one(&state.db)
    .await?;
    Ok((StatusCode::CREATED, Json(row)))
}
