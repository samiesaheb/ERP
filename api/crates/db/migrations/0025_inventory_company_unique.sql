-- =============================================================================
-- 0025  Change inventory unique constraint from (item_id) to (item_id, company_id)
--       so each company can hold its own balance row per item.
-- =============================================================================

ALTER TABLE inventory DROP CONSTRAINT IF EXISTS inventory_item_id_key;
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'inventory_item_company_unique'
    ) THEN
        ALTER TABLE inventory ADD CONSTRAINT inventory_item_company_unique UNIQUE (item_id, company_id);
    END IF;
END $$;
