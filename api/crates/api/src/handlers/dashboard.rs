use axum::{extract::State, Json};
use rust_decimal::Decimal;

use crate::{error::Result, handlers::company_id_from_claims, state::AppState};
use domain::{Claims, DashboardData, DashboardKpis, PipelineStage};

pub async fn get_dashboard(
    State(state): State<AppState>,
    axum::Extension(claims): axum::Extension<Claims>,
) -> Result<Json<DashboardData>> {
    let cid = company_id_from_claims(&claims)?;

    let open_so: i64 = sqlx::query_scalar::<_, Option<i64>>(
        "SELECT COUNT(*) FROM sales_orders WHERE company_id = $1 AND status::TEXT NOT IN ('shipped', 'invoiced', 'cancelled')",
    )
    .bind(cid)
    .fetch_one(&state.db)
    .await?
    .unwrap_or(0);

    let active_mo: i64 = sqlx::query_scalar::<_, Option<i64>>(
        "SELECT COUNT(*) FROM manufacturing_orders WHERE company_id = $1 AND status::TEXT IN ('planned', 'in_progress')",
    )
    .bind(cid)
    .fetch_one(&state.db)
    .await?
    .unwrap_or(0);

    let open_po: i64 = sqlx::query_scalar::<_, Option<i64>>(
        "SELECT COUNT(*) FROM purchase_orders WHERE company_id = $1 AND status::TEXT NOT IN ('received', 'cancelled')",
    )
    .bind(cid)
    .fetch_one(&state.db)
    .await?
    .unwrap_or(0);

    let pending_inv_value: Decimal = sqlx::query_scalar::<_, Option<Decimal>>(
        "SELECT COALESCE(SUM(total), 0) FROM invoices WHERE company_id = $1 AND status::TEXT NOT IN ('paid', 'cancelled')",
    )
    .bind(cid)
    .fetch_one(&state.db)
    .await?
    .unwrap_or_default();

    let kpis = DashboardKpis {
        open_sales_orders:           open_so,
        active_manufacturing_orders: active_mo,
        open_purchase_orders:        open_po,
        pending_invoices_value:      pending_inv_value,
    };

    let so_count: i64 = sqlx::query_scalar::<_, Option<i64>>(
        "SELECT COUNT(*) FROM sales_orders WHERE company_id = $1 AND status::TEXT = 'confirmed'",
    )
    .bind(cid)
    .fetch_one(&state.db)
    .await?
    .unwrap_or(0);

    let mo_count: i64 = sqlx::query_scalar::<_, Option<i64>>(
        "SELECT COUNT(*) FROM manufacturing_orders WHERE company_id = $1 AND status::TEXT = 'in_progress'",
    )
    .bind(cid)
    .fetch_one(&state.db)
    .await?
    .unwrap_or(0);

    let bulk_count: i64 = sqlx::query_scalar::<_, Option<i64>>(
        "SELECT COUNT(*) FROM production_batches WHERE company_id = $1 AND status::TEXT = 'bulk_production'",
    )
    .bind(cid)
    .fetch_one(&state.db)
    .await?
    .unwrap_or(0);

    let filling_count: i64 = sqlx::query_scalar::<_, Option<i64>>(
        "SELECT COUNT(*) FROM production_batches WHERE company_id = $1 AND status::TEXT = 'filling'",
    )
    .bind(cid)
    .fetch_one(&state.db)
    .await?
    .unwrap_or(0);

    let packing_count: i64 = sqlx::query_scalar::<_, Option<i64>>(
        "SELECT COUNT(*) FROM production_batches WHERE company_id = $1 AND status::TEXT = 'packing'",
    )
    .bind(cid)
    .fetch_one(&state.db)
    .await?
    .unwrap_or(0);

    let loading_count: i64 = sqlx::query_scalar::<_, Option<i64>>(
        "SELECT COUNT(*) FROM shipments WHERE company_id = $1 AND status::TEXT = 'loading'",
    )
    .bind(cid)
    .fetch_one(&state.db)
    .await?
    .unwrap_or(0);

    let max_count = [so_count, mo_count, bulk_count, filling_count, packing_count, loading_count]
        .iter()
        .copied()
        .max()
        .unwrap_or(1)
        .max(1);

    let pipeline = vec![
        PipelineStage { stage: "Sales Order".to_string(),     count: so_count,      fill_pct: pct(so_count, max_count) },
        PipelineStage { stage: "Mfg Order".to_string(),       count: mo_count,      fill_pct: pct(mo_count, max_count) },
        PipelineStage { stage: "Bulk Production".to_string(), count: bulk_count,    fill_pct: pct(bulk_count, max_count) },
        PipelineStage { stage: "Filling".to_string(),         count: filling_count, fill_pct: pct(filling_count, max_count) },
        PipelineStage { stage: "Packing".to_string(),         count: packing_count, fill_pct: pct(packing_count, max_count) },
        PipelineStage { stage: "Loading".to_string(),         count: loading_count, fill_pct: pct(loading_count, max_count) },
    ];

    Ok(Json(DashboardData { kpis, pipeline }))
}

fn pct(value: i64, max: i64) -> u8 {
    ((value * 100) / max).min(100) as u8
}
