-- =============================================================================
-- SkyHigh MES — Initial Schema Migration
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Enum types
-- ---------------------------------------------------------------------------
CREATE TYPE item_type AS ENUM ('fg', 'raw_mat', 'pack_mat');
CREATE TYPE supplier_type AS ENUM ('international', 'local');
CREATE TYPE so_status AS ENUM ('artwork', 'planning', 'production', 'packing', 'shipped');
CREATE TYPE artwork_status AS ENUM ('draft', 'in_review', 'approved');
CREATE TYPE fda_status AS ENUM ('pending', 'submitted', 'approved');
CREATE TYPE bom_status AS ENUM ('draft', 'active', 'under_review');
CREATE TYPE po_status AS ENUM ('ordered', 'confirmed', 'in_transit', 'received');
CREATE TYPE qc_status AS ENUM ('pending', 'passed', 'failed', 'hold');
CREATE TYPE inventory_txn_type AS ENUM ('receipt', 'issue', 'return', 'conversion', 'loss', 'adjustment');
CREATE TYPE mo_status AS ENUM ('planned', 'running', 'packing', 'done', 'on_hold');
CREATE TYPE batch_stage AS ENUM ('bulk', 'formulation', 'filling', 'packing', 'loading');
CREATE TYPE batch_status AS ENUM ('running', 'delayed', 'done');
CREATE TYPE item_mgmt_txn_type AS ENUM ('issue', 'return', 'conversion', 'loss', 'receipt');
CREATE TYPE invoice_status AS ENUM ('not_due', 'partial', 'paid', 'overdue');

-- ---------------------------------------------------------------------------
-- Master tables
-- ---------------------------------------------------------------------------

