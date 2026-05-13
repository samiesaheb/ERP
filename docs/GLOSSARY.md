# Glossary — Skyhigh MES/ERP

Domain language, acronyms, status values, code formats, and table cross-references for the Skyhigh MES/ERP system.

---

## A

**ABC Class**
Inventory classification applied to items (`items.abc_class`):
- `A` — high-value or high-velocity; tight control, frequent cycle counts
- `B` — medium value/velocity; standard control
- `C` — low-value or slow-moving; minimal control

**Access Window**
Per-user restriction on login time and days of the week, stored in `users.allowed_days` (comma-separated weekday numbers) and `users.access_time_start` / `users.access_time_end` (UTC times). The auth handler rejects login if the current time falls outside the window. The window supports overnight spans (e.g. 22:00–06:00).

**Artwork**
Design file or packaging graphic that must be approved before a Sales Order can proceed to production. Tracked in the `artworks` table with a status of `pending` or `approved`. One Sales Order may have multiple artworks (one per line item).

**Audit Log**
Immutable record written automatically by the PostgreSQL trigger `audit_trigger_fn` after every `INSERT`, `UPDATE`, or `DELETE` on 32 tracked tables. Stored in `audit_logs` as JSONB snapshots of the old and new row, plus the user ID injected via `SET LOCAL app.current_user_id`. Never written directly from Rust code.

---

## B

**Batch** (`production_batches`)
A single physical production run executed against a Manufacturing Order and a BOM. A batch tracks three sequential production stages — Bulk, Fill, and Pack — with separate start/end timestamps and quantities for each stage. Format: `BATCH-YYYY-NNN` (e.g. `BATCH-2026-001`).

| Status | Meaning |
|---|---|
| `planned` | Created, not started |
| `bulk_production` | Mixing/compounding in progress |
| `packing` | Filling and/or packing in progress |
| `completed` | All stages finished |

**Batch Component Issue** (BCI, `batch_component_issues`)
A record of raw or packaging material drawn from inventory for a specific batch. Tracks `qty_issued`, `qty_returned`, and `qty_loss` (actual waste recorded on the shop floor). The loss column maps to the "Loss" columns in Khun Nut's Excel production report.

**BOM — Bill of Materials** (`boms`, `bom_lines`)
A versioned list of components (raw materials and packaging materials) and their quantities required to produce one batch of a Finished Good. Each `bom_line` specifies a component item, quantity, and UOM. One FG item may have multiple BOM versions; only one version (`is_active = true`) is used for new Manufacturing Orders.

**Bulk Production**
First stage of a production batch. Raw materials are weighed, combined, and processed (mixed, emulsified, heated, cooled) to produce the bulk product — the unpackaged cosmetic formulation. Tracked by `qty_bulk_produced`, `bulk_start`, and `bulk_end`.

---

## C

**Claims** (JWT payload)
The data embedded inside the JWT bearer token identifying the logged-in user:

```json
{
  "sub":       "uuid-of-user",
  "email":     "user@example.com",
  "full_name": "User Name",
  "role":      "planner",
  "iat":       1700000000,
  "exp":       1700086400
}
```

Token lifetime is 24 hours. The `role` field is the single source of truth for authorization in both the frontend RBAC check and the API `require_role()` calls.

**Cycle Count**
A periodic physical count of inventory at a specific location to reconcile system quantities against physical stock. Recorded in `inventory_transactions` with `transaction_type = 'cycle_count'`.

---

## D

**Downtime Event** (`downtime_events`)
A period of unplanned or planned machine or process stoppage recorded against a production batch. Captures the reason, start time, end time, and the work centre affected. Used for OEE (Overall Equipment Effectiveness) analysis.

---

## F

**FDA Registration** (`fda_registrations`, `fda_documents`)
Thailand Food and Drug Administration approval required for cosmetics exported to certain markets. Tracked per Sales Order. `fda_required` is a flag on both `items` and `sales_orders`; `fda_status` progresses to `approved` once documents are submitted. Supporting documents are stored in `fda_documents`.

**FG — Finished Good**
An item with `item_type = 'FG'`. A manufactured product that is sold to customers. Examples: `FG-001 Moisturising Cream 50ml`, `FG-002 Sunscreen SPF50 100ml`. Every FG must have an active BOM before a Manufacturing Order can be raised.

**Fill / Filling**
Second stage of a production batch. Bulk product is transferred from a bulk vessel into primary packaging (bottles, tubes, jars). Tracked by `qty_filled`, `fill_start`, and `fill_end`.

**Formulation** (`formulations`, `formulation_lines`)
A cosmetic recipe expressing the INCI ingredient list with percentage by weight (`% w/w`) for a Finished Good at a specified batch size (`batch_qty`). Multiple versions can exist per item; `is_active = true` marks the current working formula. A formulation is the scientific/regulatory record; a BOM is the operational production record.

---

## G

