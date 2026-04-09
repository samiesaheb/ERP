use axum::{
    middleware,
    routing::{delete, get, post, put},
    Router,
};

use crate::{
    handlers::{audit, artwork, auth, bom, dashboard, finance, inventory, masters, procurement, production, sales, shipments},
    middleware::auth::require_auth,
    state::AppState,
};

pub fn build_router(state: AppState) -> Router {
    let public = Router::new()
        .route("/health", get(health))
        .route("/auth/login", post(auth::login));

    let protected = Router::new()
        // Users
        .route("/api/v1/users/me", get(auth::get_me))
        .route("/api/v1/users",    get(auth::list_users).post(auth::create_user))
        .route("/api/v1/users/:id", put(auth::update_user))

        // Dashboard
        .route("/api/v1/dashboard/kpis", get(dashboard::get_dashboard))

        // Masters
        .route("/api/v1/customer-types",  get(masters::list_customer_types))
        .route("/api/v1/countries",        get(masters::list_countries))
        .route("/api/v1/customers",        get(masters::list_customers).post(masters::create_customer))
        .route("/api/v1/uoms",             get(masters::list_uoms))
        .route("/api/v1/items",            get(masters::list_items).post(masters::create_item))
        .route("/api/v1/items/:id",        put(masters::update_item))
        .route("/api/v1/items/:item_id/suppliers",
            get(masters::list_item_suppliers).post(masters::create_item_supplier))
        .route("/api/v1/items/:item_id/uom-conversions",
            get(masters::list_item_uom_conversions).post(masters::create_item_uom_conversion))
        .route("/api/v1/suppliers",        get(masters::list_suppliers).post(masters::create_supplier))

        // Sales Orders
        .route("/api/v1/sales-orders",
            get(sales::list_sales_orders).post(sales::create_sales_order))
        .route("/api/v1/sales-orders/:id",
            get(sales::get_sales_order).put(sales::update_sales_order))
        .route("/api/v1/sales-orders/:so_id/lines",
            get(sales::list_so_lines).post(sales::create_so_line))

        // Artwork & FDA
        .route("/api/v1/artworks",         get(artwork::list_artworks).post(artwork::create_artwork))
        .route("/api/v1/artworks/:id",     put(artwork::update_artwork))
        .route("/api/v1/sales-orders/:so_id/artworks",
            get(artwork::list_artworks_by_so))
        .route("/api/v1/fda-registrations",
            get(artwork::list_fda_registrations).post(artwork::create_fda_registration))
        .route("/api/v1/fda-registrations/:id",
            put(artwork::update_fda_registration))
        .route("/api/v1/fda-registrations/:reg_id/documents",
            get(artwork::list_fda_documents).post(artwork::create_fda_document))

        // BOM
        .route("/api/v1/boms",             get(bom::list_boms).post(bom::create_bom))
        .route("/api/v1/boms/:id",         get(bom::get_bom).delete(bom::delete_bom))
        .route("/api/v1/boms/:id/lines",   get(bom::get_bom_lines).post(bom::create_bom_line))
        .route("/api/v1/boms/:id/explode", get(bom::explode_bom))

        // Procurement
        .route("/api/v1/purchase-orders",
            get(procurement::list_purchase_orders).post(procurement::create_purchase_order))
        .route("/api/v1/purchase-orders/:id",
            get(procurement::get_purchase_order).put(procurement::update_purchase_order))
        .route("/api/v1/purchase-orders/:id/lines",
            get(procurement::get_po_lines).post(procurement::create_po_line))
        .route("/api/v1/receipts",         get(procurement::list_receipts).post(procurement::create_receipt))
        .route("/api/v1/receipts/:receipt_id/lines",
            get(procurement::list_receipt_lines))

        // Inventory
        .route("/api/v1/inventory",        get(inventory::list_inventory))
        .route("/api/v1/inventory/transact", post(inventory::transact_inventory))
        .route("/api/v1/inventory/transactions",
            get(inventory::list_inventory_transactions))

        // Manufacturing
        .route("/api/v1/manufacturing-orders",
            get(production::list_manufacturing_orders).post(production::create_manufacturing_order))
        .route("/api/v1/manufacturing-orders/:id",
            get(production::get_manufacturing_order).put(production::update_manufacturing_order))
        .route("/api/v1/manufacturing-orders/:mo_id/batches",
            get(production::list_mo_batches).post(production::create_production_batch))

        // Production floor
        .route("/api/v1/production/batches",
            get(production::list_production_batches))
        .route("/api/v1/production/batches/:id",
            put(production::update_production_batch))
        .route("/api/v1/production/batches/:batch_id/issues",
            get(production::list_batch_issues).post(production::create_batch_issue))
        .route("/api/v1/production/plans",
            get(production::list_production_plans).post(production::create_production_plan))

        // Shipments
        .route("/api/v1/shipments",        get(shipments::list_shipments).post(shipments::create_shipment))
        .route("/api/v1/shipments/:id",    get(shipments::get_shipment).put(shipments::update_shipment))
        .route("/api/v1/shipments/:shipment_id/lines",
            get(shipments::list_shipment_lines).post(shipments::create_shipment_line))
        .route("/api/v1/shipments/:shipment_id/documents",
            get(shipments::list_shipping_documents).post(shipments::create_shipping_document))

        // Audit Trail
        .route("/api/v1/audit-logs", get(audit::list_audit_logs))

        // Finance
        .route("/api/v1/invoices",
            get(finance::list_invoices).post(finance::create_invoice))
        .route("/api/v1/invoices/:id",     get(finance::get_invoice).put(finance::update_invoice))
        .route("/api/v1/invoices/:invoice_id/lines",
            get(finance::list_invoice_lines).post(finance::create_invoice_line))
        .route("/api/v1/payments",         get(finance::list_payments).post(finance::create_payment))

        // Apply auth middleware to all /api/* routes
        .layer(middleware::from_fn_with_state(state.clone(), require_auth));

    public.merge(protected).with_state(state)
}

async fn health() -> &'static str {
    "ok"
}
