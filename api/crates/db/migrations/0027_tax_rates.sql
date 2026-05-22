-- =============================================================================
-- 0027  Multiple Tax Engine
--
--   tax_rates — named, per-company tax rates (VAT, GST, withholding, etc.)
--   invoices  — gains tax_rate_id so tax can be derived from a named rate
-- =============================================================================

CREATE TABLE IF NOT EXISTS tax_rates (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID         NOT NULL REFERENCES companies(id),
    name        TEXT         NOT NULL,
    code        TEXT         NOT NULL,
    rate        NUMERIC(7,4) NOT NULL CHECK (rate >= 0),
    tax_type    TEXT         NOT NULL DEFAULT 'vat'
        CHECK (tax_type IN ('vat','gst','withholding','excise','custom')),
    description TEXT,
    is_default  BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_tax_rates_company ON tax_rates(company_id);

-- At most one default per (company, tax_type)
CREATE UNIQUE INDEX IF NOT EXISTS idx_tax_rates_one_default
    ON tax_rates (company_id, tax_type)
    WHERE is_default = TRUE;

-- ── invoices gets an optional FK to a named tax rate ─────────────────────────

ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS tax_rate_id UUID REFERENCES tax_rates(id);