**GRN — Goods Receipt Note** (`receipts`, `receipt_lines`)
A record of materials physically received at the warehouse against a Purchase Order. Each receipt line records the item, quantity received, lot number, and location. Numbered as `GRN-YYYY-NNN`. Receiving a GRN line triggers an inventory transaction (`transaction_type = 'receipt'`) that increases stock.

---

## I

**INCI**
International Nomenclature of Cosmetic Ingredients. The standardised Latin-based naming system for cosmetic ingredients (e.g. *Butyrospermum Parkii Butter* for Shea Butter). Stored in `ingredients.inci_name`. INCI names appear on product labels and regulatory documents worldwide.

**Ingredient** (`ingredients`)
A substance identified by its INCI name and an internal code, used as a component in formulation lines. Ingredients are distinct from Items (RawMat): an ingredient is the scientific identity; a RawMat item is the purchasable/stockable unit.

**Inventory** (`inventory`)
The current stock balance for one (item, location, lot) combination. Updated by `inventory_transactions`. Key fields: `qty_available`, `qty_reserved`, `qty_on_order`.

**Inventory Transaction** (`inventory_transactions`)
A ledger entry recording every stock movement. Transaction types:
- `receipt` — goods received (GRN)
- `issue` — components issued to a batch
- `return` — unused components returned from a batch
- `adjustment` — manual stock correction
- `cycle_count` — physical count reconciliation
- `transfer` — movement between locations

---

## L

**Lifecycle Status** (`items.lifecycle_status`)
Indicates the product lifecycle stage of an item:
- `active` — normal use
- `phaseout` — being discontinued; no new orders
- `obsolete` — no longer used; hidden from most UI views

**Lot Number**
A supplier-assigned or internally-assigned identifier for a specific batch of received material. Stored on `receipt_lines.lot_number` and `batch_component_issues.lot_number`. Enables traceability: which lot of a raw material went into which production batch.

---

## M

**Manufacturing Order** (MO, `manufacturing_orders`)
An order to produce a specific quantity of a Finished Good by a planned date. Links a Sales Order (optional) to a BOM and generates one or more Production Batches. Numbered `MO-YYYY-NNN`.

| Status | Meaning |
|---|---|
| `draft` | Being planned |
| `planned` | Approved, ready to release |
| `in_progress` | At least one batch has started |
| `completed` | All planned quantity produced |
| `cancelled` | Abandoned |

**MRP — Material Requirements Planning** (`production_plans`)
A planning process that calculates what materials are needed, in what quantities, and by when, based on open Manufacturing Orders and inventory levels. Planning periods and item-level planning data are stored in the MRP tables.

---

## P

**Pack / Packing**
Third and final stage of a production batch. Filled units are placed into secondary packaging (boxes, cartons, shrink wrap) and labelled. Tracked by `qty_packed`, `pack_start`, and `pack_end`.

**PackMat — Packaging Material**
An item with `item_type = 'PackMat'`. Any component used to package a finished good — bottles, tubes, caps, labels, cartons. Examples: `PM-001 Airless Pump Bottle 50ml`, `PM-002 Tube 100ml`.

**Phase** (`formulation_lines.phase`)
A manufacturing step or grouping within a formulation, such as `A`, `B`, `Water Phase`, `Oil Phase`, `Cool-down`. Ingredients within the same phase are combined together at a specific point in the mixing process. The phase label is free text (up to 32 characters).

**PI — Proforma Invoice / Purchase Invoice**
The supplier's commercial document sent before goods ship, used to confirm pricing and terms. Stored in `purchase_orders.pi_number`. Distinct from an `invoices` record (which is the customer invoice).

**Production Batch** → see **Batch**

**Production Plan** (`production_plans`)
A record linking a Manufacturing Order to a planned time period in the MRP scheduling horizon.

**Purchase Order** (PO, `purchase_orders`)
An order placed with a supplier to procure materials. Numbered `PO-YYYY-NNN`. Each PO line specifies an item, quantity, price, and expected delivery date.

| Status | Meaning |
|---|---|
| `draft` | Being prepared |
| `sent` | Submitted to supplier |
| `confirmed` | Supplier acknowledged |
| `received` | Fully receipted via GRN |

---

## Q

**QC Test** (`qc_tests`)
A quality control measurement performed on a production batch. Stores the test name, result value, whether the batch passed, and the tester's identity. QC tests can be entered at any stage of a batch.

**% w/w — Percent Weight by Weight**
The standard way of expressing cosmetic ingredient concentrations. `10% w/w` means 10 grams of ingredient per 100 grams of total formula. All percentages in `formulation_lines.percentage` are `% w/w`. The column uses `NUMERIC(9,4)` to preserve four decimal places (e.g. `0.0050` for a trace preservative).

---

## R

