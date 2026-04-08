-- =============================================================================
-- SkyHigh MES — Mock Shipment Data
-- Seeds a minimal post-schema-v2 dataset for the shipping module.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Core master data required by sales orders and shipments
-- ---------------------------------------------------------------------------

INSERT INTO customer_types (id, name, created_at)
VALUES
    ('a1000000-0000-0000-0000-000000000001', 'Distributor', NOW()),
    ('a1000000-0000-0000-0000-000000000002', 'Retail Brand', NOW())
ON CONFLICT (name) DO NOTHING;

INSERT INTO countries (id, name, code, created_at)
VALUES
    ('a2000000-0000-0000-0000-000000000001', 'Singapore', 'SGP', NOW()),
    ('a2000000-0000-0000-0000-000000000002', 'United Arab Emirates', 'ARE', NOW())
ON CONFLICT (code) DO NOTHING;

INSERT INTO uoms (id, code, description)
VALUES
    ('a3000000-0000-0000-0000-000000000001', 'PCS', 'Pieces'),
    ('a3000000-0000-0000-0000-000000000002', 'BOX', 'Boxes')
ON CONFLICT (code) DO NOTHING;

INSERT INTO customers (id, name, customer_type_id, country_id, email, phone, address, created_at)
SELECT
    'a4000000-0000-0000-0000-000000000001',
    'Lumiere Retail Singapore',
    (SELECT id FROM customer_types WHERE name = 'Retail Brand' LIMIT 1),
    (SELECT id FROM countries WHERE code = 'SGP' LIMIT 1),
    'procurement@lumieresg.com',
    '+65 6123 7788',
    '12 Jurong Port Road, Singapore',
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM customers WHERE name = 'Lumiere Retail Singapore'
);

INSERT INTO customers (id, name, customer_type_id, country_id, email, phone, address, created_at)
SELECT
    'a4000000-0000-0000-0000-000000000002',
    'Aura Gulf Trading',
    (SELECT id FROM customer_types WHERE name = 'Distributor' LIMIT 1),
    (SELECT id FROM countries WHERE code = 'ARE' LIMIT 1),
    'ops@auragulf.ae',
    '+971 4 555 2040',
    'Dubai Investment Park 1, Dubai',
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM customers WHERE name = 'Aura Gulf Trading'
);

INSERT INTO items (id, item_code, description, item_type, uom_id, fda_required, is_active, created_at)
VALUES
    (
        'a5000000-0000-0000-0000-000000000001',
        'FG-1001',
        'HydraGlow Moisture Cream 50ml',
        'FG',
        (SELECT id FROM uoms WHERE code = 'PCS' LIMIT 1),
        FALSE,
        TRUE,
        NOW()
    ),
    (
        'a5000000-0000-0000-0000-000000000002',
        'FG-1002',
        'Daily Radiance Serum 30ml',
        'FG',
        (SELECT id FROM uoms WHERE code = 'PCS' LIMIT 1),
        TRUE,
        TRUE,
        NOW()
    ),
    (
        'a5000000-0000-0000-0000-000000000003',
        'FG-1003',
        'Calm Repair Essence 100ml',
        'FG',
        (SELECT id FROM uoms WHERE code = 'PCS' LIMIT 1),
        FALSE,
        TRUE,
        NOW()
    )
