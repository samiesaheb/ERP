-- =============================================================================
-- 0023  Set default company_id on all entity tables
--       Points to the TEST company so existing INSERT statements (which don't
--       yet pass company_id explicitly) continue to work while proper
--       company-context handling is built into the API layer.
-- =============================================================================

DO $$
DECLARE
    v_id UUID;
BEGIN
    SELECT id INTO STRICT v_id FROM companies WHERE code = 'TEST';

    EXECUTE format('ALTER TABLE customers          ALTER COLUMN company_id SET DEFAULT %L', v_id);
    EXECUTE format('ALTER TABLE suppliers          ALTER COLUMN company_id SET DEFAULT %L', v_id);
    EXECUTE format('ALTER TABLE items              ALTER COLUMN company_id SET DEFAULT %L', v_id);
    EXECUTE format('ALTER TABLE ingredients        ALTER COLUMN company_id SET DEFAULT %L', v_id);
    EXECUTE format('ALTER TABLE boms               ALTER COLUMN company_id SET DEFAULT %L', v_id);
    EXECUTE format('ALTER TABLE formulations       ALTER COLUMN company_id SET DEFAULT %L', v_id);
    EXECUTE format('ALTER TABLE warehouse_locations ALTER COLUMN company_id SET DEFAULT %L', v_id);
    EXECUTE format('ALTER TABLE inventory          ALTER COLUMN company_id SET DEFAULT %L', v_id);
    EXECUTE format('ALTER TABLE work_centers       ALTER COLUMN company_id SET DEFAULT %L', v_id);
    EXECUTE format('ALTER TABLE sales_orders       ALTER COLUMN company_id SET DEFAULT %L', v_id);
    EXECUTE format('ALTER TABLE artworks           ALTER COLUMN company_id SET DEFAULT %L', v_id);
    EXECUTE format('ALTER TABLE fda_registrations  ALTER COLUMN company_id SET DEFAULT %L', v_id);
    EXECUTE format('ALTER TABLE purchase_orders    ALTER COLUMN company_id SET DEFAULT %L', v_id);
    EXECUTE format('ALTER TABLE receipts           ALTER COLUMN company_id SET DEFAULT %L', v_id);
    EXECUTE format('ALTER TABLE manufacturing_orders ALTER COLUMN company_id SET DEFAULT %L', v_id);
    EXECUTE format('ALTER TABLE production_batches ALTER COLUMN company_id SET DEFAULT %L', v_id);
    EXECUTE format('ALTER TABLE production_plans   ALTER COLUMN company_id SET DEFAULT %L', v_id);
    EXECUTE format('ALTER TABLE shipments          ALTER COLUMN company_id SET DEFAULT %L', v_id);
    EXECUTE format('ALTER TABLE invoices           ALTER COLUMN company_id SET DEFAULT %L', v_id);
    EXECUTE format('ALTER TABLE payments           ALTER COLUMN company_id SET DEFAULT %L', v_id);
    EXECUTE format('ALTER TABLE access_requests    ALTER COLUMN company_id SET DEFAULT %L', v_id);
END;
$$;
