use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};

/// Returned by GET /api/v1/dashboard/kpis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardKpis {
    pub open_sales_orders: i64,
    pub active_manufacturing_orders: i64,
    pub open_purchase_orders: i64,
    /// Sum of invoice amounts for non-paid invoices
    pub pending_invoices_value: Decimal,
}

/// One column in the pipeline strip
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineStage {
    pub stage: String,
    pub count: i64,
    /// 0–100
    pub fill_pct: u8,
}

/// Full dashboard payload
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardData {
    pub kpis: DashboardKpis,
    pub pipeline: Vec<PipelineStage>,
}
