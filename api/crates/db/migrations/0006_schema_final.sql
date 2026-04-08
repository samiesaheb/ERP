-- =============================================================================
-- SkyHigh MES — Final Schema
-- Authoritative implementation of database_schema.md (Draft 2, 6/3/2026).
-- Replaces all prior tables with a clean, consistent schema.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Drop all existing tables (deepest FK dependencies first)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS production_plans       CASCADE;
DROP TABLE IF EXISTS payments               CASCADE;
DROP TABLE IF EXISTS invoice_lines          CASCADE;
DROP TABLE IF EXISTS invoices               CASCADE;
DROP TABLE IF EXISTS shipping_documents     CASCADE;
DROP TABLE IF EXISTS shipment_lines         CASCADE;
DROP TABLE IF EXISTS shipments              CASCADE;
DROP TABLE IF EXISTS batch_component_issues CASCADE;
DROP TABLE IF EXISTS production_batches     CASCADE;
DROP TABLE IF EXISTS inventory_transactions CASCADE;
DROP TABLE IF EXISTS inventory              CASCADE;
DROP TABLE IF EXISTS receipt_lines          CASCADE;
DROP TABLE IF EXISTS receipts               CASCADE;
DROP TABLE IF EXISTS purchase_order_lines   CASCADE;
DROP TABLE IF EXISTS purchase_orders        CASCADE;
DROP TABLE IF EXISTS manufacturing_orders   CASCADE;
DROP TABLE IF EXISTS fda_documents          CASCADE;
DROP TABLE IF EXISTS fda_registrations      CASCADE;
DROP TABLE IF EXISTS artworks               CASCADE;
DROP TABLE IF EXISTS sales_order_lines      CASCADE;
DROP TABLE IF EXISTS sales_orders           CASCADE;
DROP TABLE IF EXISTS bom_lines              CASCADE;
DROP TABLE IF EXISTS boms                   CASCADE;
DROP TABLE IF EXISTS item_uom_conversions   CASCADE;
DROP TABLE IF EXISTS item_supplier          CASCADE;
DROP TABLE IF EXISTS items                  CASCADE;
DROP TABLE IF EXISTS suppliers              CASCADE;
DROP TABLE IF EXISTS customers              CASCADE;
DROP TABLE IF EXISTS customer_types         CASCADE;
DROP TABLE IF EXISTS countries              CASCADE;
DROP TABLE IF EXISTS uoms                   CASCADE;

-- =============================================================================
-- 2. Extensions
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 3. Users (preserve existing rows — auth must survive migration)
-- =============================================================================
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS name      TEXT    NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS role      TEXT    NOT NULL DEFAULT 'viewer',
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Roles: admin / planner / production / warehouse / finance / viewer
UPDATE users SET name = 'Admin', role = 'admin' WHERE email = 'admin@skyhigh.com';

-- =============================================================================
-- 4. Master Tables
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
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    code        VARCHAR(20) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE suppliers (
    id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          TEXT        NOT NULL,
    supplier_type TEXT        NOT NULL DEFAULT 'local', -- local / international
    country_id    UUID        NOT NULL REFERENCES countries(id),
    email         TEXT,
    phone         TEXT,
    address       TEXT,
    payment_terms TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 5. Item Master
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
    id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id           UUID          NOT NULL REFERENCES items(id),
    from_uom_id       UUID          NOT NULL REFERENCES uoms(id),
    to_uom_id         UUID          NOT NULL REFERENCES uoms(id),
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
-- 6. BOM / Formulation
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
    id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    bom_id            UUID          NOT NULL REFERENCES boms(id) ON DELETE CASCADE,
    component_item_id UUID          NOT NULL REFERENCES items(id),
    qty_required      NUMERIC(18,6) NOT NULL,
    uom_id            UUID          NOT NULL REFERENCES uoms(id),
    notes             TEXT,
    UNIQUE (bom_id, component_item_id)
);

-- =============================================================================
-- 7. Sales Orders
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
-- 8. Artwork & FDA
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
-- 9. Manufacturing Orders
-- =============================================================================

