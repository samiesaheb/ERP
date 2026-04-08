use axum::{extract::State, Json};

use crate::{error::Result, state::AppState};
use domain::{DashboardData, DashboardKpis, PipelineStage};

pub async fn get_dashboard(State(state): State<AppState>) -> Result<Json<DashboardData>> {
    let open_so = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM sales_orders WHERE status::TEXT NOT IN ('shipped', 'invoiced', 'cancelled')"
    )
    .fetch_one(&state.db)
    .await?
    .unwrap_or(0);

    let active_mo = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM manufacturing_orders WHERE status::TEXT IN ('planned', 'in_progress')"
    )
    .fetch_one(&state.db)
    .await?
    .unwrap_or(0);

    let open_po = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM purchase_orders WHERE status::TEXT NOT IN ('received', 'cancelled')"
    )
    .fetch_one(&state.db)
    .await?
    .unwrap_or(0);

    let pending_inv_value = sqlx::query_scalar!(
        "SELECT COALESCE(SUM(total), 0) FROM invoices WHERE status::TEXT NOT IN ('paid', 'cancelled')"
    )
    .fetch_one(&state.db)
    .await?
    .unwrap_or_default();

    let kpis = DashboardKpis {
        open_sales_orders:          open_so,
        active_manufacturing_orders: active_mo,
        open_purchase_orders:        open_po,
        pending_invoices_value:      pending_inv_value,
    };

    let so_count = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM sales_orders WHERE status::TEXT = 'confirmed'"
    )
    .fetch_one(&state.db)
    .await?
    .unwrap_or(0);

    let mo_count = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM manufacturing_orders WHERE status::TEXT = 'in_progress'"
    )
    .fetch_one(&state.db)
    .await?
    .unwrap_or(0);

    let bulk_count = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM production_batches WHERE status::TEXT = 'bulk_production'"
    )
    .fetch_one(&state.db)
    .await?
    .unwrap_or(0);

    let filling_count = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM production_batches WHERE status::TEXT = 'filling'"
    )
    .fetch_one(&state.db)
    .await?
    .unwrap_or(0);

    let packing_count = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM production_batches WHERE status::TEXT = 'packing'"
    )
    .fetch_one(&state.db)
    .await?
    .unwrap_or(0);

    let loading_count = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM shipments WHERE status::TEXT = 'loading'"
    )
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
        PipelineStage { stage: "Sales Order".to_string(),    count: so_count,      fill_pct: pct(so_count, max_count) },
        PipelineStage { stage: "Mfg Order".to_string(),      count: mo_count,      fill_pct: pct(mo_count, max_count) },
        PipelineStage { stage: "Bulk Production".to_string(), count: bulk_count,   fill_pct: pct(bulk_count, max_count) },
        PipelineStage { stage: "Filling".to_string(),         count: filling_count, fill_pct: pct(filling_count, max_count) },
        PipelineStage { stage: "Packing".to_string(),         count: packing_count, fill_pct: pct(packing_count, max_count) },
        PipelineStage { stage: "Loading".to_string(),         count: loading_count, fill_pct: pct(loading_count, max_count) },
    ];

    Ok(Json(DashboardData { kpis, pipeline }))
}

fn pct(value: i64, max: i64) -> u8 {
    ((value * 100) / max).min(100) as u8
}
