-- =============================================================================
-- 0021  Companies — multi-company support
--       company_groups for named roll-ups, companies with parent hierarchy,
--       company_group_members for group membership, user_companies for
--       per-company role assignment.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Company groups (named roll-up entities for consolidated reporting)
-- ---------------------------------------------------------------------------
CREATE TABLE company_groups (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON company_groups(name);

-- ---------------------------------------------------------------------------
-- Companies
-- ---------------------------------------------------------------------------
CREATE TABLE companies (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    code                    TEXT        NOT NULL UNIQUE,
    name                    TEXT        NOT NULL,
    country_id              UUID        REFERENCES countries(id),
    address                 TEXT,
    base_currency           TEXT        NOT NULL DEFAULT 'THB',
    fiscal_year_start_month INTEGER     NOT NULL DEFAULT 1
                                        CHECK (fiscal_year_start_month BETWEEN 1 AND 12),
    registration_number     TEXT,
    tax_id                  TEXT,
    logo_url                TEXT,
    parent_company_id       UUID        REFERENCES companies(id),
    is_active               BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON companies(code);
CREATE INDEX ON companies(parent_company_id);
CREATE INDEX ON companies(is_active);

-- ---------------------------------------------------------------------------
-- Company group membership (many-to-many)
-- ---------------------------------------------------------------------------
CREATE TABLE company_group_members (
    group_id    UUID NOT NULL REFERENCES company_groups(id) ON DELETE CASCADE,
    company_id  UUID NOT NULL REFERENCES companies(id)      ON DELETE CASCADE,
    PRIMARY KEY (group_id, company_id)
);

CREATE INDEX ON company_group_members(company_id);

-- ---------------------------------------------------------------------------
-- User-company membership with per-company role
-- ---------------------------------------------------------------------------
CREATE TABLE user_companies (
    user_id    UUID        NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
    company_id UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    role       TEXT        NOT NULL DEFAULT 'admin',
    is_primary BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, company_id)
);

CREATE INDEX ON user_companies(company_id);

-- ---------------------------------------------------------------------------
-- Audit triggers
-- ---------------------------------------------------------------------------
CREATE TRIGGER audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON companies
FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON company_groups
FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
