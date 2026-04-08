-- =============================================================================
-- SkyHigh MES — MRP Extension (ER Diagram Alignment)
-- =============================================================================
-- Implements the 7-table MRP model from "The E-R Diagram of the Database Model":
--   item (extended)  · bom (extended)  · periods  · item_period
--   orders (extended)  · required_items  · customer (existing)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extend items with MRP planning fields
-- ---------------------------------------------------------------------------
ALTER TABLE items
    ADD COLUMN lot_size  INT NOT NULL DEFAULT 1,   -- minimum / lot-size order qty
    ADD COLUMN lead_time INT NOT NULL DEFAULT 0;   -- procurement/production lead time (in periods)

-- ---------------------------------------------------------------------------
-- 2. Add integer bom_multiplier to bom_lines
--    Mirrors the ER diagram bom.bom_multiplier (qty of component per parent unit).
--    Seeded from the existing decimal qty_per_batch rounded to nearest integer.
-- ---------------------------------------------------------------------------
ALTER TABLE bom_lines
    ADD COLUMN bom_multiplier INT NOT NULL DEFAULT 1;

UPDATE bom_lines
    SET bom_multiplier = GREATEST(1, ROUND(qty_per_batch)::INT);

-- ---------------------------------------------------------------------------
-- 3. Planning periods  (ER diagram: "periods")
-- ---------------------------------------------------------------------------
CREATE TABLE periods (
    period_number INT  PRIMARY KEY,
    start_date    DATE NOT NULL,
    end_date      DATE NOT NULL,
    CHECK (end_date >= start_date)
);

-- Seed 13 weekly periods covering Q2 2026 (current planning quarter)
INSERT INTO periods (period_number, start_date, end_date) VALUES
    ( 1, '2026-04-06', '2026-04-12'),
    ( 2, '2026-04-13', '2026-04-19'),
    ( 3, '2026-04-20', '2026-04-26'),
    ( 4, '2026-04-27', '2026-05-03'),
    ( 5, '2026-05-04', '2026-05-10'),
    ( 6, '2026-05-11', '2026-05-17'),
    ( 7, '2026-05-18', '2026-05-24'),
    ( 8, '2026-05-25', '2026-05-31'),
    ( 9, '2026-06-01', '2026-06-07'),
    (10, '2026-06-08', '2026-06-14'),
    (11, '2026-06-15', '2026-06-21'),
    (12, '2026-06-22', '2026-06-28'),
    (13, '2026-06-29', '2026-07-05');

-- ---------------------------------------------------------------------------
-- 4. Link sales_orders to a planning period  (ER diagram: orders.period_number)
-- ---------------------------------------------------------------------------
ALTER TABLE sales_orders
    ADD COLUMN period_number INT REFERENCES periods(period_number);

-- ---------------------------------------------------------------------------
-- 5. MRP table  (ER diagram: "item_period")
--    One row per (item, period); filled by the MRP run_calculation procedure.
-- ---------------------------------------------------------------------------
CREATE TABLE item_period (
    item_id               UUID NOT NULL REFERENCES items(id),
    period_number         INT  NOT NULL REFERENCES periods(period_number),
    gross_requirement     INT  NOT NULL DEFAULT 0,
    projected_inventory   INT  NOT NULL DEFAULT 0,
    planned_order_receipt INT  NOT NULL DEFAULT 0,
    planned_order_release INT  NOT NULL DEFAULT 0,
    PRIMARY KEY (item_id, period_number)
);

-- Initialise a row for every existing item × every seeded period
INSERT INTO item_period (item_id, period_number)
SELECT i.id, p.period_number
FROM   items i
CROSS  JOIN periods p;

-- Seed projected_inventory for period 1 from current on-hand stock
UPDATE item_period ip
SET    projected_inventory = COALESCE(
           (SELECT ROUND(inv.qty_on_hand)::INT
            FROM   inventory inv
            WHERE  inv.item_id = ip.item_id),
           0
       )
WHERE  ip.period_number = 1;

-- ---------------------------------------------------------------------------
-- 6. Required-items staging table  (ER diagram: "required_items")
--    Wiped and rewritten on every MRP run; acts as intermediate BOM-explosion
--    result used to feed gross_requirements into item_period.
-- ---------------------------------------------------------------------------
CREATE TABLE required_items (
    required_item_id UUID NOT NULL REFERENCES items(id),
    due_period       INT  NOT NULL,
    required_amount  INT  NOT NULL,
    PRIMARY KEY (required_item_id, due_period)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_item_period_item   ON item_period(item_id);
CREATE INDEX idx_item_period_period ON item_period(period_number);
CREATE INDEX idx_req_items_period   ON required_items(due_period);
CREATE INDEX idx_so_period          ON sales_orders(period_number);