CREATE TABLE manufacturing_orders (
    id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    mo_number      TEXT          NOT NULL UNIQUE,
    sales_order_id UUID          REFERENCES sales_orders(id),  -- nullable: standalone MO
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
-- 10. Purchase Orders
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
-- 11. Receiving
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
-- 12. Inventory
-- =============================================================================

CREATE TABLE inventory (
    id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id       UUID          NOT NULL UNIQUE REFERENCES items(id),
    -- UNIQUE: one balance row per item; location/lot tracked via transactions
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
    qty              NUMERIC(18,4) NOT NULL, -- positive = in, negative = out
    uom_id           UUID          REFERENCES uoms(id),
    lot_number       TEXT,
    notes            TEXT,
    created_by       UUID          REFERENCES users(id),
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 13. Production — Batches
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
-- 14. Shipping
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
    -- Bill of Lading / Packing List / COA / COO
    file_url    TEXT        NOT NULL,
    issued_at   TIMESTAMPTZ
);

-- =============================================================================
-- 15. Invoicing
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
-- 16. Payment Management
-- =============================================================================

CREATE TABLE payments (
    id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_number    TEXT          NOT NULL UNIQUE,
    payment_type      TEXT          NOT NULL,            -- customer / supplier
    customer_id       UUID          REFERENCES customers(id),
    supplier_id       UUID          REFERENCES suppliers(id),
    invoice_id        UUID          REFERENCES invoices(id),
    purchase_order_id UUID          REFERENCES purchase_orders(id),
    amount            NUMERIC(18,4) NOT NULL,
    currency          VARCHAR(3)    NOT NULL DEFAULT 'USD',
    payment_date      DATE,
    method            TEXT,                              -- Wire / ACH / Check / Credit
    reference         TEXT,
    status            TEXT          NOT NULL DEFAULT 'pending',
    -- pending / cleared / failed
    notes             TEXT,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 17. Planning
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
-- 18. Indexes
-- =============================================================================

-- Masters
CREATE INDEX idx_customers_type        ON customers(customer_type_id);
CREATE INDEX idx_customers_country     ON customers(country_id);
CREATE INDEX idx_items_type            ON items(item_type);
CREATE INDEX idx_items_active          ON items(is_active);
CREATE INDEX idx_item_supplier_item    ON item_supplier(item_id);
CREATE INDEX idx_item_supplier_supp    ON item_supplier(supplier_id);

-- BOM
CREATE INDEX idx_bom_lines_bom         ON bom_lines(bom_id);
CREATE INDEX idx_boms_fg               ON boms(finished_good_id);

-- Sales
CREATE INDEX idx_so_status             ON sales_orders(status);
CREATE INDEX idx_so_customer           ON sales_orders(customer_id);
CREATE INDEX idx_so_lines_so           ON sales_order_lines(sales_order_id);

-- Artwork / FDA
CREATE INDEX idx_artworks_so           ON artworks(sales_order_id);
CREATE INDEX idx_fda_reg_so            ON fda_registrations(sales_order_id);

-- Manufacturing
CREATE INDEX idx_mo_status             ON manufacturing_orders(status);
CREATE INDEX idx_mo_so                 ON manufacturing_orders(sales_order_id);

-- Procurement
CREATE INDEX idx_po_status             ON purchase_orders(status);
CREATE INDEX idx_po_supplier           ON purchase_orders(supplier_id);
CREATE INDEX idx_po_lines_po           ON purchase_order_lines(purchase_order_id);
CREATE INDEX idx_receipts_po           ON receipts(purchase_order_id);
CREATE INDEX idx_receipt_lines_receipt ON receipt_lines(receipt_id);
CREATE INDEX idx_receipt_lines_item    ON receipt_lines(item_id);

-- Inventory
CREATE INDEX idx_inv_txn_item          ON inventory_transactions(item_id);
CREATE INDEX idx_inv_txn_type          ON inventory_transactions(transaction_type);
CREATE INDEX idx_inv_txn_created       ON inventory_transactions(created_at DESC);

-- Production
CREATE INDEX idx_batch_mo              ON production_batches(manufacturing_order_id);
CREATE INDEX idx_batch_status          ON production_batches(status);
CREATE INDEX idx_batch_issues_batch    ON batch_component_issues(batch_id);

-- Shipping
CREATE INDEX idx_shipments_so          ON shipments(sales_order_id);
CREATE INDEX idx_shipments_status      ON shipments(status);
CREATE INDEX idx_shipment_lines_ship   ON shipment_lines(shipment_id);

-- Finance
CREATE INDEX idx_invoices_customer     ON invoices(customer_id);
CREATE INDEX idx_invoices_status       ON invoices(status);
CREATE INDEX idx_invoices_so           ON invoices(sales_order_id);
CREATE INDEX idx_invoice_lines_inv     ON invoice_lines(invoice_id);
CREATE INDEX idx_payments_type         ON payments(payment_type);
CREATE INDEX idx_payments_invoice      ON payments(invoice_id);
CREATE INDEX idx_payments_status       ON payments(status);

-- =============================================================================
-- 19. Seed Master Data
-- =============================================================================

INSERT INTO customer_types (id, name) VALUES
    ('11111111-0001-0001-0001-000000000001', 'Distributor'),
    ('11111111-0001-0001-0001-000000000002', 'Retailer'),
    ('11111111-0001-0001-0001-000000000003', 'Direct Brand');

INSERT INTO countries (id, name, code) VALUES
    ('22222222-0002-0002-0002-000000000001', 'Thailand',  'THA'),
    ('22222222-0002-0002-0002-000000000002', 'Singapore', 'SGP'),
    ('22222222-0002-0002-0002-000000000003', 'Vietnam',   'VNM'),
    ('22222222-0002-0002-0002-000000000004', 'Malaysia',  'MYS'),
    ('22222222-0002-0002-0002-000000000005', 'UAE',       'ARE');

INSERT INTO uoms (id, code, description) VALUES
    ('33333333-0003-0003-0003-000000000001', 'KG',  'Kilogram'),
    ('33333333-0003-0003-0003-000000000002', 'PCS', 'Pieces'),
    ('33333333-0003-0003-0003-000000000003', 'L',   'Litre'),
    ('33333333-0003-0003-0003-000000000004', 'BOX', 'Box'),
    ('33333333-0003-0003-0003-000000000005', 'G',   'Gram'),
    ('33333333-0003-0003-0003-000000000006', 'ML',  'Millilitre');

INSERT INTO customers (id, name, customer_type_id, country_id, email) VALUES
    ('66666666-0006-0006-0006-000000000001', 'Bangkok Beauty Co.',   '11111111-0001-0001-0001-000000000001', '22222222-0002-0002-0002-000000000001', 'orders@bangkokbeauty.com'),
    ('66666666-0006-0006-0006-000000000002', 'SG Cosmetics Pte Ltd', '11111111-0001-0001-0001-000000000002', '22222222-0002-0002-0002-000000000002', 'purchasing@sgcosmetics.sg'),
    ('66666666-0006-0006-0006-000000000003', 'Hanoi Pharma',         '11111111-0001-0001-0001-000000000003', '22222222-0002-0002-0002-000000000003', NULL),
    ('66666666-0006-0006-0006-000000000004', 'KL Retail Group',      '11111111-0001-0001-0001-000000000002', '22222222-0002-0002-0002-000000000004', 'kl@retailgroup.my'),
    ('66666666-0006-0006-0006-000000000005', 'Gulf Beauty Trading',  '11111111-0001-0001-0001-000000000001', '22222222-0002-0002-0002-000000000005', 'trade@gulfbeauty.ae');

INSERT INTO suppliers (id, name, supplier_type, country_id, email, payment_terms) VALUES
    ('77777777-0007-0007-0007-000000000001', 'Thai Chem Supplies Co.',  'local',         '22222222-0002-0002-0002-000000000001', 'procurement@thaichem.th', 'Net 30'),
    ('77777777-0007-0007-0007-000000000002', 'Global Packaging Ltd.',   'international', '22222222-0002-0002-0002-000000000002', 'sales@globalpack.sg',     'Net 45'),
    ('77777777-0007-0007-0007-000000000003', 'SG Raw Materials Pte.',   'international', '22222222-0002-0002-0002-000000000002', 'supply@sgraw.sg',         'Net 60');

INSERT INTO items (id, item_code, description, item_type, uom_id, fda_required) VALUES
    -- Finished Goods
    ('55555555-0005-0005-0005-000000000001', 'FG-001', 'Moisturising Cream 50ml',  'FG',      '33333333-0003-0003-0003-000000000002', TRUE),
    ('55555555-0005-0005-0005-000000000002', 'FG-002', 'Sunscreen SPF50 100ml',    'FG',      '33333333-0003-0003-0003-000000000002', TRUE),
    ('55555555-0005-0005-0005-000000000009', 'FG-003', 'Brightening Serum 30ml',   'FG',      '33333333-0003-0003-0003-000000000002', FALSE),
    -- Raw Materials
    ('55555555-0005-0005-0005-000000000003', 'RM-001', 'Shea Butter',              'RawMat',  '33333333-0003-0003-0003-000000000001', FALSE),
    ('55555555-0005-0005-0005-000000000004', 'RM-002', 'Zinc Oxide',               'RawMat',  '33333333-0003-0003-0003-000000000001', FALSE),
    ('55555555-0005-0005-0005-000000000005', 'RM-003', 'Titanium Dioxide',         'RawMat',  '33333333-0003-0003-0003-000000000001', FALSE),
    ('55555555-0005-0005-0005-000000000010', 'RM-004', 'Niacinamide 10%',          'RawMat',  '33333333-0003-0003-0003-000000000003', FALSE),
    ('55555555-0005-0005-0005-000000000011', 'RM-005', 'Glycerin USP',             'RawMat',  '33333333-0003-0003-0003-000000000003', FALSE),
    -- Packaging Materials
    ('55555555-0005-0005-0005-000000000006', 'PM-001', 'Airless Pump Bottle 50ml', 'PackMat', '33333333-0003-0003-0003-000000000002', FALSE),
    ('55555555-0005-0005-0005-000000000007', 'PM-002', 'Tube 100ml',               'PackMat', '33333333-0003-0003-0003-000000000002', FALSE),
    ('55555555-0005-0005-0005-000000000008', 'PM-003', 'Dropper Bottle 30ml',      'PackMat', '33333333-0003-0003-0003-000000000002', FALSE);

INSERT INTO item_supplier (id, item_id, supplier_id, lead_time_days, unit_cost, preferred) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000001', '55555555-0005-0005-0005-000000000003', '77777777-0007-0007-0007-000000000001', 7,  12.50, TRUE),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000002', '55555555-0005-0005-0005-000000000004', '77777777-0007-0007-0007-000000000003', 21, 18.00, TRUE),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000003', '55555555-0005-0005-0005-000000000005', '77777777-0007-0007-0007-000000000003', 21, 22.00, TRUE),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000004', '55555555-0005-0005-0005-000000000010', '77777777-0007-0007-0007-000000000003', 14,  8.50, TRUE),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000005', '55555555-0005-0005-0005-000000000011', '77777777-0007-0007-0007-000000000001',  5,  3.20, TRUE),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000006', '55555555-0005-0005-0005-000000000006', '77777777-0007-0007-0007-000000000002', 14,  0.85, TRUE),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000007', '55555555-0005-0005-0005-000000000007', '77777777-0007-0007-0007-000000000002', 14,  0.60, TRUE),
    ('aaaaaaaa-aaaa-aaaa-aaaa-000000000008', '55555555-0005-0005-0005-000000000008', '77777777-0007-0007-0007-000000000002', 14,  0.70, TRUE);

