# SkyHigh MES — Database Schema

Derived from the SkyHigh Manufacturing Execution Workflow (Draft 2, 6/3/2026).

---

## Workflow Overview

```
Customer/Country/UOM Masters
        │
        ▼
   Sales Order ──► Artwork Creation ──► FDA Registration / FDA DOCs
        │
        ▼
Manufacturing Order ──► Item Master (FG / RawMat / PackMat)
        │                       │
        │               BOM / Formulation ──► Item-UOM Conversion
        ▼
  Purchase Order ◄── Planning ──► Supplier Master / Item-Supplier Master
        │
        ▼
    Receiving ──► Inventory
        │
        ▼
 Bulk Production ──► Batch / Formulation
        │
        ▼
 Filling / Forming ◄──► Item Management (Conversion, Loss, Receipts, Issues, Returns)
        │
        ▼
    Packing
        │
        ▼
Loading / Shipping ──► Shipping Documents
        │
        ▼
Customer Invoicing
        │
        ▼
Supplier / Customer Payment Management
```

---

## 1. Master Tables

### `customer_types`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | TEXT NOT NULL | e.g. Distributor, Direct |
| created_at | TIMESTAMPTZ | |

### `countries`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | TEXT NOT NULL | |
| code | VARCHAR(3) | ISO alpha-3 |
| created_at | TIMESTAMPTZ | |

### `customers`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | TEXT NOT NULL | |
| customer_type_id | UUID FK → customer_types | |
| country_id | UUID FK → countries | |
| email | TEXT | |
| phone | TEXT | |
| address | TEXT | |
| created_at | TIMESTAMPTZ | |

### `uoms` (Units of Measure)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| code | VARCHAR(20) NOT NULL | e.g. KG, L, EA, CS |
| description | TEXT | |

### `suppliers`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | TEXT NOT NULL | |
| type | TEXT | International / Local |
| country_id | UUID FK → countries | |
| email | TEXT | |
| phone | TEXT | |
| address | TEXT | |
| payment_terms | TEXT | |
| created_at | TIMESTAMPTZ | |

---

## 2. Item Master

### `items`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| item_code | TEXT NOT NULL UNIQUE | |
| description | TEXT NOT NULL | |
| item_type | TEXT NOT NULL | FG / RawMat / PackMat |
| uom_id | UUID FK → uoms | Base UOM |
| fda_required | BOOLEAN DEFAULT false | |
| is_active | BOOLEAN DEFAULT true | |
| created_at | TIMESTAMPTZ | |

### `item_uom_conversions`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| item_id | UUID FK → items | |
| from_uom_id | UUID FK → uoms | |
| to_uom_id | UUID FK → uoms | |
| conversion_factor | NUMERIC(18,6) NOT NULL | |

### `item_supplier`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| item_id | UUID FK → items | |
| supplier_id | UUID FK → suppliers | |
| supplier_item_code | TEXT | Supplier's own SKU |
| lead_time_days | INT | |
| unit_cost | NUMERIC(18,4) | |
| preferred | BOOLEAN DEFAULT false | |

---

## 3. BOM / Formulation

### `boms`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| finished_good_id | UUID FK → items | Must be item_type = FG |
| version | INT NOT NULL DEFAULT 1 | |
| description | TEXT | |
| is_active | BOOLEAN DEFAULT true | |
| created_at | TIMESTAMPTZ | |

### `bom_lines`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| bom_id | UUID FK → boms | |
| component_item_id | UUID FK → items | RawMat or PackMat |
| qty_required | NUMERIC(18,6) NOT NULL | Per batch |
| uom_id | UUID FK → uoms | |
| notes | TEXT | |

---

## 4. Sales Orders

### `sales_orders`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| order_number | TEXT NOT NULL UNIQUE | |
| customer_id | UUID FK → customers | |
| country_id | UUID FK → countries | Destination |
| status | TEXT NOT NULL | draft / confirmed / in_production / shipped / invoiced / cancelled |
| artwork_status | TEXT | pending / in_review / approved |
| fda_required | BOOLEAN DEFAULT false | |
| fda_status | TEXT | pending / submitted / approved |
| total_pieces | NUMERIC(18,2) | |
| order_date | DATE | |
| required_date | DATE | |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | |

### `sales_order_lines`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| sales_order_id | UUID FK → sales_orders | |
| item_id | UUID FK → items | FG items only |
| qty_ordered | NUMERIC(18,4) NOT NULL | |
| uom_id | UUID FK → uoms | |
| unit_price | NUMERIC(18,4) | |
| notes | TEXT | |

---

## 5. Artwork & FDA

### `artworks`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| sales_order_id | UUID FK → sales_orders | |
| item_id | UUID FK → items | |
| version | INT DEFAULT 1 | |
| status | TEXT | draft / in_review / approved / rejected |
| file_url | TEXT | |
| submitted_at | TIMESTAMPTZ | |
| approved_at | TIMESTAMPTZ | |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | |

