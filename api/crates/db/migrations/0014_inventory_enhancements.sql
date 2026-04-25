-- 0014  Inventory classification, cycle count tracking, non-negative stock guard

-- Per-item replenishment and classification fields
ALTER TABLE items
  ADD COLUMN IF NOT EXISTS reorder_point   NUMERIC(18,4),
  ADD COLUMN IF NOT EXISTS abc_class       TEXT CHECK (abc_class IN ('A','B','C')),
  ADD COLUMN IF NOT EXISTS lifecycle_status TEXT NOT NULL DEFAULT 'active'
    CHECK (lifecycle_status IN ('active','phaseout','obsolete'));

-- Cycle count: timestamp of last physical count
ALTER TABLE inventory
  ADD COLUMN IF NOT EXISTS last_counted_at TIMESTAMPTZ;

-- Protect stock from going negative (idempotent — skips if constraint already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'inventory_qty_available_nonneg'
  ) THEN
    ALTER TABLE inventory
      ADD CONSTRAINT inventory_qty_available_nonneg
        CHECK (qty_available >= 0) NOT VALID;
    ALTER TABLE inventory VALIDATE CONSTRAINT inventory_qty_available_nonneg;
  END IF;
END $$;
