use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use std::collections::HashMap;
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    state::AppState,
};
use domain::{
    CreateFormulation, CreateIngredient, FormulationLineOut, FormulationOut, FormulationRow,
    Ingredient, IngredientDetail, PatchFormulation, ProductDetail, ProductOut,
};

// ---------------------------------------------------------------------------
// Helper — fetch one formulation with product_detail + lines
// ---------------------------------------------------------------------------

async fn fetch_formulation(state: &AppState, id: Uuid) -> Result<FormulationOut> {
    let row = sqlx::query_as!(
        FormulationRow,
        "SELECT id, item_id, version, is_active, note, batch_qty, batch_unit FROM formulations WHERE id = $1",
        id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Formulation {id} not found")))?;

    let item = sqlx::query!(
        "SELECT id, item_code, description, item_type FROM items WHERE id = $1",
        row.item_id
    )
    .fetch_optional(&state.db)
    .await?;

    let lines = sqlx::query!(
        r#"SELECT fl.id, fl.ingredient_id, fl.percentage, fl.phase, fl.comment,
                  i.code, i.inci_name
           FROM formulation_lines fl
           JOIN ingredients i ON i.id = fl.ingredient_id
           WHERE fl.formulation_id = $1
           ORDER BY fl.id"#,
        id
    )
    .fetch_all(&state.db)
    .await?;

    Ok(FormulationOut {
        id: row.id,
        product: row.item_id,
        product_detail: item.map(|i| ProductDetail {
            id: i.id,
            sku: i.item_code,
            name: i.description,
            item_type: i.item_type,
        }),
        version: row.version,
        is_active: row.is_active,
        note: row.note,
        batch_qty: row.batch_qty,
        batch_unit: row.batch_unit,
        lines: lines
            .into_iter()
            .map(|l| FormulationLineOut {
                id: l.id,
                ingredient: l.ingredient_id,
                ingredient_detail: Some(IngredientDetail {
                    id: l.ingredient_id,
                    code: l.code,
                    inci_name: l.inci_name,
                }),
                percentage: l.percentage,
                phase: l.phase,
                comment: l.comment,
            })
            .collect(),
    })
}

// ---------------------------------------------------------------------------
// Formulation CRUD
// ---------------------------------------------------------------------------

pub async fn list_formulations(
    State(state): State<AppState>,
) -> Result<Json<Vec<FormulationOut>>> {
    let rows = sqlx::query_as!(
        FormulationRow,
        "SELECT id, item_id, version, is_active, note, batch_qty, batch_unit
         FROM formulations
         ORDER BY item_id, version"
    )
    .fetch_all(&state.db)
    .await?;

    if rows.is_empty() {
        return Ok(Json(vec![]));
    }

    let item_ids: Vec<Uuid> = rows.iter().map(|r| r.item_id).collect();
    let formulation_ids: Vec<Uuid> = rows.iter().map(|r| r.id).collect();

    let items = sqlx::query!(
        "SELECT id, item_code, description, item_type FROM items WHERE id = ANY($1)",
        &item_ids
    )
    .fetch_all(&state.db)
    .await?;
    let item_map: HashMap<Uuid, _> = items.into_iter().map(|i| (i.id, i)).collect();

    let lines = sqlx::query!(
        r#"SELECT fl.id, fl.formulation_id, fl.ingredient_id, fl.percentage, fl.phase, fl.comment,
                  i.code, i.inci_name
           FROM formulation_lines fl
           JOIN ingredients i ON i.id = fl.ingredient_id
           WHERE fl.formulation_id = ANY($1)
           ORDER BY fl.formulation_id, fl.id"#,
        &formulation_ids
    )
    .fetch_all(&state.db)
    .await?;

    let mut lines_by_formulation: HashMap<Uuid, Vec<FormulationLineOut>> = HashMap::new();
    for l in lines {
        lines_by_formulation
            .entry(l.formulation_id)
            .or_default()
            .push(FormulationLineOut {
                id: l.id,
                ingredient: l.ingredient_id,
                ingredient_detail: Some(IngredientDetail {
                    id: l.ingredient_id,
                    code: l.code,
                    inci_name: l.inci_name,
                }),
                percentage: l.percentage,
                phase: l.phase,
                comment: l.comment,
            });
    }

    let result = rows
        .into_iter()
        .map(|r| FormulationOut {
            product_detail: item_map.get(&r.item_id).map(|i| ProductDetail {
                id: i.id,
                sku: i.item_code.clone(),
                name: i.description.clone(),
                item_type: i.item_type.clone(),
            }),
            lines: lines_by_formulation.remove(&r.id).unwrap_or_default(),
            id: r.id,
            product: r.item_id,
            version: r.version,
            is_active: r.is_active,
            note: r.note,
            batch_qty: r.batch_qty,
            batch_unit: r.batch_unit,
        })
        .collect();

    Ok(Json(result))
}

pub async fn get_formulation(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<FormulationOut>> {
    Ok(Json(fetch_formulation(&state, id).await?))
}

pub async fn create_formulation(
    State(state): State<AppState>,
    Json(body): Json<CreateFormulation>,
) -> Result<(StatusCode, Json<FormulationOut>)> {
    let id = Uuid::new_v4();
    let batch_qty = body.batch_qty.unwrap_or_else(|| rust_decimal::Decimal::from(100));
    let batch_unit = body.batch_unit.clone().unwrap_or_else(|| "g".to_string());
    sqlx::query!(
        "INSERT INTO formulations (id, item_id, version, is_active, note, batch_qty, batch_unit)
         VALUES ($1, $2, $3, $4, $5, $6, $7)",
        id,
        body.product,
        body.version,
        body.is_active,
        body.note,
        batch_qty,
        batch_unit,
    )
    .execute(&state.db)
    .await?;

    for line in &body.lines {
        sqlx::query!(
            "INSERT INTO formulation_lines (id, formulation_id, ingredient_id, percentage, phase, comment)
             VALUES ($1, $2, $3, $4, $5, $6)",
            Uuid::new_v4(),
            id,
            line.ingredient,
            line.percentage,
            line.phase,
            line.comment,
        )
        .execute(&state.db)
        .await?;
    }

    Ok((StatusCode::CREATED, Json(fetch_formulation(&state, id).await?)))
}

pub async fn patch_formulation(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(body): Json<PatchFormulation>,
) -> Result<Json<FormulationOut>> {
    // Verify exists
    let exists = sqlx::query_scalar!(
        "SELECT EXISTS(SELECT 1 FROM formulations WHERE id = $1)",
        id
    )
    .fetch_one(&state.db)
    .await?
    .unwrap_or(false);

    if !exists {
        return Err(AppError::NotFound(format!("Formulation {id} not found")));
    }

    if body.is_active.is_some() || body.note.is_some() || body.batch_qty.is_some() || body.batch_unit.is_some() {
        sqlx::query!(
            "UPDATE formulations
             SET is_active  = COALESCE($1, is_active),
                 note       = COALESCE($2, note),
                 batch_qty  = COALESCE($3, batch_qty),
                 batch_unit = COALESCE($4, batch_unit)
             WHERE id = $5",
            body.is_active,
            body.note,
            body.batch_qty,
            body.batch_unit,
            id,
        )
        .execute(&state.db)
        .await?;
    }

    if let Some(lines) = body.lines {
        sqlx::query!(
            "DELETE FROM formulation_lines WHERE formulation_id = $1",
            id
        )
        .execute(&state.db)
        .await?;

        for line in &lines {
            sqlx::query!(
                "INSERT INTO formulation_lines (id, formulation_id, ingredient_id, percentage, phase, comment)
                 VALUES ($1, $2, $3, $4, $5, $6)",
                Uuid::new_v4(),
                id,
                line.ingredient,
                line.percentage,
                line.phase,
                line.comment,
            )
            .execute(&state.db)
            .await?;
        }
    }

    Ok(Json(fetch_formulation(&state, id).await?))
}

pub async fn delete_formulation(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<StatusCode> {
    sqlx::query!("DELETE FROM formulations WHERE id = $1", id)
        .execute(&state.db)
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

// ---------------------------------------------------------------------------
// Ingredients
// ---------------------------------------------------------------------------

pub async fn list_ingredients(
    State(state): State<AppState>,
) -> Result<Json<Vec<Ingredient>>> {
    let rows = sqlx::query_as!(
        Ingredient,
        "SELECT id, code, inci_name, is_active FROM ingredients WHERE is_active = TRUE ORDER BY code"
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

pub async fn create_ingredient(
    State(state): State<AppState>,
    Json(body): Json<CreateIngredient>,
) -> Result<(StatusCode, Json<Ingredient>)> {
    let id = Uuid::new_v4();
    let row = sqlx::query_as!(
        Ingredient,
        "INSERT INTO ingredients (id, code, inci_name) VALUES ($1, $2, $3)
         RETURNING id, code, inci_name, is_active",
        id,
        body.code,
        body.inci_name,
    )
    .fetch_one(&state.db)
    .await?;
    Ok((StatusCode::CREATED, Json(row)))
}

// ---------------------------------------------------------------------------
// Products (items with product-style field names for the formulation UI)
// ---------------------------------------------------------------------------

pub async fn list_products(
    State(state): State<AppState>,
) -> Result<Json<Vec<ProductOut>>> {
    let rows = sqlx::query!(
        "SELECT id, item_code, description, item_type FROM items WHERE is_active = TRUE ORDER BY item_code"
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(
        rows.into_iter()
            .map(|r| ProductOut {
                id: r.id,
                sku: r.item_code,
                name: r.description,
                item_type: r.item_type,
            })
            .collect(),
    ))
}