INSERT INTO boms (id, finished_good_id, version, description, is_active) VALUES
    ('88888888-0008-0008-0008-000000000001', '55555555-0005-0005-0005-000000000001', 1, 'Moisturising Cream 50ml — Standard Formula', TRUE),
    ('88888888-0008-0008-0008-000000000002', '55555555-0005-0005-0005-000000000002', 1, 'Sunscreen SPF50 100ml — Standard Formula',   TRUE),
    ('88888888-0008-0008-0008-000000000003', '55555555-0005-0005-0005-000000000009', 1, 'Brightening Serum 30ml — Standard Formula',  TRUE);

-- BOM lines (qty_required per batch of 1000 PCS)
INSERT INTO bom_lines (bom_id, component_item_id, qty_required, uom_id) VALUES
    -- FG-001: Moisturising Cream
    ('88888888-0008-0008-0008-000000000001', '55555555-0005-0005-0005-000000000003', 25.000, '33333333-0003-0003-0003-000000000001'),  -- Shea Butter 25 KG
    ('88888888-0008-0008-0008-000000000001', '55555555-0005-0005-0005-000000000011', 12.000, '33333333-0003-0003-0003-000000000003'),  -- Glycerin 12 L
    ('88888888-0008-0008-0008-000000000001', '55555555-0005-0005-0005-000000000006', 1000.0, '33333333-0003-0003-0003-000000000002'), -- Pump Bottles 1000 PCS
    -- FG-002: Sunscreen SPF50
    ('88888888-0008-0008-0008-000000000002', '55555555-0005-0005-0005-000000000004', 18.000, '33333333-0003-0003-0003-000000000001'),  -- Zinc Oxide 18 KG
    ('88888888-0008-0008-0008-000000000002', '55555555-0005-0005-0005-000000000005', 10.000, '33333333-0003-0003-0003-000000000001'),  -- Titanium Dioxide 10 KG
    ('88888888-0008-0008-0008-000000000002', '55555555-0005-0005-0005-000000000003',  8.000, '33333333-0003-0003-0003-000000000001'),  -- Shea Butter 8 KG
    ('88888888-0008-0008-0008-000000000002', '55555555-0005-0005-0005-000000000007', 1000.0, '33333333-0003-0003-0003-000000000002'), -- Tubes 1000 PCS
    -- FG-003: Brightening Serum
    ('88888888-0008-0008-0008-000000000003', '55555555-0005-0005-0005-000000000010', 20.000, '33333333-0003-0003-0003-000000000003'),  -- Niacinamide 20 L
    ('88888888-0008-0008-0008-000000000003', '55555555-0005-0005-0005-000000000011', 10.000, '33333333-0003-0003-0003-000000000003'),  -- Glycerin 10 L
    ('88888888-0008-0008-0008-000000000003', '55555555-0005-0005-0005-000000000008', 1000.0, '33333333-0003-0003-0003-000000000002'); -- Dropper Bottles 1000 PCS

