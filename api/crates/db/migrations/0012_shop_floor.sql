-- =============================================================================
-- 0012  Shop Floor — Work Centers, Routing Steps, QC Tests,
--        Downtime Events, Access Requests, Production Strategy
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Work Centers
--    Physical or virtual areas where production operations happen.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS work_centers (
    id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    code         TEXT        NOT NULL UNIQUE,
    name         TEXT        NOT NULL,
    center_type  TEXT        NOT NULL DEFAULT 'general',
    -- mixer / filler / packer / lab / general
    capacity     NUMERIC(10,2),           -- units per 8-hour shift
    status       TEXT        NOT NULL DEFAULT 'active',
    -- active / maintenance / inactive
    notes        TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_centers_status ON work_centers(status);

-- ---------------------------------------------------------------------------
-- 2. Routing Steps
--    Standard operating procedure steps linked to a BOM.
--    Defines which Work Center each production step uses and how long it takes.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS routing_steps (
    id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    bom_id         UUID          NOT NULL REFERENCES boms(id) ON DELETE CASCADE,
    step_number    INT           NOT NULL,
    name           TEXT          NOT NULL,
    work_center_id UUID          NOT NULL REFERENCES work_centers(id),
    std_time_min   NUMERIC(10,2) NOT NULL DEFAULT 0,
    instructions   TEXT,
    UNIQUE (bom_id, step_number)
);

CREATE INDEX IF NOT EXISTS idx_routing_steps_bom ON routing_steps(bom_id);

-- ---------------------------------------------------------------------------
-- 3. QC Tests
--    In-process quality control tests recorded against a production batch.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS qc_tests (
    id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id     UUID          NOT NULL REFERENCES production_batches(id) ON DELETE CASCADE,
    test_type    TEXT          NOT NULL,
    -- viscosity / ph / microbial / temperature / appearance / weight / other
    result_value TEXT,
    min_spec     NUMERIC(18,4),
    max_spec     NUMERIC(18,4),
    pass_fail    TEXT          NOT NULL DEFAULT 'pending',
    -- pending / pass / fail
    tested_by    UUID          REFERENCES users(id),
    tested_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    notes        TEXT
);

CREATE INDEX IF NOT EXISTS idx_qc_tests_batch    ON qc_tests(batch_id);
CREATE INDEX IF NOT EXISTS idx_qc_tests_pass_fail ON qc_tests(pass_fail);

-- ---------------------------------------------------------------------------
-- 4. Downtime Events
--    Machine/line downtime coded by reason for OEE tracking.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS downtime_events (
    id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id       UUID        NOT NULL REFERENCES production_batches(id) ON DELETE CASCADE,
    work_center_id UUID        REFERENCES work_centers(id),
    reason_code    TEXT        NOT NULL,
    -- mechanical / cleaning / setup / material_shortage / operator / quality_hold / other
    description    TEXT,
    start_time     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time       TIMESTAMPTZ,
    reported_by    UUID        REFERENCES users(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_downtime_events_batch ON downtime_events(batch_id);

-- ---------------------------------------------------------------------------
-- 5. Access Requests
--    Users request access to restricted modules; admins approve/deny.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS access_requests (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID        NOT NULL REFERENCES users(id),
    permission  TEXT        NOT NULL,   -- route slug, e.g. '/invoicing' or 'finance.view'
    reason      TEXT,
    status      TEXT        NOT NULL DEFAULT 'pending',
    -- pending / approved / denied
    reviewed_by UUID        REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_requests_user   ON access_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status);

-- ---------------------------------------------------------------------------
-- 6. Production Strategy on Items
-- ---------------------------------------------------------------------------
ALTER TABLE items ADD COLUMN IF NOT EXISTS production_strategy TEXT;
-- MTS (Make to Stock) / MTO (Make to Order) / ATO (Assemble to Order)
-- CTO (Configure to Order) / ETO (Engineer to Order)