### `fda_registrations`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| sales_order_id | UUID FK → sales_orders | |
| item_id | UUID FK → items | |
| registration_number | TEXT | |
| status | TEXT | pending / submitted / approved / rejected |
| submitted_at | TIMESTAMPTZ | |
| approved_at | TIMESTAMPTZ | |
| expiry_date | DATE | |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | |

### `fda_documents`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| fda_registration_id | UUID FK → fda_registrations | |
| doc_type | TEXT | e.g. Certificate, Test Report |
| file_url | TEXT | |
| uploaded_at | TIMESTAMPTZ | |

---

## 6. Manufacturing Orders

### `manufacturing_orders`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| mo_number | TEXT NOT NULL UNIQUE | |
| sales_order_id | UUID FK → sales_orders | Nullable for standalone MOs |
| item_id | UUID FK → items | FG to produce |
| bom_id | UUID FK → boms | |
| status | TEXT NOT NULL | draft / planned / in_progress / completed / cancelled |
| qty_planned | NUMERIC(18,4) NOT NULL | |
| qty_produced | NUMERIC(18,4) DEFAULT 0 | |
| uom_id | UUID FK → uoms | |
| planned_start | DATE | |
| planned_end | DATE | |
| actual_start | TIMESTAMPTZ | |
| actual_end | TIMESTAMPTZ | |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | |

---

## 7. Purchase Orders

### `purchase_orders`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| po_number | TEXT NOT NULL UNIQUE | |
| supplier_id | UUID FK → suppliers | |
| manufacturing_order_id | UUID FK → manufacturing_orders | Nullable |
| status | TEXT NOT NULL | draft / sent / confirmed / partially_received / received / cancelled |
| order_date | DATE | |
| expected_date | DATE | |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | |

### `purchase_order_lines`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| purchase_order_id | UUID FK → purchase_orders | |
| item_id | UUID FK → items | RawMat / PackMat |
| qty_ordered | NUMERIC(18,4) NOT NULL | |
| qty_received | NUMERIC(18,4) DEFAULT 0 | |
| uom_id | UUID FK → uoms | |
| unit_cost | NUMERIC(18,4) | |

---

## 8. Receiving

### `receipts`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| receipt_number | TEXT NOT NULL UNIQUE | |
| purchase_order_id | UUID FK → purchase_orders | |
| received_by | UUID FK → users | |
| received_at | TIMESTAMPTZ NOT NULL | |
| notes | TEXT | |

### `receipt_lines`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| receipt_id | UUID FK → receipts | |
| po_line_id | UUID FK → purchase_order_lines | |
| item_id | UUID FK → items | |
| qty_received | NUMERIC(18,4) NOT NULL | |
| uom_id | UUID FK → uoms | |
| lot_number | TEXT | |
| expiry_date | DATE | |
| qc_status | TEXT | pending / passed / failed |

---

## 9. Inventory

### `inventory`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| item_id | UUID FK → items | |
| location | TEXT | Warehouse / zone |
| lot_number | TEXT | |
| qty_available | NUMERIC(18,4) NOT NULL DEFAULT 0 | |
| qty_reserved | NUMERIC(18,4) NOT NULL DEFAULT 0 | |
| uom_id | UUID FK → uoms | |
| last_updated | TIMESTAMPTZ | |

### `inventory_transactions`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| item_id | UUID FK → items | |
| transaction_type | TEXT NOT NULL | receipt / issue / return / conversion / loss / adjustment |
| reference_type | TEXT | receipt / mo / packing / etc. |
| reference_id | UUID | FK to relevant table |
| qty | NUMERIC(18,4) NOT NULL | Positive = in, Negative = out |
| uom_id | UUID FK → uoms | |
| lot_number | TEXT | |
| notes | TEXT | |
| created_by | UUID FK → users | |
| created_at | TIMESTAMPTZ | |

---

## 10. Production — Bulk, Batch, Filling, Packing

### `production_batches`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| batch_number | TEXT NOT NULL UNIQUE | |
| manufacturing_order_id | UUID FK → manufacturing_orders | |
| bom_id | UUID FK → boms | |
| status | TEXT NOT NULL | planned / bulk_production / filling / packing / completed |
| qty_bulk_produced | NUMERIC(18,4) | |
| qty_filled | NUMERIC(18,4) | |
| qty_packed | NUMERIC(18,4) | |
| uom_id | UUID FK → uoms | |
| bulk_start | TIMESTAMPTZ | |
| bulk_end | TIMESTAMPTZ | |
| fill_start | TIMESTAMPTZ | |
| fill_end | TIMESTAMPTZ | |
| pack_start | TIMESTAMPTZ | |
| pack_end | TIMESTAMPTZ | |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | |

### `batch_component_issues`
Tracks raw material / packaging material issued to a batch.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| batch_id | UUID FK → production_batches | |
| item_id | UUID FK → items | |
| qty_issued | NUMERIC(18,4) NOT NULL | |
| qty_returned | NUMERIC(18,4) DEFAULT 0 | |
| qty_loss | NUMERIC(18,4) DEFAULT 0 | |
| uom_id | UUID FK → uoms | |
| lot_number | TEXT | |
| issued_at | TIMESTAMPTZ | |