-- =============================================================================
-- 20. Demo Transactional Data
-- =============================================================================

-- Sales Orders
INSERT INTO sales_orders (id, order_number, customer_id, country_id, status, artwork_status, fda_required, fda_status, total_pieces, order_date, required_date) VALUES
    ('bbbbbbbb-bbbb-bbbb-bbbb-000000000001', 'SO-2026-001', '66666666-0006-0006-0006-000000000001', '22222222-0002-0002-0002-000000000001', 'confirmed',     'approved', FALSE, NULL,        5000, '2026-01-10', '2026-03-15'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-000000000002', 'SO-2026-002', '66666666-0006-0006-0006-000000000003', '22222222-0002-0002-0002-000000000003', 'in_production', 'approved', TRUE,  'approved',  3000, '2026-01-18', '2026-04-01'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-000000000003', 'SO-2026-003', '66666666-0006-0006-0006-000000000005', '22222222-0002-0002-0002-000000000005', 'shipped',       'approved', TRUE,  'approved',  8000, '2025-11-05', '2026-01-30'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-000000000004', 'SO-2026-004', '66666666-0006-0006-0006-000000000002', '22222222-0002-0002-0002-000000000002', 'invoiced',      'approved', FALSE, NULL,        2000, '2025-10-01', '2025-12-15'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-000000000005', 'SO-2026-005', '66666666-0006-0006-0006-000000000004', '22222222-0002-0002-0002-000000000004', 'draft',         'pending',  FALSE, NULL,        1500, '2026-03-20', '2026-06-01'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-000000000006', 'SO-2026-006', '66666666-0006-0006-0006-000000000001', '22222222-0002-0002-0002-000000000001', 'confirmed',     'approved', FALSE, NULL,        4000, '2026-02-14', '2026-05-01'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-000000000007', 'SO-2026-007', '66666666-0006-0006-0006-000000000002', '22222222-0002-0002-0002-000000000002', 'cancelled',     NULL,       FALSE, NULL,        NULL, '2026-01-01', NULL);

