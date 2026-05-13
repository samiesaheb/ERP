# WORKFLOW.md — Business Process Flows

This document explains how the system is used in practice: what happens in what order, which tables get written, and how status fields transition. Read this before working on any feature that crosses module boundaries.

---

## The Three Main Flows

```
┌─────────────────────────────────────────────────────────────────┐
│  FLOW 1: Order-to-Ship                                          │
│  Customer places an order → product is made → goods are shipped │
│  sales_orders → manufacturing_orders → production_batches       │
│               → shipments → invoices                            │
├─────────────────────────────────────────────────────────────────┤
│  FLOW 2: Procure-to-Receive                                     │
│  Materials are needed → supplier is ordered → stock arrives     │
│  purchase_orders → receipts → inventory_transactions            │
├─────────────────────────────────────────────────────────────────┤
│  FLOW 3: Bulk-to-Pack  (shop floor execution)                   │
│  A batch runs through three physical stages on the factory floor │
│  production_batches: planned → bulk_production → filling        │
│                             → packing → completed               │
└─────────────────────────────────────────────────────────────────┘
```

These flows are not independent. Flow 2 feeds materials into Flow 3, and Flow 3 produces the goods that Flow 1 ships. The dependency order is:

```
Formulation + BOM defined  (prerequisite — done once per product)
        ↓
Sales Order confirmed       (Flow 1 begins)
        ↓
BOM exploded → shortfalls   (triggers Flow 2 if stock is insufficient)
        ↓
Materials received          (Flow 2 completes → inventory available)
        ↓
Batch executed              (Flow 3 runs)
        ↓
Goods shipped → invoiced    (Flow 1 completes)
```

---

## Prerequisites: Formulation and BOM

Before any order can be manufactured, the product must have both a **Formulation** and a **BOM**.

**Formulation** (`formulations` + `formulation_lines`) is owned by the R&D / PD department. It defines the cosmetic recipe in percentage terms — INCI ingredient names, % w/w per phase, and batch size.

**BOM** (`boms` + `bom_lines`) is the manufacturing version. It translates the formulation percentages into absolute component quantities per production run, and adds packaging materials that the formulation does not track.

```
ingredients (INCI library)
    ↓
formulation_lines  (ingredient_id, percentage, phase)
    ↓  lives inside ↓
formulations       (item_id → FG item, version, batch_qty, batch_unit)

                         ┆  separate but parallel  ┆

items (RawMat + PackMat)
    ↓
bom_lines          (component_item_id, qty_required, uom_id)
    ↓  lives inside ↓
boms               (finished_good_id → FG item, version, is_active)
```

A BOM may also have **routing steps** (`routing_steps`) that define which work centres are used and in what order. A formulation has no routing — it only defines what goes in, not how it is made.

**One product can have multiple BOM versions.** Only one BOM has `is_active = true` at a time. When creating a Manufacturing Order, the planner selects which BOM version to use.

### BOM Explosion

Before production starts, the planner runs BOM explosion (`GET /api/v1/boms/:id/explode?qty=N`). This multiplies each `bom_line.qty_required` by the requested production quantity and compares it against current `inventory.qty_available`. The result is a shortfall list — the input to Flow 2.

---

## Flow 1: Order-to-Ship

### Stage 1 — Sales Order Created

**Who:** Sales team  
**Tables written:** `sales_orders`, `sales_order_lines`

A sales order starts as `draft`. The sales team enters the customer, destination country, required date, and line items (product SKU, quantity, unit price, BOM version).

```
sales_orders.status:  draft
```

If the destination country requires FDA registration, `fda_required = true` is set and a parallel FDA track opens (see Stage 1a).

If the product needs new or revised packaging artwork, `artwork_status = 'pending'` and a parallel artwork track opens (see Stage 1b).

---

### Stage 1a — Artwork Track (parallel)

**Who:** Artwork / Design team  
**Tables written:** `artworks`

```
artworks.status:  draft → in_review → approved
                                    → rejected (loops back to draft)

sales_orders.artwork_status:  pending → in_review → approved
```

An artwork record is created per line item that needs packaging design. The file URL is attached when the design is ready, status moves to `in_review`, and the department head approves or rejects. Rejection creates a new version (`version` increments). The sales order's `artwork_status` field mirrors the least-advanced artwork status across all its lines. Production cannot start until `artwork_status = 'approved'`.

---

### Stage 1b — FDA Track (parallel, when required)

**Who:** Regulatory / QC team  
**Tables written:** `fda_registrations`, `fda_documents`

```
fda_registrations.status:  pending → submitted → approved
                                               → rejected

sales_orders.fda_status:   pending → submitted → approved
```

