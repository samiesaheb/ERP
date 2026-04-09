-- =============================================================================
-- 0009  Audit Trail — universal change log via PostgreSQL triggers
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Audit log table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name   TEXT        NOT NULL,
    record_id    TEXT,                          -- UUID as text (flexible)
    action       TEXT        NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data     JSONB,                         -- NULL on INSERT
    new_data     JSONB,                         -- NULL on DELETE
    changed_by   UUID        REFERENCES users(id) ON DELETE SET NULL,
    changed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_logs_table_name_idx ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS audit_logs_record_id_idx  ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS audit_logs_changed_by_idx ON audit_logs(changed_by);
CREATE INDEX IF NOT EXISTS audit_logs_changed_at_idx ON audit_logs(changed_at DESC);

-- ---------------------------------------------------------------------------
-- Trigger function
-- Reads app.current_user_id from session (set by the API middleware).
-- Falls back to NULL if not present (e.g. migrations, direct DB access).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION audit_trigger_fn() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id  UUID;
    v_record_id TEXT;
BEGIN
    -- Read the user ID injected by the API layer (best-effort with pgpool)
    BEGIN
        v_user_id := NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;

    IF TG_OP = 'DELETE' THEN
        v_record_id := OLD.id::TEXT;
        INSERT INTO audit_logs (table_name, record_id, action, old_data, changed_by)
        VALUES (TG_TABLE_NAME, v_record_id, 'DELETE', to_jsonb(OLD), v_user_id);
        RETURN OLD;

    ELSIF TG_OP = 'UPDATE' THEN
        v_record_id := NEW.id::TEXT;
        INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, changed_by)
        VALUES (TG_TABLE_NAME, v_record_id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), v_user_id);
        RETURN NEW;

    ELSE -- INSERT
        v_record_id := NEW.id::TEXT;
        INSERT INTO audit_logs (table_name, record_id, action, new_data, changed_by)
        VALUES (TG_TABLE_NAME, v_record_id, 'INSERT', to_jsonb(NEW), v_user_id);
        RETURN NEW;
    END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Apply trigger to every application table (skips audit_logs & system tables)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN
        SELECT table_name
        FROM   information_schema.tables
        WHERE  table_schema = 'public'
          AND  table_type   = 'BASE TABLE'
          AND  table_name NOT IN ('audit_logs', '_sqlx_migrations')
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS audit_trigger ON %I;
             CREATE TRIGGER audit_trigger
             AFTER INSERT OR UPDATE OR DELETE ON %I
             FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();',
            t, t
        );
    END LOOP;
END;
$$;
