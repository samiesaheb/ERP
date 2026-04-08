-- =============================================================================
-- SkyHigh MES — Add created_at audit fields to items and suppliers
-- =============================================================================

ALTER TABLE items
    ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE suppliers
    ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
