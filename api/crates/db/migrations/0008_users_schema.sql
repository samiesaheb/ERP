-- =============================================================================
-- 0008  Users schema — full_name, role CHECK, is_active
-- =============================================================================

-- Rename name -> full_name (added in 0007)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'name'
  ) THEN
    ALTER TABLE users RENAME COLUMN name TO full_name;
  END IF;
END $$;

-- Ensure full_name column exists (in case 0007 didn't run on this instance)
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS full_name  VARCHAR(255) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS role       TEXT         NOT NULL DEFAULT 'admin',
    ADD COLUMN IF NOT EXISTS is_active  BOOLEAN      NOT NULL DEFAULT TRUE;

-- Drop old constraint if any, then add the correct one
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('admin', 'planner', 'supervisor', 'warehouse', 'qc', 'purchasing', 'sales', 'subcontractor'));

-- Ensure the seed admin is correct
UPDATE users
SET full_name = 'Administrator',
    role      = 'admin',
    is_active = TRUE
WHERE email = 'admin@skyhigh.com';