INSERT INTO sales_order_lines (sales_order_id, item_id, qty_ordered, uom_id, unit_price) VALUES
    ('bbbbbbbb-bbbb-bbbb-bbbb-000000000001', '55555555-0005-0005-0005-000000000001', 5000, '33333333-0003-0003-0003-000000000002', 4.50),
    ('bbbbbbbb-bbbb-bbbb-bbbb-000000000002', '55555555-0005-0005-0005-000000000002', 3000, '33333333-0003-0003-0003-000000000002', 6.80),
    ('bbbbbbbb-bbbb-bbbb-bbbb-000000000003', '55555555-0005-0005-0005-000000000002', 5000, '33333333-0003-0003-0003-000000000002', 6.80),
    ('bbbbbbbb-bbbb-bbbb-bbbb-000000000003', '55555555-0005-0005-0005-000000000001', 3000, '33333333-0003-0003-0003-000000000002', 4.50),
    ('bbbbbbbb-bbbb-bbbb-bbbb-000000000004', '55555555-0005-0005-0005-000000000009', 2000, '33333333-0003-0003-0003-000000000002', 9.20),
    ('bbbbbbbb-bbbb-bbbb-bbbb-000000000005', '55555555-0005-0005-0005-000000000001', 1500, '33333333-0003-0003-0003-000000000002', 4.50),
    ('bbbbbbbb-bbbb-bbbb-bbbb-000000000006', '55555555-0005-0005-0005-000000000001', 2000, '33333333-0003-0003-0003-000000000002', 4.50),
    ('bbbbbbbb-bbbb-bbbb-bbbb-000000000006', '55555555-0005-0005-0005-000000000009', 2000, '33333333-0003-0003-0003-000000000002', 9.20);

-- Artworks
INSERT INTO artworks (id, sales_order_id, item_id, version, status, submitted_at, approved_at) VALUES
    ('cccccccc-cccc-cccc-cccc-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-000000000001', '55555555-0005-0005-0005-000000000001', 1, 'approved',  '2026-01-12', '2026-01-18'),
    ('cccccccc-cccc-cccc-cccc-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-000000000002', '55555555-0005-0005-0005-000000000002', 1, 'approved',  '2026-01-20', '2026-01-28'),
    ('cccccccc-cccc-cccc-cccc-000000000003', 'bbbbbbbb-bbbb-bbbb-bbbb-000000000003', '55555555-0005-0005-0005-000000000002', 2, 'approved',  '2025-11-10', '2025-11-20'),
    ('cccccccc-cccc-cccc-cccc-000000000004', 'bbbbbbbb-bbbb-bbbb-bbbb-000000000005', '55555555-0005-0005-0005-000000000001', 1, 'in_review', '2026-03-22', NULL);

-- FDA Registrations
INSERT INTO fda_registrations (id, sales_order_id, item_id, registration_number, status, submitted_at, approved_at, expiry_date) VALUES
    ('dddddddd-dddd-dddd-dddd-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-000000000002', '55555555-0005-0005-0005-000000000002', 'FDA-VN-2026-0041', 'approved',  '2026-01-25', '2026-02-10', '2028-02-10'),
    ('dddddddd-dddd-dddd-dddd-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-000000000003', '55555555-0005-0005-0005-000000000002', 'FDA-AE-2025-0188', 'approved',  '2025-11-08', '2025-12-01', '2027-12-01');

