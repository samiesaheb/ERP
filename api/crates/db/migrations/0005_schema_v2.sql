-- =============================================================================
-- SkyHigh MES — Schema v2
-- Derived from: SkyHigh Manufacturing Execution Workflow (Draft 2, 6/3/2026)
-- Replaces all prior tables and enum types with a TEXT-based status model.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Drop MRP tables added in migration 0004
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS required_items CASCADE;
DROP TABLE IF EXISTS item_period CASCADE;
DROP TABLE IF EXISTS periods CASCADE;

-- ---------------------------------------------------------------------------
-- 2. Drop all old tables (deepest FK dependencies first)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS item_management_txns;
DROP TABLE IF EXISTS production_batches;
DROP TABLE IF EXISTS grn_lines;
DROP TABLE IF EXISTS grn;
DROP TABLE IF EXISTS inventory_txns;
DROP TABLE IF EXISTS inventory;
DROP TABLE IF EXISTS po_lines;
DROP TABLE IF EXISTS purchase_orders;
DROP TABLE IF EXISTS artwork_docs;
DROP TABLE IF EXISTS manufacturing_orders;
DROP TABLE IF EXISTS sales_orders;
DROP TABLE IF EXISTS bom_lines;
DROP TABLE IF EXISTS boms;
DROP TABLE IF EXISTS uom_conversions;
DROP TABLE IF EXISTS item_suppliers;
DROP TABLE IF EXISTS items;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS uoms;
DROP TABLE IF EXISTS countries;
DROP TABLE IF EXISTS customer_types;

-- ---------------------------------------------------------------------------
-- 3. Drop all old PostgreSQL enum types
-- ---------------------------------------------------------------------------
DROP TYPE IF EXISTS item_type;
DROP TYPE IF EXISTS supplier_type;
DROP TYPE IF EXISTS so_status;
DROP TYPE IF EXISTS artwork_status;
DROP TYPE IF EXISTS fda_status;
DROP TYPE IF EXISTS bom_status;
DROP TYPE IF EXISTS po_status;
DROP TYPE IF EXISTS qc_status;
DROP TYPE IF EXISTS inventory_txn_type;
DROP TYPE IF EXISTS mo_status;
DROP TYPE IF EXISTS batch_stage;
DROP TYPE IF EXISTS batch_status;
DROP TYPE IF EXISTS item_mgmt_txn_type;
DROP TYPE IF EXISTS invoice_status;

-- ---------------------------------------------------------------------------
-- 4. Extend users table (preserve existing rows + credentials)
-- ---------------------------------------------------------------------------
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS name      TEXT    NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS role      TEXT    NOT NULL DEFAULT 'viewer',
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE users SET name = 'Admin', role = 'admin' WHERE email = 'admin@skyhigh.com';

-- =============================================================================
-- 5. Master tables
-- =============================================================================

