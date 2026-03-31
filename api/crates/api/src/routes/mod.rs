use axum::{
    middleware,
    routing::{get, post, put},
    Router,
};

use crate::{
    handlers::{auth, bom, dashboard, finance, inventory, masters, procurement, production, sales},
    middleware::auth::require_auth,
    state::AppState,
};

pub fn build_router(state: AppState) -> Router {
    let public = Router::new()
        .route("/health", get(health))
        .route("/auth/login", post(auth::login));

    let protected = Router::new()
        // Dashboard
        .route("/api/v1/dashboard/kpis", get(dashboard::get_dashboard))
        // Masters
        .route("/api/v1/customer-types",  get(masters::list_customer_types))
        .route("/api/v1/countries",        get(masters::list_countries))
        .route("/api/v1/customers",        get(masters::list_customers))
        .route("/api/v1/uoms",             get(masters::list_uoms))
        .route("/api/v1/items",            get(masters::list_items).post(masters::create_item))
        .route("/api/v1/items/:item_id/suppliers", get(masters::list_item_suppliers))
        .route("/api/v1/suppliers",        get(masters::list_suppliers).post(masters::create_supplier))
        // Sales Orders
        .route("/api/v1/sales-orders",
            get(sales::list_sales_orders).post(sales::create_sales_order))
        .route("/api/v1/sales-orders/:id",
            get(sales::get_sales_order).put(sales::update_sales_order))
        .route("/api/v1/sales-orders/:so_id/artwork-docs",
            get(sales::list_artwork_docs))
        // BOM
        .route("/api/v1/boms",             get(bom::list_boms))
        .route("/api/v1/boms/:id",         get(bom::get_bom))
        .route("/api/v1/boms/:id/lines",   get(bom::get_bom_lines))
        .route("/api/v1/boms/:id/explode", get(bom::explode_bom))
        // Procurement
        .route("/api/v1/purchase-orders",
            get(procurement::list_purchase_orders).post(procurement::create_purchase_order))
        .route("/api/v1/purchase-orders/:id",
            get(procurement::get_purchase_order))
        .route("/api/v1/purchase-orders/:id/lines",
            get(procurement::get_po_lines))
        .route("/api/v1/grn",              post(procurement::create_grn))
        .route("/api/v1/grn/:grn_id/lines", get(procurement::list_grn_lines))
        // Inventory
        .route("/api/v1/inventory",        get(inventory::list_inventory))
        .route("/api/v1/inventory/transact", post(inventory::transact_inventory))
        // Manufacturing
        .route("/api/v1/manufacturing-orders",
            get(production::list_manufacturing_orders).post(production::create_manufacturing_order))
        .route("/api/v1/manufacturing-orders/:id",
            get(production::get_manufacturing_order))
        // Production floor
        .route("/api/v1/production/batches",
            get(production::list_production_batches))
        .route("/api/v1/production/batches/:id",
            put(production::update_production_batch))
        // Finance
        .route("/api/v1/invoices",
            get(finance::list_invoices).post(finance::create_invoice))
        .route("/api/v1/payments",         post(finance::create_payment))
        // Apply auth middleware to all /api/* routes
        .layer(middleware::from_fn_with_state(state.clone(), require_auth));

    public.merge(protected).with_state(state)
}

async fn health() -> &'static str {
    "ok"
}