-- Manufacturing Orders
INSERT INTO manufacturing_orders (id, mo_number, sales_order_id, item_id, bom_id, status, qty_planned, qty_produced, uom_id, planned_start, planned_end, actual_start) VALUES
    ('eeeeeeee-eeee-eeee-eeee-000000000001', 'MO-2026-001', 'bbbbbbbb-bbbb-bbbb-bbbb-000000000001', '55555555-0005-0005-0005-000000000001', '88888888-0008-0008-0008-000000000001', 'in_progress', 5000, 2000, '33333333-0003-0003-0003-000000000002', '2026-01-20', '2026-02-20', '2026-01-22'),
    ('eeeeeeee-eeee-eeee-eeee-000000000002', 'MO-2026-002', 'bbbbbbbb-bbbb-bbbb-bbbb-000000000002', '55555555-0005-0005-0005-000000000002', '88888888-0008-0008-0008-000000000002', 'in_progress', 3000, 1500, '33333333-0003-0003-0003-000000000002', '2026-02-01', '2026-03-01', '2026-02-03'),
    ('eeeeeeee-eeee-eeee-eeee-000000000003', 'MO-2025-008', 'bbbbbbbb-bbbb-bbbb-bbbb-000000000003', '55555555-0005-0005-0005-000000000002', '88888888-0008-0008-0008-000000000002', 'completed',   8000, 8000, '33333333-0003-0003-0003-000000000002', '2025-11-15', '2025-12-20', '2025-11-16'),
    ('eeeeeeee-eeee-eeee-eeee-000000000004', 'MO-2025-009', 'bbbbbbbb-bbbb-bbbb-bbbb-000000000004', '55555555-0005-0005-0005-000000000009', '88888888-0008-0008-0008-000000000003', 'completed',   2000, 2000, '33333333-0003-0003-0003-000000000002', '2025-10-10', '2025-11-10', '2025-10-12'),
    ('eeeeeeee-eeee-eeee-eeee-000000000005', 'MO-2026-003', 'bbbbbbbb-bbbb-bbbb-bbbb-000000000006', '55555555-0005-0005-0005-000000000001', '88888888-0008-0008-0008-000000000001', 'planned',     4000,    0, '33333333-0003-0003-0003-000000000002', '2026-03-01', '2026-04-01', NULL);

-- Purchase Orders
INSERT INTO purchase_orders (id, po_number, supplier_id, manufacturing_order_id, status, order_date, expected_date) VALUES
    ('ffffffff-ffff-ffff-ffff-000000000001', 'PO-2026-001', '77777777-0007-0007-0007-000000000001', 'eeeeeeee-eeee-eeee-eeee-000000000001', 'received',          '2026-01-15', '2026-01-22'),
    ('ffffffff-ffff-ffff-ffff-000000000002', 'PO-2026-002', '77777777-0007-0007-0007-000000000002', 'eeeeeeee-eeee-eeee-eeee-000000000001', 'received',          '2026-01-15', '2026-01-22'),
    ('ffffffff-ffff-ffff-ffff-000000000003', 'PO-2026-003', '77777777-0007-0007-0007-000000000003', 'eeeeeeee-eeee-eeee-eeee-000000000002', 'confirmed',         '2026-02-01', '2026-02-15'),
    ('ffffffff-ffff-ffff-ffff-000000000004', 'PO-2026-004', '77777777-0007-0007-0007-000000000001', NULL,                                   'draft',             '2026-03-18', '2026-04-10'),
    ('ffffffff-ffff-ffff-ffff-000000000005', 'PO-2026-005', '77777777-0007-0007-0007-000000000002', 'eeeeeeee-eeee-eeee-eeee-000000000005', 'sent',              '2026-02-20', '2026-03-10');

INSERT INTO purchase_order_lines (purchase_order_id, item_id, qty_ordered, qty_received, uom_id, unit_cost) VALUES
    ('ffffffff-ffff-ffff-ffff-000000000001', '55555555-0005-0005-0005-000000000003', 200.0, 200.0, '33333333-0003-0003-0003-000000000001', 12.50),
    ('ffffffff-ffff-ffff-ffff-000000000001', '55555555-0005-0005-0005-000000000011',  80.0,  80.0, '33333333-0003-0003-0003-000000000003',  3.20),
    ('ffffffff-ffff-ffff-ffff-000000000002', '55555555-0005-0005-0005-000000000006', 6000.0,6000.0,'33333333-0003-0003-0003-000000000002',  0.85),
    ('ffffffff-ffff-ffff-ffff-000000000003', '55555555-0005-0005-0005-000000000004', 100.0,  0.0, '33333333-0003-0003-0003-000000000001', 18.00),
    ('ffffffff-ffff-ffff-ffff-000000000003', '55555555-0005-0005-0005-000000000005',  60.0,  0.0, '33333333-0003-0003-0003-000000000001', 22.00),
    ('ffffffff-ffff-ffff-ffff-000000000004', '55555555-0005-0005-0005-000000000003', 150.0,  0.0, '33333333-0003-0003-0003-000000000001', 12.50),
    ('ffffffff-ffff-ffff-ffff-000000000005', '55555555-0005-0005-0005-000000000006', 5000.0, 0.0, '33333333-0003-0003-0003-000000000002',  0.85);

