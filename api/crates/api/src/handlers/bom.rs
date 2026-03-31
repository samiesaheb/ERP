use axum::{
    extract::{Path, Query, State},
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
use domain::{Bom, BomExplosionLine, BomExplosionResult, BomLine};

pub async fn list_boms(State(state): State<AppState>) -> Result<Json<Vec<Bom>>> {
    let rows = sqlx::query_as!(
        Bom,
        r#"SELECT id, code, item_id, version,
                  status AS "status: _",
                  created_at
           FROM boms ORDER BY code"#
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
        r#"SELECT id, code, item_id, version,
                  status AS "status: _",
                  created_at
           FROM boms WHERE id = $1"#,
        id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("BOM {id} not found")))?;
    Ok(Json(row))
}

pub async fn get_bom_lines(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Vec<BomLine>>> {
    let rows = sqlx::query_as!(
        BomLine,
        "SELECT id, bom_id, component_item_id, qty_per_batch, uom_id, line_order
         FROM bom_lines WHERE bom_id = $1 ORDER BY line_order",
        id
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

// ---------------------------------------------------------------------------
// BOM explosion
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct ExplodeQuery {
    pub target_qty: Option<Decimal>,
}

/// Recursive BOM explosion.
/// Returns a flat list of required components for the given BOM + target qty.
/// Detects cycles and returns an error.
pub async fn explode_bom(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Query(q): Query<ExplodeQuery>,
) -> Result<Json<BomExplosionResult>> {
    let bom = sqlx::query_as!(
        Bom,
        r#"SELECT id, code, item_id, version,
                  status AS "status: _",
                  created_at
           FROM boms WHERE id = $1"#,
        id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("BOM {id} not found")))?;

    let target_qty = q.target_qty.unwrap_or(Decimal::ONE);
    let mut requirements: HashMap<Uuid, Decimal> = HashMap::new();
    let mut visited: HashSet<Uuid> = HashSet::new();

    // Inline recursive explosion using a stack to avoid async recursion
    struct StackFrame {
        bom_id: Uuid,
        multiplier: Decimal,
    }

    let mut stack = vec![StackFrame {
        bom_id: id,
        multiplier: target_qty,
    }];

    // Pre-fetch all BOM lines in one query for efficiency
    let all_lines = sqlx::query!(
        "SELECT id, bom_id, component_item_id, qty_per_batch, uom_id FROM bom_lines"
    )
    .fetch_all(&state.db)
    .await?;

    // Build map: bom_id → lines
    let mut lines_by_bom: HashMap<Uuid, Vec<_>> = HashMap::new();
    for line in &all_lines {
        lines_by_bom
            .entry(line.bom_id)
            .or_default()
            .push(line);
    }

    // Build map: item_id → bom_id (active BOMs only, for sub-assembly resolution)
    let sub_boms = sqlx::query!(
        "SELECT id, item_id FROM boms WHERE status = 'active'"
    )
    .fetch_all(&state.db)
    .await?;
    let sub_bom_map: HashMap<Uuid, Uuid> = sub_boms
        .iter()
        .map(|r| (r.item_id, r.id))
        .collect();

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
                let total = line.qty_per_batch * frame.multiplier;
                *requirements.entry(line.component_item_id).or_default() += total;

                // If this component itself has an active BOM, explode it too
                if let Some(&sub_id) = sub_bom_map.get(&line.component_item_id) {
                    if !visited.contains(&sub_id) {
                        stack.push(StackFrame {
                            bom_id: sub_id,
                            multiplier: total,
                        });
                    }
                }
            }
        }
    }

    // Fetch item + inventory data for every required component
    let item_ids: Vec<Uuid> = requirements.keys().copied().collect();

    // Fetch items
    let items = sqlx::query!(
        "SELECT id, code, description FROM items WHERE id = ANY($1)",
        &item_ids
    )
    .fetch_all(&state.db)
    .await?;
    let item_map: HashMap<Uuid, _> = items.iter().map(|i| (i.id, i)).collect();

    // Fetch UOM codes via bom_lines
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

    // Fetch inventory
    let inv_data = sqlx::query!(
        "SELECT item_id, qty_on_hand, qty_available FROM inventory WHERE item_id = ANY($1)",
        &item_ids
    )
    .fetch_all(&state.db)
    .await?;
    let inv_map: HashMap<Uuid, (Decimal, Decimal)> = inv_data
        .iter()
        .map(|r| (r.item_id, (r.qty_on_hand, r.qty_available.unwrap_or(Decimal::ZERO))))
        .collect();

    let mut lines_out: Vec<BomExplosionLine> = Vec::with_capacity(requirements.len());
    for (item_id, required_qty) in &requirements {
        let item = item_map
            .get(item_id)
            .ok_or_else(|| AppError::Internal(format!("Item {item_id} missing")))?;
        let (on_hand, available) = inv_map
            .get(item_id)
            .copied()
            .unwrap_or((Decimal::ZERO, Decimal::ZERO));
        let shortfall = (*required_qty - available).max(Decimal::ZERO);
        let uom = uom_map
            .get(item_id)
            .cloned()
            .unwrap_or_else(|| "?".to_string());

        lines_out.push(BomExplosionLine {
            item_id: *item_id,
            item_code: item.code.clone(),
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
        bom_code: bom.code.clone(),
        fg_item_id: bom.item_id,
        target_qty,
        lines: lines_out,
    }))
}