FDA registration is per item per sales order. Supporting documents (CoA, safety data sheet, product notification form) are attached as `fda_documents`. The sales order cannot be confirmed if `fda_required = true` and `fda_status ≠ 'approved'`.

---

### Stage 2 — Sales Order Confirmed

**Who:** Planner / Sales supervisor  
**Tables written:** `sales_orders` (status update)

Once artwork is approved and FDA (if required) is approved, the sales order is confirmed.

```
sales_orders.status:  draft → confirmed
```

This is the trigger for the planner to create a Manufacturing Order.

---

### Stage 3 — Manufacturing Order Created

**Who:** Planner  
**Tables written:** `manufacturing_orders`

The planner creates one `manufacturing_order` per SO line item (or groups multiple SO lines into one MO if the same product is ordered by multiple customers in the same run).

```
manufacturing_orders.status:  draft → planned → in_progress → completed
                                                             → cancelled
```

Key fields set at creation:
- `item_id` — the FG item being produced
- `bom_id` — which BOM version to use
- `qty_planned` — total units to produce
- `planned_start` / `planned_end` — scheduled dates
- `sales_order_id` — links back to the originating order

At this point the planner runs BOM explosion to check for material shortfalls. If shortfalls exist, purchase orders are raised (Flow 2). The MO stays in `planned` until materials are confirmed available.

```
sales_orders.status → in_production  (set when MO moves to in_progress)
```

---

### Stage 4 — Shipment Created

**Who:** Warehouse / Logistics team  
**Tables written:** `shipments`, `shipment_lines`, `shipping_documents`

Once the batch is completed (Flow 3), the warehouse creates a shipment record and links it back to the sales order.

```
shipments.status:  loading → dispatched → in_transit → delivered
```

`shipment_lines` records which items from which production batches are included and in what quantity. `shipping_documents` attaches packing lists, bills of lading, and certificates of analysis.

```
sales_orders.status → shipped  (set when shipment dispatched)
```

---

### Stage 5 — Invoice Raised and Paid

**Who:** Finance team  
**Tables written:** `invoices`, `invoice_lines`, `payments`

An invoice is raised after shipment dispatch, linked to both the sales order and the shipment.

```
invoices.status:  draft → sent → partially_paid → paid
                                                 → overdue
                                                 → cancelled

payments.status:  pending → cleared → failed
```

`invoice_lines` itemises what was shipped. The total is `subtotal` (sum of line totals) + `tax`. Once payment clears, `invoices.status = 'paid'` and the sales order lifecycle is complete.

```
sales_orders.status → invoiced  (set when invoice is paid)
```

---

### Flow 1 Complete — Status Summary

| Entity | Terminal status |
|---|---|
| `sales_orders` | `invoiced` |
| `artworks` | `approved` |
| `fda_registrations` | `approved` (if required) |
| `manufacturing_orders` | `completed` |
| `shipments` | `delivered` |
| `invoices` | `paid` |

---

## Flow 2: Procure-to-Receive

Triggered by a BOM explosion shortfall or by the purchasing team proactively replenishing stock.

### Stage 1 — Purchase Order Raised

**Who:** Purchasing team  
**Tables written:** `purchase_orders`, `purchase_order_lines`

```
purchase_orders.status:  draft → sent → confirmed → partially_received → received
                                                                        → cancelled
```

A PO is raised per supplier. Each line references an `item_id` (RawMat or PackMat), the `qty_ordered`, `uom_id`, and `unit_cost`. If the PO is raised to support a specific MO, `manufacturing_order_id` is set — this creates a traceable link between the procurement and the production run it feeds.

A `production_plan` record can also be created at this point to formally schedule when the materials are expected to arrive and when production will start.

---

### Stage 2 — Goods Receipt (GRN)

**Who:** Warehouse team  
**Tables written:** `receipts`, `receipt_lines`

When goods arrive, the warehouse creates a receipt against the PO.

```
receipt_lines.qc_status:  pending → passed → failed
```

Each receipt line captures:
- `qty_received` — actual quantity received (may differ from qty_ordered)
- `lot_number` — the supplier's lot/batch identifier
- `expiry_date` — shelf life date
- `qc_status` — set to `passed` once QC inspects the material

`purchase_order_lines.qty_received` is updated. When all lines are fully received, `purchase_orders.status = 'received'`. Partial receipts move it to `'partially_received'`.

---

### Stage 3 — Inventory Updated

**Who:** System (triggered by receipt creation)  
**Tables written:** `inventory`, `inventory_transactions`

