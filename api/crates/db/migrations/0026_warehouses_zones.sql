-- =============================================================================
-- 0026  Multiple Warehouse Engine + Zone & Bin Management
--
--   warehouses        — named warehouses per company
--   warehouse_zones   — zones within a warehouse (receiving, picking, storage…)
--   warehouse_locations gets warehouse_id + zone_id FK columns
--   inventory gets warehouse_id so stock can be tracked per warehouse
-- =============================================================================

-- ── Warehouses ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS warehouses (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id   UUID        NOT NULL REFERENCES companies(id),
    code         TEXT        NOT NULL,
    name         TEXT        NOT NULL,
    address      TEXT,
    city         TEXT,
    country_code TEXT,
    is_default   BOOLEAN     NOT NULL DEFAULT FALSE,
    is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
    notes        TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_warehouses_company ON warehouses(company_id);

-- ── Warehouse Zones ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS warehouse_zones (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID        NOT NULL REFERENCES warehouses(id),
    company_id   UUID        NOT NULL REFERENCES companies(id),
    code         TEXT        NOT NULL,
    name         TEXT        NOT NULL,
    zone_type    TEXT        NOT NULL DEFAULT 'storage'
        CHECK (zone_type IN ('receiving','picking','storage','staging','quarantine','dispatch')),
    is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
    notes        TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (warehouse_id, code)
);

CREATE INDEX IF NOT EXISTS idx_warehouse_zones_warehouse ON warehouse_zones(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_zones_company   ON warehouse_zones(company_id);

-- ── Extend warehouse_locations ────────────────────────────────────────────────

ALTER TABLE warehouse_locations
    ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES warehouses(id);

ALTER TABLE warehouse_locations
    ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES warehouse_zones(id);

-- ── Extend inventory ──────────────────────────────────────────────────────────

ALTER TABLE inventory
    ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES warehouses(id);