**RawMat — Raw Material**
An item with `item_type = 'RawMat'`. A purchasable input ingredient used in production. Examples: `RM-001 Shea Butter`, `RM-002 Zinc Oxide`, `RM-005 Glycerin USP`.

**Receipt** → see **GRN**

**Reorder Point** (`items.reorder_point`)
The inventory quantity level at which a new purchase order should be raised to avoid a stockout. Expressed in the item's base UOM. Used by MRP to trigger procurement actions.

**Routing Step** (`routing_steps`)
An operation within a BOM describing a work centre, sequence number, and standard time for one stage of production. Routing steps define the manufacturing process flow (e.g. Step 1: Mix at WC-01, Step 2: Fill at WC-02).

---

## S

**Sales Order** (SO, `sales_orders`)
A customer order to purchase one or more finished goods. Numbered `SO-YYYY-NNN` (e.g. `SO-2026-001`). Each order has lines (`sales_order_lines`) specifying item, quantity, and price. A SO can trigger artwork approval, FDA registration, and Manufacturing Orders.

| Status | Meaning |
|---|---|
| `draft` | Being entered |
| `confirmed` | Customer has confirmed |
| `in_production` | Manufacturing Orders released |
| `shipped` | Goods dispatched |
| `invoiced` | Invoice raised and sent |
| `cancelled` | Abandoned |

**Shipment** (`shipments`, `shipment_lines`)
An outbound delivery of finished goods to a customer. One shipment can cover multiple batches and Sales Order lines. Shipment documents (packing lists, certificates of analysis) are stored in `shipping_documents`.

| Status | Meaning |
|---|---|
| `draft` | Being prepared |
| `in_transit` | Dispatched, en route |
| `delivered` | Confirmed received by customer |

---

## U

**UOM — Unit of Measure** (`uoms`)
The unit in which an item is stocked, ordered, and issued. The system uses six base UOMs:

| Code | Description |
|---|---|
| `KG` | Kilogram |
| `G` | Gram |
| `L` | Litre |
| `ML` | Millilitre |
| `PCS` | Pieces |
| `BOX` | Box |

Conversion ratios between UOMs for an item are stored in `item_uom_conversions`.

---

## W

**Warehouse Location** (`warehouse_locations`)
A physical or virtual place where inventory is stored. Location codes in the seed data: `RECV-DOCK`, `RM-STORE`, `FG-STORE`, `PACK-STORE`, `IN-TRANSIT`, `QUARANTINE`. Location types: `rack`, `bin`, `virtual`, `dock`.

**Work Centre** (`work_centers`)
A machine, production line, or workstation where a routing step is performed. Examples: Mixing Room, Filling Line, Packing Station. Work centres are referenced by routing steps and downtime events.

---

## Document Number Formats

| Document | Format | Example |
|---|---|---|
| Sales Order | `SO-YYYY-NNN` | `SO-2026-001` |
| Purchase Order | `PO-YYYY-NNN` | `PO-2026-001` |
| Manufacturing Order | `MO-YYYY-NNN` | `MO-2026-001` |
| Production Batch | `BATCH-YYYY-NNN` | `BATCH-2026-001` |
| Goods Receipt | `GRN-YYYY-NNN` | `GRN-2026-001` |

---

## Status Reference

### Sales Orders (`sales_orders.status`)
`draft` → `confirmed` → `in_production` → `shipped` → `invoiced`  
Can cancel at any pre-shipped stage → `cancelled`

### Manufacturing Orders (`manufacturing_orders.status`)
`draft` → `planned` → `in_progress` → `completed`  
Can cancel before `in_progress` → `cancelled`

### Production Batches (`production_batches.status`)
`planned` → `bulk_production` → `packing` → `completed`

### Purchase Orders (`purchase_orders.status`)
`draft` → `sent` → `confirmed` → `received`

### Shipments (`shipments.status`)
`draft` → `in_transit` → `delivered`

### Artwork (`sales_orders.artwork_status` / `artworks.status`)
`pending` → `approved`

### FDA (`sales_orders.fda_status`)
`pending` → `approved`

### Items (`items.lifecycle_status`)
`active` → `phaseout` → `obsolete`

---

## Thai / Factory Context

**Khun Nut** — Factory staff responsible for the daily production data (`record daily data production report.xlsx`). This Excel file is the source of truth for historical batch records, packaging material receipts, and inventory balances prior to go-live.

**Khun Tik** — Formulation chemist. Author of the Master Formula documents (e.g. `VY-01.1 Avocado Oil 100% Pure Moisturizing Oil`). These documents are the source for the `formulations` and `formulation_lines` tables.

**RACK codes** — Warehouse location identifiers as used in Khun Nut's spreadsheet (e.g. `RACK 33C`). Mapped to `warehouse_locations.code` during data import.

**VY-01/1** — Product code format from Khun Tik's master formulas. The `/1` suffix denotes formulation version 1. Maps to `items.item_code` (FG) and `formulations.version = 1`.