Receiving a GRN line creates an `inventory_transaction` with `transaction_type = 'receipt'`, incrementing `inventory.qty_available` for that item.

**All inventory movements are recorded as transactions.** The balance in `inventory` is the running total. Transaction types:

| Type | Effect on `qty_available` | When |
|---|---|---|
| `receipt` | + (increase) | Goods received from supplier |
| `opening_balance` | + (set) | Initial stock load |
| `issue` | − (decrease) | Components issued to a production batch |
| `return` | + (increase) | Components returned from a batch |
| `loss` | − (decrease) | Scrap or damaged goods |
| `adjustment` | ± (signed) | Manual cycle count correction |
| `conversion` | − (decrease) | UOM conversion (e.g. roll → metres) |

---

## Flow 3: Bulk-to-Pack (Shop Floor Execution)

This flow is entirely within the `production_batches` table and its child tables. It models the physical movement of product through the factory.

### The Three Stages of a Cosmetics Production Batch

```
RAW MATERIALS + PACKAGING ARRIVE IN WAREHOUSE
        ↓
┌───────────────┐    Components weighed and issued
│ BULK PRODUCTION│◄── batch_component_issues created
│ (Mixing)      │    work_center: mixer
└───────┬───────┘    QC: viscosity, pH, appearance
        │  qty_bulk_produced recorded
        ↓
┌───────────────┐    Bulk product filled into primary packaging
│    FILLING    │    (bottles, tubes, jars)
│               │    work_center: filler
└───────┬───────┘    QC: fill weight, appearance
        │  qty_filled recorded
        ↓
┌───────────────┐    Filled units labelled, boxed, cartoned
│    PACKING    │    Stickers, boxes, cartons consumed from inventory
│               │    work_center: packer
└───────┬───────┘    QC: label accuracy, carton count
        │  qty_packed recorded
        ↓
FINISHED GOODS ENTER WAREHOUSE
shipment_lines reference this batch
```

### Status Transitions

```
production_batches.status:

  planned  ──►  bulk_production  ──►  filling  ──►  packing  ──►  completed
```

Each transition sets a timestamp pair:

| Status transition | Timestamps set |
|---|---|
| `planned → bulk_production` | `bulk_start` |
| bulk complete | `bulk_end` |
| `bulk_production → filling` | `fill_start` |
| filling complete | `fill_end` |
| `filling → packing` | `pack_start` |
| packing complete | `pack_end` → `status = completed` |

### Component Issues (`batch_component_issues`)

When raw materials and packaging are physically withdrawn from the warehouse for a batch, a `batch_component_issue` record is created per component:

- `qty_issued` — what was taken from the shelf
- `qty_returned` — unused material returned after production
- `qty_loss` — material lost during production (spill, startup waste, sample)
- Net consumption = `qty_issued − qty_returned − qty_loss`

This also creates an `inventory_transaction` with `transaction_type = 'issue'` to decrement stock.

### QC Tests (`qc_tests`)

QC tests are recorded per batch at any point during execution.

```
qc_tests.pass_fail:  pending → pass
                             → fail
```

Test types: `viscosity`, `ph`, `microbial`, `temperature`, `appearance`, `weight`, `other`.

Min/max specifications (`min_spec`, `max_spec`) are stored on the test record. The result value is free text (e.g. `"6.2"` for pH). A failed QC test does not automatically block the batch — the supervisor decides whether to hold, rework, or pass.

### Downtime Events (`downtime_events`)

Unplanned stoppages are recorded against the batch and the specific work centre that stopped.

```
downtime_events:  start_time recorded on creation
                  end_time recorded when event is closed
```

Downtime reason codes are free text. Downtime duration = `end_time − start_time`. These feed into OEE (Overall Equipment Effectiveness) reporting.

### Routing Steps (`routing_steps`)

Routing steps are defined on the BOM, not on the batch. They describe the planned sequence of operations and their standard times. Each step references a `work_center_id`. The batch follows this routing; actual times are recorded via the stage timestamps above.

---

## Supporting Flow: Access Requests

When a user needs to perform an action their role does not normally permit (e.g. a `warehouse` user needs to update a sales order status), they raise an access request.

```
access_requests.status:  pending → approved
                                 → denied
```

The `reviewed_by` (admin or planner) approves or denies. Approval does not automatically grant the permission in the system — it is a governance record. The actual permission change is made separately by an admin updating the user's role.

---

## Status Reference

All status values for every entity in one place.