CREATE TABLE customer_types (
    id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE countries (
    id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code CHAR(3) NOT NULL UNIQUE
);

CREATE TABLE customers (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name             TEXT NOT NULL,
    customer_type_id UUID NOT NULL REFERENCES customer_types(id),
    country_id       UUID NOT NULL REFERENCES countries(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE uoms (
    id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE
);

CREATE TABLE items (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code        TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    item_type   item_type NOT NULL,
    uom_id      UUID NOT NULL REFERENCES uoms(id),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE uom_conversions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_uom_id UUID NOT NULL REFERENCES uoms(id),
    to_uom_id   UUID NOT NULL REFERENCES uoms(id),
    item_id     UUID REFERENCES items(id),          -- NULL = global conversion
    factor      NUMERIC(20,8) NOT NULL,
    UNIQUE (from_uom_id, to_uom_id, item_id)
);

CREATE TABLE suppliers (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name           TEXT NOT NULL,
    country_id     UUID NOT NULL REFERENCES countries(id),
    supplier_type  supplier_type NOT NULL,
    category       TEXT NOT NULL DEFAULT '',
    lead_time_days INTEGER NOT NULL DEFAULT 0,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE item_suppliers (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id      UUID NOT NULL REFERENCES items(id),
    supplier_id  UUID NOT NULL REFERENCES suppliers(id),
    is_preferred BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (item_id, supplier_id)
);

-- ---------------------------------------------------------------------------
-- User accounts (for JWT auth)
-- ---------------------------------------------------------------------------

CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Sales
-- ---------------------------------------------------------------------------

CREATE TABLE sales_orders (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number   TEXT NOT NULL UNIQUE,
    customer_id    UUID NOT NULL REFERENCES customers(id),
    country_id     UUID NOT NULL REFERENCES countries(id),
    status         so_status NOT NULL DEFAULT 'artwork',
    total_pieces   NUMERIC(20,4) NOT NULL DEFAULT 0,
    artwork_status artwork_status NOT NULL DEFAULT 'draft',
    fda_required   BOOLEAN NOT NULL DEFAULT FALSE,
    fda_status     fda_status,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE artwork_docs (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    doc_type       TEXT NOT NULL,
    file_url       TEXT NOT NULL,
    uploaded_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- BOM / Formulation
-- ---------------------------------------------------------------------------

CREATE TABLE boms (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code       TEXT NOT NULL UNIQUE,
    item_id    UUID NOT NULL REFERENCES items(id),  -- must be FG
    version    INTEGER NOT NULL DEFAULT 1,
    status     bom_status NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE bom_lines (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bom_id            UUID NOT NULL REFERENCES boms(id) ON DELETE CASCADE,
    component_item_id UUID NOT NULL REFERENCES items(id),
    qty_per_batch     NUMERIC(20,6) NOT NULL,
    uom_id            UUID NOT NULL REFERENCES uoms(id),
    line_order        INTEGER NOT NULL DEFAULT 0,
    UNIQUE (bom_id, component_item_id)
);

-- ---------------------------------------------------------------------------
-- Procurement
-- ---------------------------------------------------------------------------

CREATE TABLE purchase_orders (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number     TEXT NOT NULL UNIQUE,
    supplier_id   UUID NOT NULL REFERENCES suppliers(id),
    status        po_status NOT NULL DEFAULT 'ordered',
    expected_date DATE NOT NULL,
    total_amount  NUMERIC(20,4) NOT NULL DEFAULT 0,
    supplier_type supplier_type NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE po_lines (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_id        UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    item_id      UUID NOT NULL REFERENCES items(id),
    qty_ordered  NUMERIC(20,4) NOT NULL,
    qty_received NUMERIC(20,4) NOT NULL DEFAULT 0,
    unit_price   NUMERIC(20,4) NOT NULL,
    uom_id       UUID NOT NULL REFERENCES uoms(id)
);

CREATE TABLE grn (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grn_number    TEXT NOT NULL UNIQUE,
    po_id         UUID NOT NULL REFERENCES purchase_orders(id),
    received_date DATE NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE grn_lines (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grn_id       UUID NOT NULL REFERENCES grn(id) ON DELETE CASCADE,
    po_line_id   UUID NOT NULL REFERENCES po_lines(id),
    item_id      UUID NOT NULL REFERENCES items(id),
    qty_received NUMERIC(20,4) NOT NULL,
    batch_number TEXT NOT NULL,
    qc_status    qc_status NOT NULL DEFAULT 'pending',
    into_stock   BOOLEAN NOT NULL DEFAULT FALSE
);

-- ---------------------------------------------------------------------------
-- Inventory
-- ---------------------------------------------------------------------------

CREATE TABLE inventory (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id       UUID NOT NULL UNIQUE REFERENCES items(id),
    qty_on_hand   NUMERIC(20,4) NOT NULL DEFAULT 0,
    qty_reserved  NUMERIC(20,4) NOT NULL DEFAULT 0,
    qty_available NUMERIC(20,4) GENERATED ALWAYS AS (qty_on_hand - qty_reserved) STORED,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE inventory_txns (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id      UUID NOT NULL REFERENCES items(id),
    txn_type     inventory_txn_type NOT NULL,
    qty          NUMERIC(20,4) NOT NULL,
    ref_doc_type TEXT,
    ref_doc_id   UUID,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Production
-- ---------------------------------------------------------------------------

CREATE TABLE manufacturing_orders (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mo_number      TEXT NOT NULL UNIQUE,
    sales_order_id UUID NOT NULL REFERENCES sales_orders(id),
    item_id        UUID NOT NULL REFERENCES items(id),
    bom_id         UUID NOT NULL REFERENCES boms(id),
    target_qty     NUMERIC(20,4) NOT NULL,
    status         mo_status NOT NULL DEFAULT 'planned',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE production_batches (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_number TEXT NOT NULL UNIQUE,
    mo_id        UUID NOT NULL REFERENCES manufacturing_orders(id),
    stage        batch_stage NOT NULL DEFAULT 'bulk',
    pct_complete NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (pct_complete BETWEEN 0 AND 100),
    status       batch_status NOT NULL DEFAULT 'running',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE item_management_txns (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id   UUID NOT NULL REFERENCES production_batches(id),
    txn_type   item_mgmt_txn_type NOT NULL,
    item_id    UUID NOT NULL REFERENCES items(id),
    qty        NUMERIC(20,4) NOT NULL,
    notes      TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Finance
-- ---------------------------------------------------------------------------

CREATE TABLE invoices (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number TEXT NOT NULL UNIQUE,
    sales_order_id UUID NOT NULL REFERENCES sales_orders(id),
    customer_id    UUID NOT NULL REFERENCES customers(id),
    amount         NUMERIC(20,4) NOT NULL,
    due_date       DATE NOT NULL,
    status         invoice_status NOT NULL DEFAULT 'not_due',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payments (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id   UUID NOT NULL REFERENCES invoices(id),
    amount_paid  NUMERIC(20,4) NOT NULL,
    paid_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reference    TEXT NOT NULL
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX idx_customers_type      ON customers(customer_type_id);
CREATE INDEX idx_customers_country   ON customers(country_id);
CREATE INDEX idx_items_type          ON items(item_type);
CREATE INDEX idx_item_suppliers_item ON item_suppliers(item_id);
CREATE INDEX idx_so_status           ON sales_orders(status);
CREATE INDEX idx_so_customer         ON sales_orders(customer_id);
CREATE INDEX idx_bom_lines_bom       ON bom_lines(bom_id);
CREATE INDEX idx_po_status           ON purchase_orders(status);
CREATE INDEX idx_po_supplier         ON purchase_orders(supplier_id);
CREATE INDEX idx_po_lines_po         ON po_lines(po_id);
CREATE INDEX idx_grn_po              ON grn(po_id);
CREATE INDEX idx_grn_lines_grn       ON grn_lines(grn_id);
CREATE INDEX idx_inv_txns_item       ON inventory_txns(item_id);
CREATE INDEX idx_mo_status           ON manufacturing_orders(status);
CREATE INDEX idx_mo_so               ON manufacturing_orders(sales_order_id);
CREATE INDEX idx_batch_mo            ON production_batches(mo_id);
CREATE INDEX idx_batch_status        ON production_batches(status);
CREATE INDEX idx_invoices_status     ON invoices(status);
CREATE INDEX idx_invoices_customer   ON invoices(customer_id);
CREATE INDEX idx_payments_invoice    ON payments(invoice_id);