-- Receipts
INSERT INTO receipts (id, receipt_number, purchase_order_id, received_at) VALUES
    ('11111111-1111-1111-1111-100000000001', 'RCV-2026-001', 'ffffffff-ffff-ffff-ffff-000000000001', '2026-01-23'),
    ('11111111-1111-1111-1111-100000000002', 'RCV-2026-002', 'ffffffff-ffff-ffff-ffff-000000000002', '2026-01-23');

INSERT INTO receipt_lines (receipt_id, po_line_id, item_id, qty_received, uom_id, lot_number, qc_status)
SELECT '11111111-1111-1111-1111-100000000001', pol.id, pol.item_id, pol.qty_ordered, pol.uom_id, 'LOT-2026-001', 'passed'
FROM purchase_order_lines pol WHERE pol.purchase_order_id = 'ffffffff-ffff-ffff-ffff-000000000001';

INSERT INTO receipt_lines (receipt_id, po_line_id, item_id, qty_received, uom_id, lot_number, qc_status)
SELECT '11111111-1111-1111-1111-100000000002', pol.id, pol.item_id, pol.qty_ordered, pol.uom_id, 'LOT-2026-002', 'passed'
FROM purchase_order_lines pol WHERE pol.purchase_order_id = 'ffffffff-ffff-ffff-ffff-000000000002';

-- Inventory (current balances)
INSERT INTO inventory (item_id, qty_available, qty_reserved, uom_id) VALUES
    ('55555555-0005-0005-0005-000000000003', 115.0,  25.0, '33333333-0003-0003-0003-000000000001'), -- Shea Butter (200 received - 85 issued)
    ('55555555-0005-0005-0005-000000000004',  60.0,  18.0, '33333333-0003-0003-0003-000000000001'), -- Zinc Oxide
    ('55555555-0005-0005-0005-000000000005',  45.0,  10.0, '33333333-0003-0003-0003-000000000001'), -- Titanium Dioxide
    ('55555555-0005-0005-0005-000000000010',  80.0,  20.0, '33333333-0003-0003-0003-000000000003'), -- Niacinamide
    ('55555555-0005-0005-0005-000000000011',  68.0,  12.0, '33333333-0003-0003-0003-000000000003'), -- Glycerin (80 received - 12 issued)
    ('55555555-0005-0005-0005-000000000006', 3800.0,1000.0,'33333333-0003-0003-0003-000000000002'), -- Pump Bottles (6000 received - 2200 issued)
    ('55555555-0005-0005-0005-000000000007', 2500.0, 800.0,'33333333-0003-0003-0003-000000000002'), -- Tubes
    ('55555555-0005-0005-0005-000000000008', 1200.0, 200.0,'33333333-0003-0003-0003-000000000002'), -- Dropper Bottles
    ('55555555-0005-0005-0005-000000000001', 2000.0,   0.0,'33333333-0003-0003-0003-000000000002'), -- FG-001 (produced so far)
    ('55555555-0005-0005-0005-000000000002', 1500.0,   0.0,'33333333-0003-0003-0003-000000000002'), -- FG-002 (produced so far)
    ('55555555-0005-0005-0005-000000000009',  800.0,   0.0,'33333333-0003-0003-0003-000000000002'); -- FG-003

-- Production Batches
INSERT INTO production_batches (id, batch_number, manufacturing_order_id, bom_id, status, qty_bulk_produced, qty_filled, qty_packed, uom_id, bulk_start, bulk_end, fill_start, fill_end, pack_start, pack_end) VALUES
    ('22222222-2222-2222-2222-200000000001', 'BATCH-2026-001', 'eeeeeeee-eeee-eeee-eeee-000000000001', '88888888-0008-0008-0008-000000000001', 'packing',       2000, 2000, 1800, '33333333-0003-0003-0003-000000000002', '2026-01-22', '2026-01-24', '2026-01-25', '2026-01-27', '2026-01-28', NULL),
    ('22222222-2222-2222-2222-200000000002', 'BATCH-2026-002', 'eeeeeeee-eeee-eeee-eeee-000000000002', '88888888-0008-0008-0008-000000000002', 'bulk_production',  NULL, NULL, NULL, '33333333-0003-0003-0003-000000000002', '2026-02-05', NULL,         NULL,         NULL,         NULL,         NULL),
    ('22222222-2222-2222-2222-200000000003', 'BATCH-2025-008', 'eeeeeeee-eeee-eeee-eeee-000000000003', '88888888-0008-0008-0008-000000000002', 'completed',      8000, 8000, 8000, '33333333-0003-0003-0003-000000000002', '2025-11-16', '2025-11-20', '2025-11-21', '2025-11-28', '2025-11-29', '2025-12-05'),
    ('22222222-2222-2222-2222-200000000004', 'BATCH-2025-009', 'eeeeeeee-eeee-eeee-eeee-000000000004', '88888888-0008-0008-0008-000000000003', 'completed',      2000, 2000, 2000, '33333333-0003-0003-0003-000000000002', '2025-10-12', '2025-10-14', '2025-10-15', '2025-10-20', '2025-10-21', '2025-10-28');