---

## 11. Item Management (Conversion, Loss, Receipts, Issues, Returns)

Handled via `inventory_transactions` (section 9) with `transaction_type` values:

| transaction_type | Description |
|-----------------|-------------|
| `receipt` | Goods received into inventory |
| `issue` | Material issued to production |
| `return` | Material returned from production |
| `conversion` | UOM or item conversion (e.g. bulk → filled units) |
| `loss` | Recorded waste/loss during production |
| `adjustment` | Manual stock adjustment |

---

## 12. Shipping

### `shipments`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| shipment_number | TEXT NOT NULL UNIQUE | |
| sales_order_id | UUID FK → sales_orders | |
| status | TEXT NOT NULL | loading / dispatched / in_transit / delivered |
| carrier | TEXT | |
| tracking_number | TEXT | |
| loaded_at | TIMESTAMPTZ | |
| dispatched_at | TIMESTAMPTZ | |
| delivered_at | TIMESTAMPTZ | |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | |

### `shipment_lines`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| shipment_id | UUID FK → shipments | |
| item_id | UUID FK → items | |
| batch_id | UUID FK → production_batches | |
| qty_shipped | NUMERIC(18,4) NOT NULL | |
| uom_id | UUID FK → uoms | |

### `shipping_documents`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| shipment_id | UUID FK → shipments | |
| doc_type | TEXT | Bill of Lading / Packing List / COA / COO |
| file_url | TEXT | |
| issued_at | TIMESTAMPTZ | |

---

## 13. Invoicing

### `invoices`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| invoice_number | TEXT NOT NULL UNIQUE | |
| customer_id | UUID FK → customers | |
| sales_order_id | UUID FK → sales_orders | |
| shipment_id | UUID FK → shipments | Nullable |
| status | TEXT NOT NULL | draft / sent / partially_paid / paid / overdue / cancelled |
| issue_date | DATE | |
| due_date | DATE | |
| subtotal | NUMERIC(18,4) | |
| tax | NUMERIC(18,4) DEFAULT 0 | |
| total | NUMERIC(18,4) | |
| currency | VARCHAR(3) DEFAULT 'USD' | |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | |

### `invoice_lines`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| invoice_id | UUID FK → invoices | |
| item_id | UUID FK → items | |
| description | TEXT | |
| qty | NUMERIC(18,4) NOT NULL | |
| uom_id | UUID FK → uoms | |
| unit_price | NUMERIC(18,4) NOT NULL | |
| line_total | NUMERIC(18,4) NOT NULL | |

---

## 14. Payment Management

### `payments`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| payment_number | TEXT NOT NULL UNIQUE | |
| payment_type | TEXT NOT NULL | customer / supplier |
| customer_id | UUID FK → customers | Nullable |
| supplier_id | UUID FK → suppliers | Nullable |
| invoice_id | UUID FK → invoices | Nullable (customer payments) |
| purchase_order_id | UUID FK → purchase_orders | Nullable (supplier payments) |
| amount | NUMERIC(18,4) NOT NULL | |
| currency | VARCHAR(3) DEFAULT 'USD' | |
| payment_date | DATE | |
| method | TEXT | Wire / ACH / Check / Credit |
| reference | TEXT | Bank ref / check number |
| status | TEXT | pending / cleared / failed |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | |

---

## 15. Planning

### `production_plans`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| plan_date | DATE NOT NULL | |
| manufacturing_order_id | UUID FK → manufacturing_orders | |
| purchase_order_id | UUID FK → purchase_orders | Nullable |
| planned_qty | NUMERIC(18,4) | |
| notes | TEXT | |
| created_by | UUID FK → users | |
| created_at | TIMESTAMPTZ | |

---

## 16. Users (Auth)

### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | TEXT NOT NULL | |
| email | TEXT NOT NULL UNIQUE | |
| role | TEXT NOT NULL | admin / planner / production / warehouse / finance / viewer |
| is_active | BOOLEAN DEFAULT true | |
| created_at | TIMESTAMPTZ | |

---

## Key Relationships Summary

```
customers ──────────────────────────► sales_orders
countries ──────────────────────────► sales_orders, customers, suppliers
sales_orders ───────────────────────► artworks, fda_registrations, manufacturing_orders
manufacturing_orders ───────────────► purchase_orders, production_batches
items ──────────────────────────────► boms, bom_lines, inventory, sales_order_lines, po_lines
boms ───────────────────────────────► bom_lines, manufacturing_orders, production_batches
purchase_orders ────────────────────► receipts
receipts ───────────────────────────► inventory (via inventory_transactions)
production_batches ─────────────────► batch_component_issues, shipment_lines
shipments ──────────────────────────► shipping_documents, invoices
invoices ───────────────────────────► payments
suppliers ──────────────────────────► purchase_orders, item_supplier, payments
```