| Entity | Status values | Default |
|---|---|---|
| `sales_orders` | `draft` / `confirmed` / `in_production` / `shipped` / `invoiced` / `cancelled` | `draft` |
| `sales_orders.artwork_status` | `pending` / `in_review` / `approved` | `pending` |
| `sales_orders.fda_status` | `pending` / `submitted` / `approved` | `pending` |
| `artworks` | `draft` / `in_review` / `approved` / `rejected` | `draft` |
| `fda_registrations` | `pending` / `submitted` / `approved` / `rejected` | `pending` |
| `manufacturing_orders` | `draft` / `planned` / `in_progress` / `completed` / `cancelled` | `draft` |
| `production_batches` | `planned` / `bulk_production` / `filling` / `packing` / `completed` | `planned` |
| `purchase_orders` | `draft` / `sent` / `confirmed` / `partially_received` / `received` / `cancelled` | `draft` |
| `receipt_lines.qc_status` | `pending` / `passed` / `failed` | `pending` |
| `qc_tests.pass_fail` | `pending` / `pass` / `fail` | `pending` |
| `shipments` | `loading` / `dispatched` / `in_transit` / `delivered` | `loading` |
| `invoices` | `draft` / `sent` / `partially_paid` / `paid` / `overdue` / `cancelled` | `draft` |
| `payments` | `pending` / `cleared` / `failed` | `pending` |
| `access_requests` | `pending` / `approved` / `denied` | `pending` |
| `work_centers` | `active` / `maintenance` / `inactive` | `active` |
| `items.lifecycle_status` | `active` / `phaseout` / `obsolete` | `active` |

---

## Table Population Order

When inserting a complete production record from scratch (e.g. the Excel data import), tables must be populated in this order to satisfy all foreign key constraints:

```
1.  uoms                    (referenced by almost everything)
2.  countries               (referenced by customers, suppliers)
3.  customer_types          (referenced by customers)
4.  customers               (referenced by sales_orders, invoices)
5.  suppliers               (referenced by purchase_orders, item_supplier)
6.  items                   (referenced by boms, inventory, formulations, …)
7.  item_supplier           (references items + suppliers)
8.  item_uom_conversions    (references items + uoms)
9.  ingredients             (referenced by formulation_lines)
10. formulations            (references items)
11. formulation_lines       (references formulations + ingredients)
12. boms                    (references items)
13. bom_lines               (references boms + items + uoms)
14. work_centers            (referenced by routing_steps)
15. routing_steps           (references boms + work_centers)
16. warehouse_locations     (referenced indirectly via inventory.location text)
17. inventory               (references items + uoms)
18. inventory_transactions  (references items + uoms + users)
19. sales_orders            (references customers + countries)
20. sales_order_lines       (references sales_orders + items + uoms + boms)
21. artworks                (references sales_orders + items)
22. fda_registrations       (references sales_orders + items)
23. fda_documents           (references fda_registrations)
24. manufacturing_orders    (references sales_orders + items + boms + uoms)
25. production_plans        (references manufacturing_orders)
26. purchase_orders         (references suppliers + manufacturing_orders)
27. purchase_order_lines    (references purchase_orders + items + uoms)
28. receipts                (references purchase_orders)
29. receipt_lines           (references receipts + purchase_order_lines + items + uoms)
30. production_batches      (references manufacturing_orders + boms + uoms)
31. batch_component_issues  (references production_batches + items + uoms)
32. qc_tests                (references production_batches)
33. downtime_events         (references production_batches + work_centers)
34. shipments               (references sales_orders)
35. shipment_lines          (references shipments + items + production_batches + uoms)
36. shipping_documents      (references shipments)
37. invoices                (references customers + sales_orders + shipments)
38. invoice_lines           (references invoices + items + uoms)
39. payments                (references customers/suppliers + invoices/purchase_orders)
```

---

## How the Flows Connect to the Database Spine

The entire system pivots on the `items` table. Every material, component, and finished good is an item. Every quantity, cost, and movement references an item.

```
                        ┌──────────┐
                        │  items   │  FG / RawMat / PackMat
                        └────┬─────┘
            ┌────────────────┼────────────────────────┐
            ▼                ▼                         ▼
         boms           inventory               sales_order_lines
            │                │                         │
            ▼                ▼                         ▼
       bom_lines     inventory_transactions   manufacturing_orders
            │                                          │
            └──────────────────────────────────────────┤
                                                        ▼
                                               production_batches
                                                        │
                              ┌─────────────────────────┤
                              ▼                         ▼
                  batch_component_issues          qc_tests
                  (inventory decremented)    (quality checked)
                                                        │
                                                        ▼
                                                  shipment_lines
                                                        │
                                                        ▼
                                                    invoices
```
