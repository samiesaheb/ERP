-- =============================================================================
-- 0022  Tag all existing data with "Test Company"
--       Adds company_id to every entity table (skips line/child tables,
--       global reference tables, and system tables).
-- =============================================================================

DO $$
DECLARE
    v_id UUID := gen_random_uuid();
BEGIN
    -- Create "Test Company" with a known code
    INSERT INTO companies (id, code, name, base_currency, fiscal_year_start_month, is_active)
    VALUES (v_id, 'TEST', 'Test Company', 'THB', 1, TRUE);

    -- -------------------------------------------------------------------------
    -- Helper: for each entity table —
    --   1. Add company_id column (nullable, FK to companies)
    --   2. Backfill all existing rows
    --   3. Make NOT NULL
    --   4. Create index for fast per-company queries
    -- -------------------------------------------------------------------------

    -- customers
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
    EXECUTE 'UPDATE customers SET company_id = $1 WHERE company_id IS NULL' USING v_id;
    ALTER TABLE customers ALTER COLUMN company_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_id);

    -- suppliers
    ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
    EXECUTE 'UPDATE suppliers SET company_id = $1 WHERE company_id IS NULL' USING v_id;
    ALTER TABLE suppliers ALTER COLUMN company_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_suppliers_company ON suppliers(company_id);

    -- items
    ALTER TABLE items ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
    EXECUTE 'UPDATE items SET company_id = $1 WHERE company_id IS NULL' USING v_id;
    ALTER TABLE items ALTER COLUMN company_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_items_company ON items(company_id);

    -- ingredients
    ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
    EXECUTE 'UPDATE ingredients SET company_id = $1 WHERE company_id IS NULL' USING v_id;
    ALTER TABLE ingredients ALTER COLUMN company_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_ingredients_company ON ingredients(company_id);

    -- boms
    ALTER TABLE boms ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
    EXECUTE 'UPDATE boms SET company_id = $1 WHERE company_id IS NULL' USING v_id;
    ALTER TABLE boms ALTER COLUMN company_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_boms_company ON boms(company_id);

    -- formulations
    ALTER TABLE formulations ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
    EXECUTE 'UPDATE formulations SET company_id = $1 WHERE company_id IS NULL' USING v_id;
    ALTER TABLE formulations ALTER COLUMN company_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_formulations_company ON formulations(company_id);

    -- warehouse_locations
    ALTER TABLE warehouse_locations ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
    EXECUTE 'UPDATE warehouse_locations SET company_id = $1 WHERE company_id IS NULL' USING v_id;
    ALTER TABLE warehouse_locations ALTER COLUMN company_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_warehouse_locations_company ON warehouse_locations(company_id);

    -- inventory
    ALTER TABLE inventory ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
    EXECUTE 'UPDATE inventory SET company_id = $1 WHERE company_id IS NULL' USING v_id;
    ALTER TABLE inventory ALTER COLUMN company_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_inventory_company ON inventory(company_id);

    -- work_centers
    ALTER TABLE work_centers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
    EXECUTE 'UPDATE work_centers SET company_id = $1 WHERE company_id IS NULL' USING v_id;
    ALTER TABLE work_centers ALTER COLUMN company_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_work_centers_company ON work_centers(company_id);

    -- sales_orders
    ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
    EXECUTE 'UPDATE sales_orders SET company_id = $1 WHERE company_id IS NULL' USING v_id;
    ALTER TABLE sales_orders ALTER COLUMN company_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_sales_orders_company ON sales_orders(company_id);

    -- artworks
    ALTER TABLE artworks ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
    EXECUTE 'UPDATE artworks SET company_id = $1 WHERE company_id IS NULL' USING v_id;
    ALTER TABLE artworks ALTER COLUMN company_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_artworks_company ON artworks(company_id);

    -- fda_registrations
    ALTER TABLE fda_registrations ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
    EXECUTE 'UPDATE fda_registrations SET company_id = $1 WHERE company_id IS NULL' USING v_id;
    ALTER TABLE fda_registrations ALTER COLUMN company_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_fda_registrations_company ON fda_registrations(company_id);

    -- purchase_orders
    ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
    EXECUTE 'UPDATE purchase_orders SET company_id = $1 WHERE company_id IS NULL' USING v_id;
    ALTER TABLE purchase_orders ALTER COLUMN company_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_purchase_orders_company ON purchase_orders(company_id);

    -- receipts
    ALTER TABLE receipts ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
    EXECUTE 'UPDATE receipts SET company_id = $1 WHERE company_id IS NULL' USING v_id;
    ALTER TABLE receipts ALTER COLUMN company_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_receipts_company ON receipts(company_id);

    -- manufacturing_orders
    ALTER TABLE manufacturing_orders ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
    EXECUTE 'UPDATE manufacturing_orders SET company_id = $1 WHERE company_id IS NULL' USING v_id;
    ALTER TABLE manufacturing_orders ALTER COLUMN company_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_manufacturing_orders_company ON manufacturing_orders(company_id);

    -- production_batches
    ALTER TABLE production_batches ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
    EXECUTE 'UPDATE production_batches SET company_id = $1 WHERE company_id IS NULL' USING v_id;
    ALTER TABLE production_batches ALTER COLUMN company_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_production_batches_company ON production_batches(company_id);

    -- production_plans
    ALTER TABLE production_plans ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
    EXECUTE 'UPDATE production_plans SET company_id = $1 WHERE company_id IS NULL' USING v_id;
    ALTER TABLE production_plans ALTER COLUMN company_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_production_plans_company ON production_plans(company_id);

    -- shipments
    ALTER TABLE shipments ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
    EXECUTE 'UPDATE shipments SET company_id = $1 WHERE company_id IS NULL' USING v_id;
    ALTER TABLE shipments ALTER COLUMN company_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_shipments_company ON shipments(company_id);

    -- invoices
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
    EXECUTE 'UPDATE invoices SET company_id = $1 WHERE company_id IS NULL' USING v_id;
    ALTER TABLE invoices ALTER COLUMN company_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id);

    -- payments
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
    EXECUTE 'UPDATE payments SET company_id = $1 WHERE company_id IS NULL' USING v_id;
    ALTER TABLE payments ALTER COLUMN company_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_payments_company ON payments(company_id);

    -- access_requests
    ALTER TABLE access_requests ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
    EXECUTE 'UPDATE access_requests SET company_id = $1 WHERE company_id IS NULL' USING v_id;
    ALTER TABLE access_requests ALTER COLUMN company_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_access_requests_company ON access_requests(company_id);

END;
$$;
