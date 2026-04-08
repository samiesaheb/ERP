use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use rust_decimal::Decimal;
use serde::Deserialize;
use std::collections::{HashMap, HashSet};
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    state::AppState,
};
use domain::{Bom, BomExplosionLine, BomExplosionResult, BomLine, CreateBom, CreateBomLine};

pub async fn list_boms(State(state): State<AppState>) -> Result<Json<Vec<Bom>>> {
    let rows = sqlx::query_as!(
        Bom,
        "SELECT id, finished_good_id, description, version, is_active, created_at
         FROM boms ORDER BY version DESC"
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

pub async fn get_bom(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Bom>> {
    let row = sqlx::query_as!(
        Bom,
        "SELECT id, finished_good_id, description, version, is_active, created_at
         FROM boms WHERE id = $1",
        id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("BOM {id} not found")))?;
    Ok(Json(row))
}

pub async fn create_bom(
    State(state): State<AppState>,
    Json(body): Json<CreateBom>,
) -> Result<(StatusCode, Json<Bom>)> {
    let id = Uuid::new_v4();
    let row = sqlx::query_as!(
        Bom,
        "INSERT INTO boms (id, finished_good_id, description, version, is_active)
         VALUES ($1, $2, $3, $4, TRUE)
         RETURNING id, finished_good_id, description, version, is_active, created_at",
        id,
        body.finished_good_id,
        body.description,
        body.version,
    )
    .fetch_one(&state.db)
    .await?;
    Ok((StatusCode::CREATED, Json(row)))
}

pub async fn get_bom_lines(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Vec<BomLine>>> {
    let rows = sqlx::query_as!(
        BomLine,
        "SELECT id, bom_id, component_item_id, qty_required, uom_id, notes
         FROM bom_lines WHERE bom_id = $1 ORDER BY id",
        id
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

pub async fn create_bom_line(
    State(state): State<AppState>,
    Path(bom_id): Path<Uuid>,
    Json(body): Json<CreateBomLine>,
) -> Result<(StatusCode, Json<BomLine>)> {
    let id = Uuid::new_v4();
    let row = sqlx::query_as!(
        BomLine,
        "INSERT INTO bom_lines (id, bom_id, component_item_id, qty_required, uom_id, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, bom_id, component_item_id, qty_required, uom_id, notes",
        id,
        bom_id,
        body.component_item_id,
        body.qty_required,
        body.uom_id,
        body.notes,
    )
    .fetch_one(&state.db)
    .await?;
    Ok((StatusCode::CREATED, Json(row)))
}

pub async fn delete_bom(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<StatusCode> {
    let in_use: bool = sqlx::query_scalar!(
        "SELECT EXISTS(SELECT 1 FROM manufacturing_orders WHERE bom_id = $1 LIMIT 1) OR
                EXISTS(SELECT 1 FROM production_batches WHERE bom_id = $1 LIMIT 1)",
        id
    )
    .fetch_one(&state.db)
    .await?
    .unwrap_or(false);

    if in_use {
        return Err(AppError::BadRequest(
            "Cannot delete BOM: it is referenced by one or more manufacturing orders or batches".into(),
        ));
    }

    sqlx::query!("DELETE FROM boms WHERE id = $1", id)
        .execute(&state.db)
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

// ---------------------------------------------------------------------------
// BOM explosion
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct ExplodeQuery {
    pub target_qty: Option<Decimal>,
}

pub async fn explode_bom(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Query(q): Query<ExplodeQuery>,
) -> Result<Json<BomExplosionResult>> {
    let bom = sqlx::query_as!(
        Bom,
        "SELECT id, finished_good_id, description, version, is_active, created_at
         FROM boms WHERE id = $1",
        id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("BOM {id} not found")))?;

    let target_qty = q.target_qty.unwrap_or(Decimal::ONE);

    // Pre-fetch all BOM lines
    let all_lines = sqlx::query!(
        "SELECT id, bom_id, component_item_id, qty_required, uom_id FROM bom_lines"
    )
    .fetch_all(&state.db)
    .await?;

    let mut lines_by_bom: HashMap<Uuid, Vec<_>> = HashMap::new();
    for line in &all_lines {
        lines_by_bom.entry(line.bom_id).or_default().push(line);
    }

    // Active BOM per finished_good_id
    let sub_boms = sqlx::query!("SELECT id, finished_good_id FROM boms WHERE is_active = TRUE")
        .fetch_all(&state.db)
        .await?;
    let sub_bom_map: HashMap<Uuid, Uuid> = sub_boms
        .iter()
        .map(|r| (r.finished_good_id, r.id))
        .collect();

    let mut requirements: HashMap<Uuid, Decimal> = HashMap::new();
    let mut visited: HashSet<Uuid> = HashSet::new();

    struct Frame {
        bom_id:     Uuid,
        multiplier: Decimal,
    }
    let mut stack = vec![Frame { bom_id: id, multiplier: target_qty }];

    while let Some(frame) = stack.pop() {
        if visited.contains(&frame.bom_id) {
            return Err(AppError::Unprocessable(format!(
                "BOM cycle detected at bom_id {}",
                frame.bom_id
            )));
        }
        visited.insert(frame.bom_id);

        if let Some(lines) = lines_by_bom.get(&frame.bom_id) {
            for line in lines {
                let total = line.qty_required * frame.multiplier;
                *requirements.entry(line.component_item_id).or_default() += total;

                if let Some(&sub_id) = sub_bom_map.get(&line.component_item_id) {
                    if !visited.contains(&sub_id) {
                        stack.push(Frame { bom_id: sub_id, multiplier: total });
                    }
                }
            }
        }
    }

    let item_ids: Vec<Uuid> = requirements.keys().copied().collect();

    let items = sqlx::query!(
        "SELECT id, item_code, description FROM items WHERE id = ANY($1)",
        &item_ids
    )
    .fetch_all(&state.db)
    .await?;
    let item_map: HashMap<Uuid, _> = items.iter().map(|i| (i.id, i)).collect();

    let uom_data = sqlx::query!(
        r#"SELECT DISTINCT ON (bl.component_item_id)
                  bl.component_item_id,
                  u.code AS uom_code
           FROM bom_lines bl
           JOIN uoms u ON u.id = bl.uom_id
           WHERE bl.bom_id = $1"#,
        id
    )
    .fetch_all(&state.db)
    .await?;
    let uom_map: HashMap<Uuid, String> =
        uom_data.iter().map(|r| (r.component_item_id, r.uom_code.clone())).collect();

    let inv_data = sqlx::query!(
        "SELECT item_id, qty_available, qty_reserved FROM inventory WHERE item_id = ANY($1)",
        &item_ids
    )
    .fetch_all(&state.db)
    .await?;
    let inv_map: HashMap<Uuid, (Decimal, Decimal)> = inv_data
        .iter()
        .map(|r| (r.item_id, (r.qty_available, r.qty_reserved)))
        .collect();

    let mut lines_out: Vec<BomExplosionLine> = Vec::with_capacity(requirements.len());
    for (item_id, required_qty) in &requirements {
        let item = item_map
            .get(item_id)
            .ok_or_else(|| AppError::Internal(format!("Item {item_id} missing")))?;
        let (available, reserved) = inv_map.get(item_id).copied().unwrap_or_default();
        let on_hand = available + reserved;
        let shortfall = (*required_qty - available).max(Decimal::ZERO);
        let uom = uom_map.get(item_id).cloned().unwrap_or_else(|| "?".to_string());

        lines_out.push(BomExplosionLine {
            item_id: *item_id,
            item_code: item.item_code.clone(),
            description: item.description.clone(),
            required_qty: *required_qty,
            uom,
            on_hand,
            available,
            shortfall,
        });
    }
    lines_out.sort_by(|a, b| a.item_code.cmp(&b.item_code));

    Ok(Json(BomExplosionResult {
        bom_id: bom.id,
        fg_item_id: bom.finished_good_id,
        target_qty,
        lines: lines_out,
    }))
}