ON CONFLICT (item_code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Sales orders and line items to ship against
-- ---------------------------------------------------------------------------

INSERT INTO sales_orders (
    id,
    order_number,
    customer_id,
    country_id,
    status,
    artwork_status,
    fda_required,
    fda_status,
    total_pieces,
    order_date,
    required_date,
    notes,
    created_at
)
SELECT
    'a6000000-0000-0000-0000-000000000001',
    'SO-2026-1001',
    (SELECT id FROM customers WHERE name = 'Lumiere Retail Singapore' LIMIT 1),
    (SELECT id FROM countries WHERE code = 'SGP' LIMIT 1),
    'confirmed',
    'approved',
    FALSE,
    NULL,
    4200.0000,
    DATE '2026-03-18',
    DATE '2026-04-10',
    'Launch replenishment for Singapore retail channels.',
    NOW() - INTERVAL '18 days'
WHERE NOT EXISTS (
    SELECT 1 FROM sales_orders WHERE order_number = 'SO-2026-1001'
);

INSERT INTO sales_orders (
    id,
    order_number,
    customer_id,
    country_id,
    status,
    artwork_status,
    fda_required,
    fda_status,
    total_pieces,
    order_date,
    required_date,
    notes,
    created_at
)
SELECT
    'a6000000-0000-0000-0000-000000000002',
    'SO-2026-1002',
    (SELECT id FROM customers WHERE name = 'Aura Gulf Trading' LIMIT 1),
    (SELECT id FROM countries WHERE code = 'ARE' LIMIT 1),
    'in_production',
    'approved',
    TRUE,
    'approved',
    1800.0000,
    DATE '2026-03-26',
    DATE '2026-04-14',
    'Mixed serum and essence order for Gulf distributor.',
    NOW() - INTERVAL '11 days'
WHERE NOT EXISTS (
    SELECT 1 FROM sales_orders WHERE order_number = 'SO-2026-1002'
);

INSERT INTO sales_order_lines (id, sales_order_id, item_id, qty_ordered, uom_id, unit_price, notes)
SELECT
    'a6100000-0000-0000-0000-000000000001',
    (SELECT id FROM sales_orders WHERE order_number = 'SO-2026-1001' LIMIT 1),
    (SELECT id FROM items WHERE item_code = 'FG-1001' LIMIT 1),
    3000.0000,
    (SELECT id FROM uoms WHERE code = 'PCS' LIMIT 1),
    4.85,
    'Primary promo SKU for store display.'
WHERE NOT EXISTS (
    SELECT 1 FROM sales_order_lines WHERE id = 'a6100000-0000-0000-0000-000000000001'
);

INSERT INTO sales_order_lines (id, sales_order_id, item_id, qty_ordered, uom_id, unit_price, notes)
SELECT
    'a6100000-0000-0000-0000-000000000002',
    (SELECT id FROM sales_orders WHERE order_number = 'SO-2026-1001' LIMIT 1),
    (SELECT id FROM items WHERE item_code = 'FG-1003' LIMIT 1),
    1200.0000,
    (SELECT id FROM uoms WHERE code = 'PCS' LIMIT 1),
    5.10,
    'Secondary replenishment lot.'
WHERE NOT EXISTS (
    SELECT 1 FROM sales_order_lines WHERE id = 'a6100000-0000-0000-0000-000000000002'
);

INSERT INTO sales_order_lines (id, sales_order_id, item_id, qty_ordered, uom_id, unit_price, notes)
SELECT
    'a6100000-0000-0000-0000-000000000003',
    (SELECT id FROM sales_orders WHERE order_number = 'SO-2026-1002' LIMIT 1),
    (SELECT id FROM items WHERE item_code = 'FG-1002' LIMIT 1),
    1000.0000,
    (SELECT id FROM uoms WHERE code = 'PCS' LIMIT 1),
    6.40,
    'FDA-cleared serum batch for Dubai launch.'
WHERE NOT EXISTS (
    SELECT 1 FROM sales_order_lines WHERE id = 'a6100000-0000-0000-0000-000000000003'
);

INSERT INTO sales_order_lines (id, sales_order_id, item_id, qty_ordered, uom_id, unit_price, notes)
SELECT
    'a6100000-0000-0000-0000-000000000004',
    (SELECT id FROM sales_orders WHERE order_number = 'SO-2026-1002' LIMIT 1),
    (SELECT id FROM items WHERE item_code = 'FG-1003' LIMIT 1),
    800.0000,
    (SELECT id FROM uoms WHERE code = 'PCS' LIMIT 1),
    5.35,
    'Essence line packed in export cartons.'
WHERE NOT EXISTS (
    SELECT 1 FROM sales_order_lines WHERE id = 'a6100000-0000-0000-0000-000000000004'
);

-- ---------------------------------------------------------------------------
-- 3. Mock shipments
-- ---------------------------------------------------------------------------

INSERT INTO shipments (
    id,
    shipment_number,
    sales_order_id,
    status,
    carrier,
    tracking_number,
    loaded_at,
    dispatched_at,
    delivered_at,
    notes,
    created_at
)
SELECT
    'a7000000-0000-0000-0000-000000000001',
    'SHP-2026-0001',
    (SELECT id FROM sales_orders WHERE order_number = 'SO-2026-1001' LIMIT 1),
    'delivered',
    'DHL Supply Chain',
    'DHL-SG-440091',
    NOW() - INTERVAL '9 days',
    NOW() - INTERVAL '8 days 18 hours',
    NOW() - INTERVAL '5 days 4 hours',
    'Delivered to Singapore DC with full carton count confirmed.',
    NOW() - INTERVAL '9 days'
WHERE NOT EXISTS (
    SELECT 1 FROM shipments WHERE shipment_number = 'SHP-2026-0001'
);

INSERT INTO shipments (
    id,
    shipment_number,
    sales_order_id,
    status,
    carrier,
    tracking_number,
    loaded_at,
    dispatched_at,
    delivered_at,
    notes,
    created_at
)
SELECT
    'a7000000-0000-0000-0000-000000000002',
    'SHP-2026-0002',
    (SELECT id FROM sales_orders WHERE order_number = 'SO-2026-1002' LIMIT 1),
    'in_transit',
    'Emirates SkyCargo',
    'EK-DXB-220341',
    NOW() - INTERVAL '3 days 6 hours',
    NOW() - INTERVAL '3 days',
    NULL,
    'Air freight departed Bangkok and is pending customs release in Dubai.',
    NOW() - INTERVAL '3 days 8 hours'
WHERE NOT EXISTS (
    SELECT 1 FROM shipments WHERE shipment_number = 'SHP-2026-0002'
);

INSERT INTO shipments (
    id,
    shipment_number,
    sales_order_id,
    status,
    carrier,
    tracking_number,
    loaded_at,
    dispatched_at,
    delivered_at,
    notes,
    created_at
)
SELECT
    'a7000000-0000-0000-0000-000000000003',
    'SHP-2026-0003',
    (SELECT id FROM sales_orders WHERE order_number = 'SO-2026-1002' LIMIT 1),
    'loading',
    'Kerry Logistics',
    NULL,
    NOW() - INTERVAL '6 hours',
    NULL,
    NULL,
    'Second wave shipment is being palletized for pickup.',
    NOW() - INTERVAL '8 hours'
WHERE NOT EXISTS (
    SELECT 1 FROM shipments WHERE shipment_number = 'SHP-2026-0003'
);

-- ---------------------------------------------------------------------------
-- 4. Shipment lines
-- ---------------------------------------------------------------------------

INSERT INTO shipment_lines (id, shipment_id, item_id, batch_id, qty_shipped, uom_id)
SELECT
    'a7100000-0000-0000-0000-000000000001',
    (SELECT id FROM shipments WHERE shipment_number = 'SHP-2026-0001' LIMIT 1),
    (SELECT id FROM items WHERE item_code = 'FG-1001' LIMIT 1),
    NULL,
    2400.0000,
    (SELECT id FROM uoms WHERE code = 'PCS' LIMIT 1)
WHERE NOT EXISTS (
    SELECT 1 FROM shipment_lines WHERE id = 'a7100000-0000-0000-0000-000000000001'
);

INSERT INTO shipment_lines (id, shipment_id, item_id, batch_id, qty_shipped, uom_id)
SELECT
    'a7100000-0000-0000-0000-000000000002',
    (SELECT id FROM shipments WHERE shipment_number = 'SHP-2026-0001' LIMIT 1),
    (SELECT id FROM items WHERE item_code = 'FG-1003' LIMIT 1),
    NULL,
    1200.0000,
    (SELECT id FROM uoms WHERE code = 'PCS' LIMIT 1)
WHERE NOT EXISTS (
    SELECT 1 FROM shipment_lines WHERE id = 'a7100000-0000-0000-0000-000000000002'
);

INSERT INTO shipment_lines (id, shipment_id, item_id, batch_id, qty_shipped, uom_id)
SELECT
    'a7100000-0000-0000-0000-000000000003',
    (SELECT id FROM shipments WHERE shipment_number = 'SHP-2026-0002' LIMIT 1),
    (SELECT id FROM items WHERE item_code = 'FG-1002' LIMIT 1),
    NULL,
    1000.0000,
    (SELECT id FROM uoms WHERE code = 'PCS' LIMIT 1)
WHERE NOT EXISTS (
    SELECT 1 FROM shipment_lines WHERE id = 'a7100000-0000-0000-0000-000000000003'
);

INSERT INTO shipment_lines (id, shipment_id, item_id, batch_id, qty_shipped, uom_id)
SELECT
    'a7100000-0000-0000-0000-000000000004',
    (SELECT id FROM shipments WHERE shipment_number = 'SHP-2026-0003' LIMIT 1),
    (SELECT id FROM items WHERE item_code = 'FG-1003' LIMIT 1),
    NULL,
    400.0000,
    (SELECT id FROM uoms WHERE code = 'PCS' LIMIT 1)
WHERE NOT EXISTS (
    SELECT 1 FROM shipment_lines WHERE id = 'a7100000-0000-0000-0000-000000000004'
);

-- ---------------------------------------------------------------------------
-- 5. Shipping documents
-- ---------------------------------------------------------------------------

INSERT INTO shipping_documents (id, shipment_id, doc_type, file_url, issued_at)
SELECT
    'a7200000-0000-0000-0000-000000000001',
    (SELECT id FROM shipments WHERE shipment_number = 'SHP-2026-0001' LIMIT 1),
    'Packing List',
    'https://example.com/docs/shipments/shp-2026-0001-packing-list.pdf',
    NOW() - INTERVAL '9 days'
WHERE NOT EXISTS (
    SELECT 1 FROM shipping_documents WHERE id = 'a7200000-0000-0000-0000-000000000001'
);

INSERT INTO shipping_documents (id, shipment_id, doc_type, file_url, issued_at)
SELECT
    'a7200000-0000-0000-0000-000000000002',
    (SELECT id FROM shipments WHERE shipment_number = 'SHP-2026-0001' LIMIT 1),
    'Bill of Lading',
    'https://example.com/docs/shipments/shp-2026-0001-bol.pdf',
    NOW() - INTERVAL '8 days 20 hours'
WHERE NOT EXISTS (
    SELECT 1 FROM shipping_documents WHERE id = 'a7200000-0000-0000-0000-000000000002'
);

INSERT INTO shipping_documents (id, shipment_id, doc_type, file_url, issued_at)
SELECT
    'a7200000-0000-0000-0000-000000000003',
    (SELECT id FROM shipments WHERE shipment_number = 'SHP-2026-0002' LIMIT 1),
    'COA',
    'https://example.com/docs/shipments/shp-2026-0002-coa.pdf',
    NOW() - INTERVAL '3 days 2 hours'
WHERE NOT EXISTS (
    SELECT 1 FROM shipping_documents WHERE id = 'a7200000-0000-0000-0000-000000000003'
);

INSERT INTO shipping_documents (id, shipment_id, doc_type, file_url, issued_at)
SELECT
    'a7200000-0000-0000-0000-000000000004',
    (SELECT id FROM shipments WHERE shipment_number = 'SHP-2026-0003' LIMIT 1),
    'Draft Packing List',
    'https://example.com/docs/shipments/shp-2026-0003-draft-packing-list.pdf',
    NOW() - INTERVAL '6 hours'
WHERE NOT EXISTS (
    SELECT 1 FROM shipping_documents WHERE id = 'a7200000-0000-0000-0000-000000000004'
);