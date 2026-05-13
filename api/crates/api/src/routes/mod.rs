use axum::{
    middleware,
    routing::{delete, get, post, put},
    Router,
};

use crate::{
    handlers::{audit, artwork, auth, bom, dashboard, finance, formulation, inventory, locations, masters, procurement, production, sales, search, shipments, shop_floor},
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
        .route("/api/v1/users/:id", put(auth::update_user).delete(auth::delete_user))

        // Dashboard
        .route("/api/v1/dashboard/kpis", get(dashboard::get_dashboard))

        // Masters
        .route("/api/v1/customer-types",  get(masters::list_customer_types))
        .route("/api/v1/countries",        get(masters::list_countries))
        .route("/api/v1/customers",        get(masters::list_customers).post(masters::create_customer))
        .route("/api/v1/customers/:id",    put(masters::update_customer))
        .route("/api/v1/uoms",             get(masters::list_uoms))
        .route("/api/v1/items",            get(masters::list_items).post(masters::create_item))
        .route("/api/v1/items/:id",        put(masters::update_item))
        .route("/api/v1/items/:item_id/suppliers",
            get(masters::list_item_suppliers).post(masters::create_item_supplier))
        .route("/api/v1/items/:item_id/uom-conversions",
            get(masters::list_item_uom_conversions).post(masters::create_item_uom_conversion))
        .route("/api/v1/suppliers",        get(masters::list_suppliers).post(masters::create_supplier))
        .route("/api/v1/suppliers/:id",    put(masters::update_supplier))

        // Sales Orders
        .route("/api/v1/sales-orders",
            get(sales::list_sales_orders).post(sales::create_sales_order))
        .route("/api/v1/sales-orders/:id",
            get(sales::get_sales_order).put(sales::update_sales_order))
        .route("/api/v1/sales-orders/:so_id/lines",
            get(sales::list_so_lines).post(sales::create_so_line))
        .route("/api/v1/sales-orders/:so_id/lines/:line_id",
            put(sales::update_so_line).delete(sales::delete_so_line))

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

        // Formulations
        .route("/api/v1/formulations",
            get(formulation::list_formulations).post(formulation::create_formulation))
        .route("/api/v1/formulations/:id",
            get(formulation::get_formulation)
            .patch(formulation::patch_formulation)
            .delete(formulation::delete_formulation))
        .route("/api/v1/ingredients",
            get(formulation::list_ingredients).post(formulation::create_ingredient))
        .route("/api/v1/products",
            get(formulation::list_products))

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
        .route("/api/v1/receipts/:receipt_id/lines/:line_id",
            put(procurement::update_receipt_line))

        // Inventory
        .route("/api/v1/inventory",        get(inventory::list_inventory))
        .route("/api/v1/inventory/transact", post(inventory::transact_inventory))
        .route("/api/v1/inventory/transactions",
            get(inventory::list_inventory_transactions))
        .route("/api/v1/inventory/:item_id/cycle-count",
            post(inventory::cycle_count))

        // Warehouse Locations
        .route("/api/v1/locations",   get(locations::list_locations).post(locations::create_location))
        .route("/api/v1/locations/:id", put(locations::update_location))

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

        // Global Search
        .route("/api/v1/search", get(search::global_search))

        // Audit Trail
        .route("/api/v1/audit-logs", get(audit::list_audit_logs))

        // Work Centers
        .route("/api/v1/work-centers",
            get(shop_floor::list_work_centers).post(shop_floor::create_work_center))
        .route("/api/v1/work-centers/:id",
            put(shop_floor::update_work_center))

        // Routing Steps (per BOM)
        .route("/api/v1/boms/:bom_id/routing",
            get(shop_floor::list_routing_steps).post(shop_floor::create_routing_step))
        .route("/api/v1/boms/:bom_id/routing/:step_id",
            delete(shop_floor::delete_routing_step))

        // QC Tests (per batch)
        .route("/api/v1/production/batches/:batch_id/qc-tests",
            get(shop_floor::list_qc_tests).post(shop_floor::create_qc_test))
        .route("/api/v1/production/batches/:batch_id/qc-tests/:test_id",
            put(shop_floor::update_qc_test))

        // Downtime Events (per batch)
        .route("/api/v1/production/batches/:batch_id/downtime",
            get(shop_floor::list_downtime_events).post(shop_floor::create_downtime_event))
        .route("/api/v1/production/batches/:batch_id/downtime/:event_id",
            put(shop_floor::close_downtime_event))

        // Access Requests
        .route("/api/v1/access-requests",
            get(shop_floor::list_access_requests).post(shop_floor::create_access_request))
        .route("/api/v1/access-requests/:id",
            put(shop_floor::update_access_request))

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