-- Shipments
INSERT INTO shipments (id, shipment_number, sales_order_id, status, carrier, tracking_number, loaded_at, dispatched_at) VALUES
    ('33333333-3333-3333-3333-300000000001', 'SHP-2026-001', 'bbbbbbbb-bbbb-bbbb-bbbb-000000000003', 'in_transit', 'Maersk Line',  'MSKU-4421987', '2026-01-28', '2026-01-30'),
    ('33333333-3333-3333-3333-300000000002', 'SHP-2025-009', 'bbbbbbbb-bbbb-bbbb-bbbb-000000000004', 'delivered',  'DHL Express',  'DHL-99012345', '2025-12-08', '2025-12-09');

INSERT INTO shipment_lines (shipment_id, item_id, batch_id, qty_shipped, uom_id) VALUES
    ('33333333-3333-3333-3333-300000000001', '55555555-0005-0005-0005-000000000002', '22222222-2222-2222-2222-200000000003', 5000, '33333333-0003-0003-0003-000000000002'),
    ('33333333-3333-3333-3333-300000000001', '55555555-0005-0005-0005-000000000001', '22222222-2222-2222-2222-200000000003', 3000, '33333333-0003-0003-0003-000000000002'),
    ('33333333-3333-3333-3333-300000000002', '55555555-0005-0005-0005-000000000009', '22222222-2222-2222-2222-200000000004', 2000, '33333333-0003-0003-0003-000000000002');

-- Invoices
INSERT INTO invoices (id, invoice_number, customer_id, sales_order_id, shipment_id, status, issue_date, due_date, subtotal, tax, total, currency) VALUES
    ('44444444-4444-4444-4444-400000000001', 'INV-2026-001', '66666666-0006-0006-0006-000000000005', 'bbbbbbbb-bbbb-bbbb-bbbb-000000000003', '33333333-3333-3333-3333-300000000001', 'sent',           '2026-01-30', '2026-03-01', 47600.00, 0, 47600.00, 'USD'),
    ('44444444-4444-4444-4444-400000000002', 'INV-2025-009', '66666666-0006-0006-0006-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-000000000004', '33333333-3333-3333-3333-300000000002', 'paid',           '2025-12-10', '2026-01-10', 18400.00, 0, 18400.00, 'USD'),
    ('44444444-4444-4444-4444-400000000003', 'INV-2026-002', '66666666-0006-0006-0006-000000000003', 'bbbbbbbb-bbbb-bbbb-bbbb-000000000002', NULL,                                  'draft',          '2026-04-01', '2026-05-01', 20400.00, 0, 20400.00, 'USD');

INSERT INTO invoice_lines (invoice_id, item_id, description, qty, uom_id, unit_price, line_total) VALUES
    ('44444444-4444-4444-4444-400000000001', '55555555-0005-0005-0005-000000000002', 'Sunscreen SPF50 100ml', 5000, '33333333-0003-0003-0003-000000000002', 6.80, 34000.00),
    ('44444444-4444-4444-4444-400000000001', '55555555-0005-0005-0005-000000000001', 'Moisturising Cream 50ml', 3000, '33333333-0003-0003-0003-000000000002', 4.50, 13500.00),
    ('44444444-4444-4444-4444-400000000002', '55555555-0005-0005-0005-000000000009', 'Brightening Serum 30ml', 2000, '33333333-0003-0003-0003-000000000002', 9.20, 18400.00),
    ('44444444-4444-4444-4444-400000000003', '55555555-0005-0005-0005-000000000002', 'Sunscreen SPF50 100ml', 3000, '33333333-0003-0003-0003-000000000002', 6.80, 20400.00);

-- Payments
INSERT INTO payments (id, payment_number, payment_type, customer_id, invoice_id, amount, currency, payment_date, method, reference, status) VALUES
    ('55555555-5555-5555-5555-500000000001', 'PAY-2026-001', 'customer', '66666666-0006-0006-0006-000000000002', '44444444-4444-4444-4444-400000000002', 18400.00, 'USD', '2025-12-28', 'Wire', 'TRF-SGC-20251228', 'cleared');
