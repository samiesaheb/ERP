-- 0015  Warehouse location hierarchy (Site → Zone → Aisle → Section → Shelf/Bin)
--       Includes virtual locations for in-transit, quarantine, and dock staging.

CREATE TABLE IF NOT EXISTS warehouse_locations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT        NOT NULL UNIQUE,
  zone            TEXT,
  aisle           TEXT,
  section         TEXT,
  shelf_level     TEXT,
  -- travel_sequence orders bins for S-shape pick-path optimisation
  travel_sequence INT,
  location_type   TEXT        NOT NULL DEFAULT 'bin'
    CHECK (location_type IN ('rack','bin','virtual','dock')),
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  -- Virtual locations never hold physical stock (in-transit, damaged, etc.)
  is_virtual      BOOLEAN     NOT NULL DEFAULT FALSE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed standard physical and virtual locations
INSERT INTO warehouse_locations (code, location_type, is_virtual, is_active, notes) VALUES
  ('RECV-DOCK',  'dock',    FALSE, TRUE, 'Receiving dock — incoming goods staging area'),
  ('RM-STORE',   'bin',     FALSE, TRUE, 'Raw material storage'),
  ('FG-STORE',   'bin',     FALSE, TRUE, 'Finished goods storage'),
  ('PACK-STORE', 'bin',     FALSE, TRUE, 'Packaging material storage'),
  ('IN-TRANSIT', 'virtual', TRUE,  TRUE, 'Virtual: goods in transit between locations'),
  ('QUARANTINE', 'virtual', TRUE,  TRUE, 'Damaged or quarantine hold — not available to pick')
ON CONFLICT (code) DO NOTHING;