CREATE TABLE customer_types (
    id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name       TEXT        NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE countries (
    id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name       TEXT        NOT NULL,
    code       CHAR(3)     NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE customers (
    id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name             TEXT        NOT NULL,
    customer_type_id UUID        NOT NULL REFERENCES customer_types(id),
    country_id       UUID        NOT NULL REFERENCES countries(id),
    email            TEXT,
    phone            TEXT,
    address          TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE uoms (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code        VARCHAR(20) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE suppliers (
    id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          TEXT        NOT NULL,
    supplier_type TEXT        NOT NULL DEFAULT 'local',  -- local / international
    country_id    UUID        NOT NULL REFERENCES countries(id),
    email         TEXT,
    phone         TEXT,
    address       TEXT,
    payment_terms TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 6. Item master
-- =============================================================================

CREATE TABLE items (
    id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_code    TEXT        NOT NULL UNIQUE,
    description  TEXT        NOT NULL,
    item_type    TEXT        NOT NULL,               -- FG / RawMat / PackMat
    uom_id       UUID        NOT NULL REFERENCES uoms(id),
    fda_required BOOLEAN     NOT NULL DEFAULT FALSE,
    is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE item_uom_conversions (
    id                UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id           UUID         NOT NULL REFERENCES items(id),
    from_uom_id       UUID         NOT NULL REFERENCES uoms(id),
    to_uom_id         UUID         NOT NULL REFERENCES uoms(id),
    conversion_factor NUMERIC(18,6) NOT NULL,
    UNIQUE (item_id, from_uom_id, to_uom_id)
);

CREATE TABLE item_supplier (
    id                 UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id            UUID          NOT NULL REFERENCES items(id),
    supplier_id        UUID          NOT NULL REFERENCES suppliers(id),
    supplier_item_code TEXT,
    lead_time_days     INT,
    unit_cost          NUMERIC(18,4),
    preferred          BOOLEAN       NOT NULL DEFAULT FALSE,
    UNIQUE (item_id, supplier_id)
);

-- =============================================================================
-- 7. BOM / Formulation
-- =============================================================================

CREATE TABLE boms (
    id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    finished_good_id UUID        NOT NULL REFERENCES items(id),
    version          INT         NOT NULL DEFAULT 1,
    description      TEXT,
    is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE bom_lines (
    id                 UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    bom_id             UUID          NOT NULL REFERENCES boms(id) ON DELETE CASCADE,
    component_item_id  UUID          NOT NULL REFERENCES items(id),
    qty_required       NUMERIC(18,6) NOT NULL,
    uom_id             UUID          NOT NULL REFERENCES uoms(id),
    notes              TEXT,
    UNIQUE (bom_id, component_item_id)
);

-- =============================================================================
-- 8. Sales Orders
-- =============================================================================

CREATE TABLE sales_orders (
    id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number   TEXT          NOT NULL UNIQUE,
    customer_id    UUID          NOT NULL REFERENCES customers(id),
    country_id     UUID          NOT NULL REFERENCES countries(id),
    status         TEXT          NOT NULL DEFAULT 'draft',
    -- draft / confirmed / in_production / shipped / invoiced / cancelled
    artwork_status TEXT,         -- pending / in_review / approved
    fda_required   BOOLEAN       NOT NULL DEFAULT FALSE,
    fda_status     TEXT,         -- pending / submitted / approved
    total_pieces   NUMERIC(18,2),
    order_date     DATE,
    required_date  DATE,
    notes          TEXT,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE sales_order_lines (
    id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    sales_order_id UUID          NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    item_id        UUID          NOT NULL REFERENCES items(id),
    qty_ordered    NUMERIC(18,4) NOT NULL,
    uom_id         UUID          NOT NULL REFERENCES uoms(id),
    unit_price     NUMERIC(18,4),
    notes          TEXT
);

-- =============================================================================
-- 9. Artwork & FDA
-- =============================================================================

CREATE TABLE artworks (
    id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    sales_order_id UUID        NOT NULL REFERENCES sales_orders(id),
    item_id        UUID        NOT NULL REFERENCES items(id),
    version        INT         NOT NULL DEFAULT 1,
    status         TEXT        NOT NULL DEFAULT 'draft',
    -- draft / in_review / approved / rejected
    file_url       TEXT,
    submitted_at   TIMESTAMPTZ,
    approved_at    TIMESTAMPTZ,
    notes          TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE fda_registrations (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    sales_order_id      UUID        NOT NULL REFERENCES sales_orders(id),
    item_id             UUID        NOT NULL REFERENCES items(id),
    registration_number TEXT,
    status              TEXT        NOT NULL DEFAULT 'pending',
    -- pending / submitted / approved / rejected
    submitted_at        TIMESTAMPTZ,
    approved_at         TIMESTAMPTZ,
    expiry_date         DATE,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE fda_documents (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    fda_registration_id UUID        NOT NULL REFERENCES fda_registrations(id) ON DELETE CASCADE,
    doc_type            TEXT        NOT NULL,
    file_url            TEXT        NOT NULL,
    uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 10. Manufacturing Orders
-- =============================================================================

CREATE TABLE manufacturing_orders (
    id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    mo_number      TEXT          NOT NULL UNIQUE,
    sales_order_id UUID          REFERENCES sales_orders(id),   -- nullable: standalone MO
    item_id        UUID          NOT NULL REFERENCES items(id),
    bom_id         UUID          NOT NULL REFERENCES boms(id),
    status         TEXT          NOT NULL DEFAULT 'draft',
    -- draft / planned / in_progress / completed / cancelled
    qty_planned    NUMERIC(18,4) NOT NULL,
    qty_produced   NUMERIC(18,4) NOT NULL DEFAULT 0,
    uom_id         UUID          NOT NULL REFERENCES uoms(id),
    planned_start  DATE,
    planned_end    DATE,
    actual_start   TIMESTAMPTZ,
    actual_end     TIMESTAMPTZ,
    notes          TEXT,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 11. Purchase Orders
-- =============================================================================

CREATE TABLE purchase_orders (
    id                     UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number              TEXT        NOT NULL UNIQUE,
    supplier_id            UUID        NOT NULL REFERENCES suppliers(id),
    manufacturing_order_id UUID        REFERENCES manufacturing_orders(id),
    status                 TEXT        NOT NULL DEFAULT 'draft',
    -- draft / sent / confirmed / partially_received / received / cancelled
    order_date             DATE,
    expected_date          DATE,
    notes                  TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE purchase_order_lines (
    id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID          NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    item_id           UUID          NOT NULL REFERENCES items(id),
    qty_ordered       NUMERIC(18,4) NOT NULL,
    qty_received      NUMERIC(18,4) NOT NULL DEFAULT 0,
    uom_id            UUID          NOT NULL REFERENCES uoms(id),
    unit_cost         NUMERIC(18,4)
);

-- =============================================================================
-- 12. Receiving
-- =============================================================================

CREATE TABLE receipts (
    id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_number    TEXT        NOT NULL UNIQUE,
    purchase_order_id UUID        NOT NULL REFERENCES purchase_orders(id),
    received_by       UUID        REFERENCES users(id),
    received_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes             TEXT
);

CREATE TABLE receipt_lines (
    id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_id   UUID          NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    po_line_id   UUID          NOT NULL REFERENCES purchase_order_lines(id),
    item_id      UUID          NOT NULL REFERENCES items(id),
    qty_received NUMERIC(18,4) NOT NULL,
    uom_id       UUID          NOT NULL REFERENCES uoms(id),
    lot_number   TEXT,
    expiry_date  DATE,
    qc_status    TEXT          NOT NULL DEFAULT 'pending'
    -- pending / passed / failed
);

-- =============================================================================
-- 13. Inventory
-- =============================================================================

CREATE TABLE inventory (
    id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id       UUID          NOT NULL REFERENCES items(id),
    location      TEXT,
    lot_number    TEXT,
    qty_available NUMERIC(18,4) NOT NULL DEFAULT 0,
    qty_reserved  NUMERIC(18,4) NOT NULL DEFAULT 0,
    uom_id        UUID          NOT NULL REFERENCES uoms(id),
    last_updated  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE inventory_transactions (
    id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id          UUID          NOT NULL REFERENCES items(id),
    transaction_type TEXT          NOT NULL,
    -- receipt / issue / return / conversion / loss / adjustment
    reference_type   TEXT,
    reference_id     UUID,
    qty              NUMERIC(18,4) NOT NULL,
    uom_id           UUID          REFERENCES uoms(id),
    lot_number       TEXT,
    notes            TEXT,
    created_by       UUID          REFERENCES users(id),
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 14. Production — Batches
-- =============================================================================

CREATE TABLE production_batches (
    id                     UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_number           TEXT          NOT NULL UNIQUE,
    manufacturing_order_id UUID          NOT NULL REFERENCES manufacturing_orders(id),
    bom_id                 UUID          NOT NULL REFERENCES boms(id),
    status                 TEXT          NOT NULL DEFAULT 'planned',
    -- planned / bulk_production / filling / packing / completed
    qty_bulk_produced      NUMERIC(18,4),
    qty_filled             NUMERIC(18,4),
    qty_packed             NUMERIC(18,4),
    uom_id                 UUID          NOT NULL REFERENCES uoms(id),
    bulk_start             TIMESTAMPTZ,
    bulk_end               TIMESTAMPTZ,
    fill_start             TIMESTAMPTZ,
    fill_end               TIMESTAMPTZ,
    pack_start             TIMESTAMPTZ,
    pack_end               TIMESTAMPTZ,
    notes                  TEXT,
    created_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE batch_component_issues (
    id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id     UUID          NOT NULL REFERENCES production_batches(id),
    item_id      UUID          NOT NULL REFERENCES items(id),
    qty_issued   NUMERIC(18,4) NOT NULL,
    qty_returned NUMERIC(18,4) NOT NULL DEFAULT 0,
    qty_loss     NUMERIC(18,4) NOT NULL DEFAULT 0,
    uom_id       UUID          NOT NULL REFERENCES uoms(id),
    lot_number   TEXT,
    issued_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 15. Shipping
-- =============================================================================

CREATE TABLE shipments (
    id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_number  TEXT        NOT NULL UNIQUE,
    sales_order_id   UUID        NOT NULL REFERENCES sales_orders(id),
    status           TEXT        NOT NULL DEFAULT 'loading',
    -- loading / dispatched / in_transit / delivered
    carrier          TEXT,
    tracking_number  TEXT,
    loaded_at        TIMESTAMPTZ,
    dispatched_at    TIMESTAMPTZ,
    delivered_at     TIMESTAMPTZ,
    notes            TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE shipment_lines (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id     UUID          NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    item_id         UUID          NOT NULL REFERENCES items(id),
    batch_id        UUID          REFERENCES production_batches(id),
    qty_shipped     NUMERIC(18,4) NOT NULL,
    uom_id          UUID          NOT NULL REFERENCES uoms(id)
);

CREATE TABLE shipping_documents (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id UUID        NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    doc_type    TEXT        NOT NULL,
    file_url    TEXT        NOT NULL,
    issued_at   TIMESTAMPTZ
);

-- =============================================================================
-- 16. Invoicing
-- =============================================================================

CREATE TABLE invoices (
    id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number TEXT          NOT NULL UNIQUE,
    customer_id    UUID          NOT NULL REFERENCES customers(id),
    sales_order_id UUID          NOT NULL REFERENCES sales_orders(id),
    shipment_id    UUID          REFERENCES shipments(id),
    status         TEXT          NOT NULL DEFAULT 'draft',
    -- draft / sent / partially_paid / paid / overdue / cancelled
    issue_date     DATE,
    due_date       DATE,
    subtotal       NUMERIC(18,4),
    tax            NUMERIC(18,4) NOT NULL DEFAULT 0,
    total          NUMERIC(18,4),
    currency       VARCHAR(3)    NOT NULL DEFAULT 'USD',
    notes          TEXT,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE invoice_lines (
    id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id  UUID          NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    item_id     UUID          REFERENCES items(id),
    description TEXT,
    qty         NUMERIC(18,4) NOT NULL,
    uom_id      UUID          NOT NULL REFERENCES uoms(id),
    unit_price  NUMERIC(18,4) NOT NULL,
    line_total  NUMERIC(18,4) NOT NULL
);

-- =============================================================================
-- 17. Payment Management
-- =============================================================================

CREATE TABLE payments (
    id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_number    TEXT          NOT NULL UNIQUE,
    payment_type      TEXT          NOT NULL,   -- customer / supplier
    customer_id       UUID          REFERENCES customers(id),
    supplier_id       UUID          REFERENCES suppliers(id),
    invoice_id        UUID          REFERENCES invoices(id),
    purchase_order_id UUID          REFERENCES purchase_orders(id),
    amount            NUMERIC(18,4) NOT NULL,
    currency          VARCHAR(3)    NOT NULL DEFAULT 'USD',
    payment_date      DATE,
    method            TEXT,         -- Wire / ACH / Check / Credit
    reference         TEXT,
    status            TEXT          NOT NULL DEFAULT 'pending',
    -- pending / cleared / failed
    notes             TEXT,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 18. Planning
-- =============================================================================

CREATE TABLE production_plans (
    id                     UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_date              DATE          NOT NULL,
    manufacturing_order_id UUID          NOT NULL REFERENCES manufacturing_orders(id),
    purchase_order_id      UUID          REFERENCES purchase_orders(id),
    planned_qty            NUMERIC(18,4),
    notes                  TEXT,
    created_by             UUID          REFERENCES users(id),
    created_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 19. Indexes
-- =============================================================================

CREATE INDEX idx_customers_type       ON customers(customer_type_id);
CREATE INDEX idx_customers_country    ON customers(country_id);
CREATE INDEX idx_items_type           ON items(item_type);
CREATE INDEX idx_items_active         ON items(is_active);
CREATE INDEX idx_item_supplier_item   ON item_supplier(item_id);
CREATE INDEX idx_bom_lines_bom        ON bom_lines(bom_id);
CREATE INDEX idx_so_status            ON sales_orders(status);
CREATE INDEX idx_so_customer          ON sales_orders(customer_id);
CREATE INDEX idx_so_lines_so          ON sales_order_lines(sales_order_id);
CREATE INDEX idx_artworks_so          ON artworks(sales_order_id);
CREATE INDEX idx_fda_reg_so           ON fda_registrations(sales_order_id);
CREATE INDEX idx_mo_status            ON manufacturing_orders(status);
CREATE INDEX idx_mo_so                ON manufacturing_orders(sales_order_id);
CREATE INDEX idx_po_status            ON purchase_orders(status);
CREATE INDEX idx_po_supplier          ON purchase_orders(supplier_id);
CREATE INDEX idx_po_lines_po          ON purchase_order_lines(purchase_order_id);
CREATE INDEX idx_receipts_po          ON receipts(purchase_order_id);
CREATE INDEX idx_receipt_lines        ON receipt_lines(receipt_id);
CREATE INDEX idx_inv_item             ON inventory(item_id);
CREATE INDEX idx_inv_txn_item         ON inventory_transactions(item_id);
CREATE INDEX idx_batch_mo             ON production_batches(manufacturing_order_id);
CREATE INDEX idx_batch_status         ON production_batches(status);
CREATE INDEX idx_shipments_so         ON shipments(sales_order_id);
CREATE INDEX idx_shipments_status     ON shipments(status);
CREATE INDEX idx_invoices_customer    ON invoices(customer_id);
CREATE INDEX idx_invoices_status      ON invoices(status);
CREATE INDEX idx_payments_type        ON payments(payment_type);

-- =============================================================================
-- 20. Re-seed master data
-- =============================================================================

INSERT INTO customer_types (id, name) VALUES
    ('11111111-0001-0001-0001-000000000001', 'Distributor'),
    ('11111111-0001-0001-0001-000000000002', 'Retailer'),
    ('11111111-0001-0001-0001-000000000003', 'Direct Brand');

INSERT INTO countries (id, name, code) VALUES
    ('22222222-0002-0002-0002-000000000001', 'Thailand',   'THA'),
    ('22222222-0002-0002-0002-000000000002', 'Singapore',  'SGP'),
    ('22222222-0002-0002-0002-000000000003', 'Vietnam',    'VNM'),
    ('22222222-0002-0002-0002-000000000004', 'Malaysia',   'MYS'),
    ('22222222-0002-0002-0002-000000000005', 'UAE',        'ARE');

INSERT INTO customers (id, name, customer_type_id, country_id, email) VALUES
    ('66666666-0006-0006-0006-000000000001', 'Bangkok Beauty Co.',    '11111111-0001-0001-0001-000000000001', '22222222-0002-0002-0002-000000000001', 'orders@bangkokbeauty.com'),
    ('66666666-0006-0006-0006-000000000002', 'SG Cosmetics Pte Ltd',  '11111111-0001-0001-0001-000000000002', '22222222-0002-0002-0002-000000000002', 'purchasing@sgcosmetics.sg'),
    ('66666666-0006-0006-0006-000000000003', 'Hanoi Pharma',          '11111111-0001-0001-0001-000000000003', '22222222-0002-0002-0002-000000000003', NULL),
    ('66666666-0006-0006-0006-000000000004', 'KL Retail Group',       '11111111-0001-0001-0001-000000000002', '22222222-0002-0002-0002-000000000004', 'kl@retailgroup.my'),
    ('66666666-0006-0006-0006-000000000005', 'Gulf Beauty Trading',   '11111111-0001-0001-0001-000000000001', '22222222-0002-0002-0002-000000000005', 'trade@gulfbeauty.ae');

INSERT INTO uoms (id, code, description) VALUES
    ('33333333-0003-0003-0003-000000000001', 'KG',  'Kilogram'),
    ('33333333-0003-0003-0003-000000000002', 'PCS', 'Pieces'),
    ('33333333-0003-0003-0003-000000000003', 'L',   'Litre'),
    ('33333333-0003-0003-0003-000000000004', 'BOX', 'Box'),
    ('33333333-0003-0003-0003-000000000005', 'G',   'Gram'),
    ('33333333-0003-0003-0003-000000000006', 'ML',  'Millilitre');

INSERT INTO suppliers (id, name, supplier_type, country_id, email, payment_terms) VALUES
    ('77777777-0007-0007-0007-000000000001', 'Thai Chem Supplies Co.',   'local',         '22222222-0002-0002-0002-000000000001', 'procurement@thaichem.th',   'Net 30'),
    ('77777777-0007-0007-0007-000000000002', 'Global Packaging Ltd.',    'international', '22222222-0002-0002-0002-000000000002', 'sales@globalpack.sg',       'Net 45');

INSERT INTO items (id, item_code, description, item_type, uom_id, fda_required, is_active) VALUES
    -- Finished Goods
    ('55555555-0005-0005-0005-000000000001', 'FG-001', 'Moisturising Cream 50ml',    'FG',      '33333333-0003-0003-0003-000000000002', TRUE,  TRUE),
    ('55555555-0005-0005-0005-000000000002', 'FG-002', 'Sunscreen SPF50 100ml',      'FG',      '33333333-0003-0003-0003-000000000002', TRUE,  TRUE),
    -- Raw Materials
    ('55555555-0005-0005-0005-000000000003', 'RM-001', 'Shea Butter',                'RawMat',  '33333333-0003-0003-0003-000000000001', FALSE, TRUE),
    ('55555555-0005-0005-0005-000000000004', 'RM-002', 'Zinc Oxide',                 'RawMat',  '33333333-0003-0003-0003-000000000001', FALSE, TRUE),
    ('55555555-0005-0005-0005-000000000005', 'RM-003', 'Titanium Dioxide',           'RawMat',  '33333333-0003-0003-0003-000000000001', FALSE, TRUE),
    -- Packaging Materials
    ('55555555-0005-0005-0005-000000000006', 'PM-001', 'Airless Pump Bottle 50ml',   'PackMat', '33333333-0003-0003-0003-000000000002', FALSE, TRUE),
    ('55555555-0005-0005-0005-000000000007', 'PM-002', 'Tube 100ml',                 'PackMat', '33333333-0003-0003-0003-000000000002', FALSE, TRUE);

INSERT INTO boms (id, finished_good_id, version, description, is_active) VALUES
    ('88888888-0008-0008-0008-000000000001', '55555555-0005-0005-0005-000000000001', 1, 'Moisturising Cream 50ml — Standard Formula', TRUE),
    ('88888888-0008-0008-0008-000000000002', '55555555-0005-0005-0005-000000000002', 1, 'Sunscreen SPF50 100ml — Standard Formula',   TRUE);

INSERT INTO bom_lines (bom_id, component_item_id, qty_required, uom_id) VALUES
    -- BOM for FG-001
    ('88888888-0008-0008-0008-000000000001', '55555555-0005-0005-0005-000000000003', 0.150000, '33333333-0003-0003-0003-000000000001'),
    ('88888888-0008-0008-0008-000000000001', '55555555-0005-0005-0005-000000000006', 1.000000, '33333333-0003-0003-0003-000000000002'),
    -- BOM for FG-002
    ('88888888-0008-0008-0008-000000000002', '55555555-0005-0005-0005-000000000004', 0.080000, '33333333-0003-0003-0003-000000000001'),
    ('88888888-0008-0008-0008-000000000002', '55555555-0005-0005-0005-000000000005', 0.050000, '33333333-0003-0003-0003-000000000001'),
    ('88888888-0008-0008-0008-000000000002', '55555555-0005-0005-0005-000000000007', 1.000000, '33333333-0003-0003-0003-000000000002');

INSERT INTO inventory (item_id, qty_available, qty_reserved, uom_id) VALUES
    ('55555555-0005-0005-0005-000000000003', 250.000, 0, '33333333-0003-0003-0003-000000000001'),
    ('55555555-0005-0005-0005-000000000004', 120.000, 0, '33333333-0003-0003-0003-000000000001'),
    ('55555555-0005-0005-0005-000000000005',  80.000, 0, '33333333-0003-0003-0003-000000000001'),
    ('55555555-0005-0005-0005-000000000006', 500.000, 0, '33333333-0003-0003-0003-000000000002'),
    ('55555555-0005-0005-0005-000000000007', 300.000, 0, '33333333-0003-0003-0003-000000000002');
