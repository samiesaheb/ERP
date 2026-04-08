use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};

/// KPI snapshot — returned by GET /api/v1/dashboard
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardKpis {
    pub open_sales_orders:            i64,
    pub active_manufacturing_orders:  i64,
    pub open_purchase_orders:         i64,
    pub pending_invoices_value:       Decimal,
}

/// One bar in the production pipeline strip
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineStage {
    pub stage:    String,
    pub count:    i64,
    pub fill_pct: u8,   // 0–100, relative to the tallest bar
}

/// Full dashboard payload
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardData {
    pub kpis:     DashboardKpis,
    pub pipeline: Vec<PipelineStage>,
}
