# API Reference — Skyhigh MES/ERP

Base URL: `http://localhost:8080` (dev) / `https://<railway-host>` (prod)

All `/api/v1/*` endpoints require a JWT bearer token delivered as a cookie named `token` or an `Authorization: Bearer <token>` header. Public endpoints are marked **Public**.

---

## Authentication

### `POST /auth/login` — Public

Validates credentials and returns a JWT. Also enforces per-user access windows.

**Request body**
```json
{
  "email":    "user@example.com",
  "password": "plaintext-password"
}
```

**Response `200`**
```json
{
  "token":     "<jwt>",
  "user_id":   "uuid",
  "email":     "user@example.com",
  "full_name": "Samie Saheb",
  "role":      "admin"
}
```

**Error cases**
- `401` — wrong credentials, account inactive, day not in `allowed_days`, or time outside access window

---

### `GET /health` — Public

Returns `ok` (plain text). Used by Railway health checks.

---

## Users

### `GET /api/v1/users/me`

Returns the profile of the currently authenticated user.

**Response `200`**
```json
{
  "id":                "uuid",
  "email":             "user@example.com",
  "full_name":         "Samie Saheb",
  "role":              "admin",
  "is_active":         true,
  "created_at":        "2026-01-01T00:00:00Z",
  "allowed_days":      "Mon,Tue,Wed,Thu,Fri",
  "access_time_start": "08:00:00",
  "access_time_end":   "18:00:00"
}
```

---

### `GET /api/v1/users` — Admin only

Lists all users.

**Response `200`** — array of user objects (same shape as `/me`)

---

### `POST /api/v1/users` — Admin only

Creates a new user.

**Request body**
```json
{
  "email":             "newuser@example.com",
  "password":          "initial-password",
  "full_name":         "New User",
  "role":              "planner",
  "allowed_days":      "Mon,Tue,Wed,Thu,Fri",
  "access_time_start": "08:00",
  "access_time_end":   "18:00"
}
```

`allowed_days` and access time fields are optional. Omit to allow access at any time.

**Response `201`** — created user object

---

### `PUT /api/v1/users/:id` — Admin only

Updates a user. All fields are optional (COALESCE update). Pass `access_time_start: ""` to clear the time window entirely.

**Request body**
```json
{
  "full_name":         "Updated Name",
  "role":              "supervisor",
  "is_active":         true,
  "password":          "new-password",
  "allowed_days":      "Mon,Wed,Fri",
  "access_time_start": "09:00",
  "access_time_end":   "17:00"
}
```

**Response `200`** — updated user object

---

## Dashboard

### `GET /api/v1/dashboard/kpis`

Returns KPI counts and production pipeline fill percentages.

**Response `200`**
```json
{
  "kpis": {
    "open_sales_orders":           5,
    "active_manufacturing_orders": 3,
    "open_purchase_orders":        2,
    "pending_invoices_value":      "12500.00"
  },
  "pipeline": [
    { "stage": "Sales Order",    "count": 5, "fill_pct": 100 },
    { "stage": "Mfg Order",      "count": 3, "fill_pct": 60  },
    { "stage": "Bulk Production","count": 2, "fill_pct": 40  },
    { "stage": "Filling",        "count": 1, "fill_pct": 20  },
    { "stage": "Packing",        "count": 1, "fill_pct": 20  },
    { "stage": "Loading",        "count": 0, "fill_pct": 0   }
  ]
}
```

---

## Master Data

### `GET /api/v1/customer-types`

Returns all customer type records.

**Response `200`** — `[{ "id": "uuid", "name": "Brand Owner", "created_at": "..." }]`

---

### `GET /api/v1/countries`

Returns all countries.

**Response `200`** — `[{ "id": "uuid", "name": "Thailand", "code": "TH", "created_at": "..." }]`

---

### `GET /api/v1/uoms`

Returns all units of measure.

**Response `200`** — `[{ "id": "uuid", "code": "KG", "description": "Kilogram" }]`

---

### `GET /api/v1/customers`

**Response `200`**
```json
[{
  "id":               "uuid",
  "name":             "Acme Cosmetics",
  "customer_type_id": "uuid",
  "country_id":       "uuid",
  "email":            "buyer@acme.com",
  "phone":            "+66 2 000 0000",
  "address":          "Bangkok, Thailand",
  "created_at":       "2026-01-01T00:00:00Z"
}]
```

---

### `POST /api/v1/customers`

**Request body**
```json
{
  "name":             "Acme Cosmetics",
  "customer_type_id": "uuid",
  "country_id":       "uuid",
  "email":            "buyer@acme.com",
  "phone":            "+66 2 000 0000",
  "address":          "Bangkok, Thailand"
}
```

**Response `201`** — created customer object

---

### `PUT /api/v1/customers/:id`

Partial update via COALESCE. Same fields as POST, all optional.

**Response `200`** — updated customer object

---

### `GET /api/v1/items`

**Query parameters**

| Param | Description |
|---|---|
| `item_type` | Filter by `FG`, `RawMat`, or `PackMat` |
| `search` | Case-insensitive ILIKE on `item_code` or `description` |

**Response `200`**
```json
[{
  "id":               "uuid",
  "item_code":        "RM-001",
  "description":      "Shea Butter",
  "item_type":        "RawMat",
  "uom_id":           "uuid",
  "fda_required":     false,
  "is_active":        true,
  "created_at":       "...",
  "reorder_point":    "50.0000",
  "abc_class":        "A",
  "lifecycle_status": "active"
}]
```

---

### `POST /api/v1/items`

**Request body**
```json
{
  "item_code":     "RM-010",
  "description":   "Cetyl Alcohol",
  "item_type":     "RawMat",
  "uom_id":        "uuid",
  "fda_required":  false,
  "reorder_point": "25.0000",
  "abc_class":     "B"
}
```

**Response `201`** — created item object

---

### `PUT /api/v1/items/:id`

Updatable fields: `description`, `fda_required`, `is_active`, `reorder_point`, `abc_class`, `lifecycle_status`.

**Response `200`** — updated item object

---

### `GET /api/v1/items/:item_id/suppliers`

Lists all supplier relationships for an item.

**Response `200`**
```json
[{
  "id":                 "uuid",
  "item_id":            "uuid",
  "supplier_id":        "uuid",
  "supplier_item_code": "SHB-500",
  "lead_time_days":     14,
  "unit_cost":          "85.0000",
  "preferred":          true
}]
```

---

### `POST /api/v1/items/:item_id/suppliers`

**Request body**
```json
{
  "supplier_id":        "uuid",
  "supplier_item_code": "SHB-500",
  "lead_time_days":     14,
  "unit_cost":          "85.0000",
  "preferred":          true
}
```

**Response `201`** — created item-supplier record

---

### `GET /api/v1/items/:item_id/uom-conversions`

**Response `200`** — `[{ "id": "uuid", "item_id": "uuid", "from_uom_id": "uuid", "to_uom_id": "uuid", "conversion_factor": "1000.0000" }]`

---

### `POST /api/v1/items/:item_id/uom-conversions`

**Request body** — `{ "from_uom_id": "uuid", "to_uom_id": "uuid", "conversion_factor": "1000.0000" }`

**Response `201`** — created conversion record

---

### `GET /api/v1/suppliers`

**Response `200`**
```json
[{
  "id":            "uuid",
  "name":          "Thai Chemical Co.",
  "supplier_type": "raw_material",
  "country_id":    "uuid",
  "email":         "sales@tcc.co.th",
  "phone":         "+66 2 111 2222",
  "address":       "Samut Prakan, Thailand",
  "payment_terms": "Net 30",
  "created_at":    "..."
}]
```

---

### `POST /api/v1/suppliers`

**Request body** — same fields as above, `name` and `supplier_type` required.

**Response `201`** — created supplier

---

### `PUT /api/v1/suppliers/:id`

Partial update. All fields optional.

**Response `200`** — updated supplier

---

## Sales Orders

### `GET /api/v1/sales-orders`

**Query parameters**

| Param | Description |
|---|---|
| `status` | `draft`, `confirmed`, `in_production`, `shipped`, `invoiced`, `cancelled` |
| `customer_id` | Filter by customer UUID |

**Response `200`**
```json
[{
  "id":             "uuid",
  "order_number":   "SO-2026-001",
  "customer_id":    "uuid",
  "country_id":     "uuid",
  "status":         "confirmed",
  "artwork_status": "pending",
  "fda_required":   false,
  "fda_status":     null,
  "total_pieces":   "10000.00",
  "order_date":     "2026-01-15",
  "required_date":  "2026-03-01",
  "notes":          null,
  "created_at":     "..."
}]
```

---

### `GET /api/v1/sales-orders/:id`

**Response `200`** — single sales order object. `404` if not found.

---

### `POST /api/v1/sales-orders` — SALES_ROLES

Creates a new sales order. `order_number` is auto-generated (`SO-YYYY-NNNN`).

**Request body**
```json
{
  "customer_id":  "uuid",
  "country_id":   "uuid",
  "fda_required": false,
  "total_pieces": "10000.00",
  "order_date":   "2026-01-15",
  "required_date":"2026-03-01",
  "notes":        "Rush order"
}
```

**Response `201`** — created sales order

---

### `PUT /api/v1/sales-orders/:id` — SALES_ROLES

Updates status and metadata. Status transitions are enforced:

```
draft → confirmed → in_production → shipped → invoiced
      ↘ cancelled  ↘ cancelled     ↘ cancelled
```

**Request body** — all fields optional
```json
{
  "status":         "confirmed",
  "artwork_status": "approved",
  "fda_status":     "pending",
  "total_pieces":   "12000.00",
  "required_date":  "2026-03-15",
  "notes":          "Updated quantity"
}
```

**Error `422`** — if the requested status transition is not allowed.

**Response `200`** — updated sales order

---

### `GET /api/v1/sales-orders/:so_id/lines`

**Response `200`**
```json
[{
  "id":              "uuid",
  "sales_order_id":  "uuid",
  "item_id":         "uuid",
  "qty_ordered":     "5000.0000",
  "uom_id":          "uuid",
  "unit_price":      "4.5000",
  "notes":           null,
  "bom_id":          "uuid"
}]
```

---

### `POST /api/v1/sales-orders/:so_id/lines`

**Request body**
```json
{
  "item_id":     "uuid",
  "qty_ordered": "5000.0000",
  "uom_id":      "uuid",
  "unit_price":  "4.5000",
  "notes":       null,
  "bom_id":      "uuid"
}
```

**Response `201`** — created line

---

### `PUT /api/v1/sales-orders/:so_id/lines/:line_id`

Full replacement of a line. `item_id`, `qty_ordered`, and `uom_id` are required.

**Request body** — same shape as POST

**Response `200`** — updated line

---

### `DELETE /api/v1/sales-orders/:so_id/lines/:line_id`

**Response `204`**

---

## Artwork & FDA

### `GET /api/v1/artworks`

All artworks, newest first.

**Response `200`**
```json
[{
  "id":              "uuid",
  "sales_order_id":  "uuid",
  "item_id":         "uuid",
  "version":         1,
  "status":          "pending",
  "file_url":        "https://...",
  "submitted_at":    null,
  "approved_at":     null,
  "notes":           null,
  "created_at":      "..."
}]
```

---

### `GET /api/v1/sales-orders/:so_id/artworks`

Artworks for a specific sales order, newest version first.

**Response `200`** — array of artwork objects

---

### `POST /api/v1/artworks`

**Request body**
```json
{
  "sales_order_id": "uuid",
  "item_id":        "uuid",
  "version":        1,
  "file_url":       "https://...",
  "notes":          null
}
```

**Response `201`** — created artwork

---

### `PUT /api/v1/artworks/:id`

Update status, file URL, or notes. `submitted_at` is auto-stamped when status becomes `in_review`; `approved_at` when it becomes `approved`.

**Request body**
```json
{
  "status":   "approved",
  "file_url": "https://updated-file",
  "notes":    "Final version approved by client"
}
```

**Response `200`** — updated artwork

---

### `GET /api/v1/fda-registrations`

**Response `200`**
```json
[{
  "id":                  "uuid",
  "sales_order_id":      "uuid",
  "item_id":             "uuid",
  "registration_number": "FDA-TH-2026-001",
  "status":              "approved",
  "submitted_at":        "...",
  "approved_at":         "...",
  "expiry_date":         "2028-01-01",
  "notes":               null,
  "created_at":          "..."
}]
```

---

### `POST /api/v1/fda-registrations`

**Request body** — `{ "sales_order_id": "uuid", "item_id": "uuid", "notes": null }`

**Response `201`** — created registration

---

### `PUT /api/v1/fda-registrations/:id`

**Request body** — `{ "status": "approved", "registration_number": "FDA-TH-2026-001", "expiry_date": "2028-01-01", "notes": null }`

`submitted_at` auto-stamped when status → `submitted`; `approved_at` when → `approved`.

**Response `200`** — updated registration

---

### `GET /api/v1/fda-registrations/:reg_id/documents`

**Response `200`** — `[{ "id": "uuid", "fda_registration_id": "uuid", "doc_type": "certificate", "file_url": "https://...", "uploaded_at": "..." }]`

---

### `POST /api/v1/fda-registrations/:reg_id/documents`

**Request body** — `{ "fda_registration_id": "uuid", "doc_type": "certificate", "file_url": "https://..." }`

**Response `201`** — created document record

---

## Formulations

### `GET /api/v1/formulations`

Returns all formulations with embedded product detail and ingredient lines.

**Response `200`**
```json
[{
  "id":             "uuid",
  "product":        "uuid",
  "product_detail": {
    "id":        "uuid",
    "sku":       "FG-001",
    "name":      "Moisturising Cream 50ml",
    "item_type": "FG"
  },
  "version":    1,
  "is_active":  true,
  "note":       "Version approved by Khun Tik",
  "batch_qty":  "100.0000",
  "batch_unit": "g",
  "lines": [{
    "id":         "uuid",
    "ingredient": "uuid",
    "ingredient_detail": {
      "id":       "uuid",
      "code":     "SHBUT",
      "inci_name":"Butyrospermum Parkii Butter"
    },
    "percentage": "5.0000",
    "phase":      "A",
    "comment":    "Melt before adding"
  }]
}]
```

---

### `GET /api/v1/formulations/:id`

Single formulation with full lines. `404` if not found.

---

### `POST /api/v1/formulations`

Creates formulation header plus all lines in a single request.

**Request body**
```json
{
  "product":    "uuid",
  "version":    1,
  "is_active":  true,
  "note":       "Initial version",
  "batch_qty":  "100.0000",
  "batch_unit": "g",
  "lines": [{
    "ingredient": "uuid",
    "percentage": "5.0000",
    "phase":      "A",
    "comment":    "Melt separately"
  }]
}
```

`batch_qty` defaults to `100` and `batch_unit` defaults to `g` if omitted.

**Response `201`** — full formulation with lines

---

### `PATCH /api/v1/formulations/:id`

Updates formulation header fields and optionally replaces all lines (destructive line replacement — old lines are deleted and new ones inserted).

**Request body** — all fields optional
```json
{
  "is_active":  false,
  "note":       "Superseded by v2",
  "batch_qty":  "500.0000",
  "batch_unit": "g",
  "lines": [...]
}
```

**Response `200`** — full updated formulation

---

### `DELETE /api/v1/formulations/:id`

Deletes formulation and cascades to lines.

**Response `204`**

---

### `GET /api/v1/ingredients`

Active ingredients only, ordered by code.

**Response `200`** — `[{ "id": "uuid", "code": "SHBUT", "inci_name": "Butyrospermum Parkii Butter", "is_active": true }]`

---

### `POST /api/v1/ingredients`

**Request body** — `{ "code": "SHBUT", "inci_name": "Butyrospermum Parkii Butter" }`

**Response `201`** — created ingredient

---

### `GET /api/v1/products`

Active items formatted for the formulation UI (`sku` instead of `item_code`, `name` instead of `description`).

**Response `200`** — `[{ "id": "uuid", "sku": "FG-001", "name": "Moisturising Cream 50ml", "item_type": "FG" }]`

---

## Bill of Materials

### `GET /api/v1/boms`

All BOMs, newest version first.

**Response `200`**
```json
[{
  "id":               "uuid",
  "finished_good_id": "uuid",
  "description":      "Standard production formula",
  "version":          1,
  "is_active":        true,
  "created_at":       "..."
}]
```

---

### `GET /api/v1/boms/:id`

Single BOM header. `404` if not found.

---

### `POST /api/v1/boms`

**Request body**
```json
{
  "finished_good_id": "uuid",
  "description":      "Standard production formula",
  "version":          1
}
```

`is_active` is always set to `true` on creation.

**Response `201`** — created BOM

---

### `DELETE /api/v1/boms/:id`

Fails with `400` if the BOM is referenced by any manufacturing order or production batch.

**Response `204`**

---

### `GET /api/v1/boms/:id/lines`

**Response `200`**
```json
[{
  "id":                "uuid",
  "bom_id":            "uuid",
  "component_item_id": "uuid",
  "qty_required":      "5.0000",
  "uom_id":            "uuid",
  "notes":             null
}]
```

---

### `POST /api/v1/boms/:id/lines`

**Request body**
```json
{
  "component_item_id": "uuid",
  "qty_required":      "5.0000",
  "uom_id":            "uuid",
  "notes":             null
}
```

**Response `201`** — created BOM line

---

### `GET /api/v1/boms/:id/explode`

Multi-level BOM explosion. Recursively expands sub-BOMs (cycle detection included). Returns required quantities, current inventory, and calculated shortfalls.

**Query parameters**

| Param | Description | Default |
|---|---|---|
| `target_qty` | Production quantity to calculate for | `1` |

**Response `200`**
```json
{
  "bom_id":     "uuid",
  "fg_item_id": "uuid",
  "target_qty": "100.0000",
  "lines": [{
    "item_id":      "uuid",
    "item_code":    "RM-001",
    "description":  "Shea Butter",
    "required_qty": "5.0000",
    "uom":          "KG",
    "on_hand":      "20.0000",
    "available":    "20.0000",
    "shortfall":    "0.0000"
  }]
}
```

---

## Procurement

### `GET /api/v1/purchase-orders`

**Query parameters** — `status`: `draft`, `sent`, `confirmed`, `partially_received`, `received`, `cancelled`

**Response `200`**
```json
[{
  "id":                    "uuid",
  "po_number":             "PO-2026-001",
  "supplier_id":           "uuid",
  "manufacturing_order_id":"uuid",
  "status":                "confirmed",
  "order_date":            "2026-01-10",
  "expected_date":         "2026-01-24",
  "notes":                 null,
  "created_at":            "..."
}]
```

---

### `GET /api/v1/purchase-orders/:id`

Single purchase order. `404` if not found.

---

### `POST /api/v1/purchase-orders` — PURCHASING_ROLES

`po_number` is auto-generated (`PO-YYYY-NNNN`). Lines are created in the same request.

**Request body**
```json
{
  "supplier_id":            "uuid",
  "manufacturing_order_id": "uuid",
  "order_date":             "2026-01-10",
  "expected_date":          "2026-01-24",
  "notes":                  null,
  "lines": [{
    "item_id":     "uuid",
    "qty_ordered": "50.0000",
    "uom_id":      "uuid",
    "unit_cost":   "85.0000"
  }]
}
```

**Response `201`** — created purchase order header (lines fetched separately)

---

### `PUT /api/v1/purchase-orders/:id` — PURCHASING_ROLES

Status transitions enforced:

```
draft → sent → confirmed → partially_received → received
      ↘       ↘ cancelled  ↘ cancelled           (terminal)
```

**Request body** — `{ "status": "sent", "expected_date": "2026-01-31", "notes": null }`

**Error `422`** — invalid status transition

**Response `200`** — updated purchase order

---

### `GET /api/v1/purchase-orders/:id/lines`

**Response `200`**
```json
[{
  "id":                "uuid",
  "purchase_order_id": "uuid",
  "item_id":           "uuid",
  "qty_ordered":       "50.0000",
  "qty_received":      "0.0000",
  "uom_id":            "uuid",
  "unit_cost":         "85.0000"
}]
```

---

### `POST /api/v1/purchase-orders/:id/lines`

Adds a line to an existing PO.

**Request body** — `{ "item_id": "uuid", "qty_ordered": "50.0000", "uom_id": "uuid", "unit_cost": "85.0000" }`

**Response `201`** — created line

---

### `GET /api/v1/receipts`

All goods receipts, newest first.

**Response `200`**
```json
[{
  "id":                "uuid",
  "receipt_number":    "REC-2026-0001",
  "purchase_order_id": "uuid",
  "received_by":       "uuid",
  "received_at":       "2026-01-24T10:30:00Z",
  "notes":             null
}]
```

---

### `POST /api/v1/receipts` — WAREHOUSE_ROLES

Creates a receipt and its lines in one request. Side effects:
1. Updates `qty_received` on each PO line
2. Upserts `inventory` balance (adds `qty_received`)
3. Inserts an `inventory_transactions` record (`type = receipt`)
4. Auto-advances PO status to `partially_received` or `received`

`receipt_number` is auto-generated (`REC-YYYY-NNNN`).

**Request body**
```json
{
  "purchase_order_id": "uuid",
  "notes": null,
  "lines": [{
    "po_line_id":   "uuid",
    "item_id":      "uuid",
    "qty_received": "50.0000",
    "uom_id":       "uuid",
    "lot_number":   "LOT-2026-001",
    "expiry_date":  "2027-01-01"
  }]
}
```

**Response `201`** — created receipt header

---

### `GET /api/v1/receipts/:receipt_id/lines`

**Response `200`**
```json
[{
  "id":           "uuid",
  "receipt_id":   "uuid",
  "po_line_id":   "uuid",
  "item_id":      "uuid",
  "qty_received": "50.0000",
  "uom_id":       "uuid",
  "lot_number":   "LOT-2026-001",
  "expiry_date":  "2027-01-01",
  "qc_status":    "pending"
}]
```

---

### `PUT /api/v1/receipts/:receipt_id/lines/:line_id` — WAREHOUSE_ROLES

Updates QC status and expiry date on a receipt line.

**Request body** — `{ "qc_status": "passed", "expiry_date": "2027-01-01" }`

**Response `200`** — updated line

---

## Inventory

### `GET /api/v1/inventory`

Returns all inventory balances joined with item detail. Calculates ATP (available-to-promise = `qty_available − qty_reserved`) and sets `reorder_alert = true` if ATP < `reorder_point`.

**Response `200`**
```json
[{
  "id":              "uuid",
  "item_id":         "uuid",
  "item_code":       "RM-001",
  "description":     "Shea Butter",
  "location":        "RM-STORE",
  "lot_number":      "LOT-2026-001",
  "qty_available":   "20.0000",
  "qty_reserved":    "0.0000",
  "uom_id":          "uuid",
  "last_updated":    "...",
  "last_counted_at": null,
  "reorder_point":   "5.0000",
  "reorder_alert":   false
}]
```

---

### `POST /api/v1/inventory/transact`

General-purpose inventory adjustment. Transaction type determines sign of delta:

| `transaction_type` | Effect on balance |
|---|---|
| `receipt` | +qty |
| `return` | +qty |
| `issue` | −qty |
| `loss` | −qty |
| `conversion` | −qty |
| `adjustment` | qty is signed (+/−) |

Balance never goes below 0 (`GREATEST(0, ...)`).

**Request body**
```json
{
  "item_id":          "uuid",
  "transaction_type": "adjustment",
  "qty":              "-5.0000",
  "uom_id":           "uuid",
  "lot_number":       "LOT-2026-001",
  "location":         "RM-STORE",
  "notes":            "Write-off for spillage",
  "reference_type":   "manual",
  "reference_id":     null
}
```

**Response `201`** — created inventory transaction record

---

### `GET /api/v1/inventory/transactions`

Returns the 200 most recent inventory transactions.

**Response `200`**
```json
[{
  "id":               "uuid",
  "item_id":          "uuid",
  "transaction_type": "receipt",
  "reference_type":   "receipt",
  "reference_id":     "uuid",
  "qty":              "50.0000",
  "uom_id":           "uuid",
  "lot_number":       "LOT-2026-001",
  "notes":            null,
  "created_by":       null,
  "created_at":       "..."
}]
```

---

### `POST /api/v1/inventory/:item_id/cycle-count`

Records a physical count. Computes the delta vs. current balance, updates `qty_available` and `last_counted_at`, and inserts an `adjustment` transaction for the delta.

**Request body** — `{ "counted_qty": "18.0000", "notes": "Physical count Jan 2026" }`

**Response `200`** — the adjustment `InventoryTransaction` record

---

## Warehouse Locations

### `GET /api/v1/locations`

Ordered by `travel_sequence` (NULLs last), then `code`.

**Response `200`**
```json
[{
  "id":               "uuid",
  "code":             "RM-STORE",
  "zone":             "A",
  "aisle":            "1",
  "section":          null,
  "shelf_level":      null,
  "travel_sequence":  1,
  "location_type":    "bin",
  "is_active":        true,
  "is_virtual":       false,
  "notes":            null,
  "created_at":       "..."
}]
```

---

### `POST /api/v1/locations`

**Request body**
```json
{
  "code":             "RACK-A1",
  "zone":             "A",
  "aisle":            "1",
  "section":          "B",
  "shelf_level":      "2",
  "travel_sequence":  10,
  "location_type":    "rack",
  "is_virtual":       false,
  "notes":            null
}
```

`location_type` defaults to `bin`. `is_virtual` defaults to `false`. Allowed `location_type` values: `rack`, `bin`, `virtual`, `dock`.

**Response `201`** — created location

---

### `PUT /api/v1/locations/:id`

Partial update. All fields optional.

**Response `200`** — updated location

---

## Manufacturing Orders

### `GET /api/v1/manufacturing-orders`

**Query parameters** — `status`: `draft`, `planned`, `in_progress`, `completed`, `cancelled`

**Response `200`**
```json
[{
  "id":              "uuid",
  "mo_number":       "MO-2026-0001",
  "sales_order_id":  "uuid",
  "item_id":         "uuid",
  "bom_id":          "uuid",
  "status":          "planned",
  "qty_planned":     "10000.0000",
  "qty_produced":    "0.0000",
  "uom_id":          "uuid",
  "planned_start":   "2026-02-01",
  "planned_end":     "2026-02-15",
  "actual_start":    null,
  "actual_end":      null,
  "notes":           null,
  "created_at":      "..."
}]
```

---

### `GET /api/v1/manufacturing-orders/:id`

Single MO. `404` if not found.

---

### `POST /api/v1/manufacturing-orders` — ADMIN, PLANNER

`mo_number` is auto-generated (`MO-YYYY-NNNN`).

**Request body**
```json
{
  "sales_order_id": "uuid",
  "item_id":        "uuid",
  "bom_id":         "uuid",
  "qty_planned":    "10000.0000",
  "uom_id":         "uuid",
  "planned_start":  "2026-02-01",
  "planned_end":    "2026-02-15",
  "notes":          null
}
```

**Response `201`** — created MO

---

### `PUT /api/v1/manufacturing-orders/:id` — ADMIN, PLANNER, SUPERVISOR

Status transitions enforced:
```
draft → planned → in_progress → completed
      ↘ cancelled ↘ cancelled   ↘ cancelled
```

`actual_start` is auto-stamped when status → `in_progress`. `actual_end` when → `completed`.

**Request body** — all optional
```json
{
  "status":       "in_progress",
  "qty_produced": "5000.0000",
  "actual_start": null,
  "actual_end":   null,
  "notes":        null
}
```

**Response `200`** — updated MO

---

### `GET /api/v1/manufacturing-orders/:mo_id/batches`

Production batches for a specific MO.

**Response `200`** — array of production batch objects

---

### `POST /api/v1/manufacturing-orders/:mo_id/batches` — ADMIN, PLANNER, SUPERVISOR

Creates a new production batch under this MO. `batch_number` is auto-generated (`BATCH-<MO number>-<seq>`). `bom_id` and `uom_id` are inherited from the MO.

**Request body** — none required

**Response `201`** — created batch

---

## Production Batches

### `GET /api/v1/production/batches`

Returns all batches where `status != 'completed'` (active batches only). For all batches including completed, use `/manufacturing-orders/:id/batches`.

**Response `200`**
```json
[{
  "id":                    "uuid",
  "batch_number":          "BATCH-2026-001",
  "manufacturing_order_id":"uuid",
  "bom_id":                "uuid",
  "status":                "bulk_production",
  "qty_bulk_produced":     "98.5000",
  "qty_filled":            null,
  "qty_packed":            null,
  "uom_id":                "uuid",
  "bulk_start":            "2026-02-02T08:00:00Z",
  "bulk_end":              null,
  "fill_start":            null,
  "fill_end":              null,
  "pack_start":            null,
  "pack_end":              null,
  "notes":                 null,
  "created_at":            "..."
}]
```

---

### `PUT /api/v1/production/batches/:id` — PRODUCTION_ROLES

Status transitions enforced:
```
planned → bulk_production → filling → packing → completed
```

Stage timestamps are auto-stamped:
- `bulk_start` when → `bulk_production`
- `bulk_end`, `fill_start` when → `filling`
- `fill_end`, `pack_start` when → `packing`
- `pack_end` when → `completed`

**Request body** — all optional
```json
{
  "status":           "filling",
  "qty_bulk_produced":"98.5000",
  "qty_filled":       null,
  "qty_packed":       null,
  "notes":            null
}
```

**Response `200`** — updated batch

---

### `GET /api/v1/production/batches/:batch_id/issues`

Component issues (materials drawn) for a batch.

**Response `200`**
```json
[{
  "id":           "uuid",
  "batch_id":     "uuid",
  "item_id":      "uuid",
  "qty_issued":   "5.0000",
  "qty_returned": "0.0000",
  "qty_loss":     "0.0000",
  "uom_id":       "uuid",
  "lot_number":   "LOT-2026-001",
  "issued_at":    "..."
}]
```

---

### `POST /api/v1/production/batches/:batch_id/issues`

Issues material to a batch. Side effect: decrements `inventory.qty_available` by `qty_issued`.

**Request body**
```json
{
  "item_id":    "uuid",
  "qty_issued": "5.0000",
  "uom_id":     "uuid",
  "lot_number": "LOT-2026-001"
}
```

**Response `201`** — created issue record

---

### `GET /api/v1/production/plans`

**Response `200`**
```json
[{
  "id":                    "uuid",
  "plan_date":             "2026-02-01",
  "manufacturing_order_id":"uuid",
  "purchase_order_id":     "uuid",
  "planned_qty":           "10000.0000",
  "notes":                 null,
  "created_by":            "uuid",
  "created_at":            "..."
}]
```

---

### `POST /api/v1/production/plans`

**Request body**
```json
{
  "plan_date":             "2026-02-01",
  "manufacturing_order_id":"uuid",
  "purchase_order_id":     "uuid",
  "planned_qty":           "10000.0000",
  "notes":                 null
}
```

**Response `201`** — created plan

---

## Shop Floor

### `GET /api/v1/work-centers`

**Response `200`**
```json
[{
  "id":          "uuid",
  "code":        "WC-01",
  "name":        "Mixing Room",
  "center_type": "mixing",
  "capacity":    "500.0000",
  "status":      "active",
  "notes":       null,
  "created_at":  "..."
}]
```

---

### `POST /api/v1/work-centers` — ADMIN, PLANNER

**Request body** — `{ "code": "WC-02", "name": "Filling Line", "center_type": "filling", "capacity": "1000.0000", "notes": null }`

**Response `201`** — created work centre

---

### `PUT /api/v1/work-centers/:id` — ADMIN, PLANNER

Updatable: `name`, `center_type`, `capacity`, `status`, `notes`.

**Response `200`** — updated work centre

---

### `GET /api/v1/boms/:bom_id/routing`

Routing steps for a BOM, ordered by `step_number`.

**Response `200`**
```json
[{
  "id":             "uuid",
  "bom_id":         "uuid",
  "step_number":    1,
  "name":           "Mix phases A+B",
  "work_center_id": "uuid",
  "std_time_min":   60,
  "instructions":   "Heat to 75°C and homogenise for 30 min"
}]
```

---

### `POST /api/v1/boms/:bom_id/routing` — ADMIN, PLANNER

**Request body**
```json
{
  "step_number":    1,
  "name":           "Mix phases A+B",
  "work_center_id": "uuid",
  "std_time_min":   60,
  "instructions":   "Heat to 75°C"
}
```

**Response `201`** — created routing step

---

### `DELETE /api/v1/boms/:bom_id/routing/:step_id` — ADMIN, PLANNER

**Response `204`**

---

### `GET /api/v1/production/batches/:batch_id/qc-tests`

QC tests for a batch, newest first.

**Response `200`**
```json
[{
  "id":           "uuid",
  "batch_id":     "uuid",
  "test_type":    "viscosity",
  "result_value": "15000",
  "min_spec":     "12000",
  "max_spec":     "18000",
  "pass_fail":    "pass",
  "tested_by":    "uuid",
  "tested_at":    "...",
  "notes":        null
}]
```

---

### `POST /api/v1/production/batches/:batch_id/qc-tests` — PRODUCTION_ROLES

`tested_by` is auto-set from the JWT claims. `pass_fail` defaults to `pending`.

**Request body**
```json
{
  "test_type":    "viscosity",
  "result_value": "15000",
  "min_spec":     "12000",
  "max_spec":     "18000",
  "pass_fail":    "pass",
  "notes":        null
}
```

**Response `201`** — created QC test

---

### `PUT /api/v1/production/batches/:batch_id/qc-tests/:test_id` — PRODUCTION_ROLES

Updatable: `result_value`, `pass_fail`, `notes`.

**Response `200`** — updated QC test

---

### `GET /api/v1/production/batches/:batch_id/downtime`

Downtime events for a batch, most recent first.

**Response `200`**
```json
[{
  "id":             "uuid",
  "batch_id":       "uuid",
  "work_center_id": "uuid",
  "reason_code":    "MECH",
  "description":    "Pump failure on line 2",
  "start_time":     "2026-02-02T10:00:00Z",
  "end_time":       null,
  "reported_by":    "uuid",
  "created_at":     "..."
}]
```

---

### `POST /api/v1/production/batches/:batch_id/downtime` — PRODUCTION_ROLES

`reported_by` is auto-set from JWT claims. `start_time` defaults to `NOW()` if not provided.

**Request body**
```json
{
  "work_center_id": "uuid",
  "reason_code":    "MECH",
  "description":    "Pump failure",
  "start_time":     "2026-02-02T10:00:00Z"
}
```

**Response `201`** — created downtime event

---

### `PUT /api/v1/production/batches/:batch_id/downtime/:event_id` — PRODUCTION_ROLES

Close an open downtime event by setting `end_time`.

**Request body** — `{ "end_time": "2026-02-02T11:30:00Z", "description": "Pump replaced" }`

**Response `200`** — updated downtime event

---

## Shipments

### `GET /api/v1/shipments`

**Response `200`**
```json
[{
  "id":               "uuid",
  "shipment_number":  "SHP-2026-0001",
  "sales_order_id":   "uuid",
  "status":           "in_transit",
  "carrier":          "DHL",
  "tracking_number":  "1234567890",
  "loaded_at":        "...",
  "dispatched_at":    "...",
  "delivered_at":     null,
  "notes":            null,
  "created_at":       "..."
}]
```

---

### `GET /api/v1/shipments/:id`

Single shipment. `404` if not found.

---

### `POST /api/v1/shipments` — WAREHOUSE_ROLES

`shipment_number` is auto-generated (`SHP-YYYY-NNNN`).

**Request body**
```json
{
  "sales_order_id":  "uuid",
  "carrier":         "DHL",
  "tracking_number": "1234567890",
  "notes":           null
}
```

**Response `201`** — created shipment

---

### `PUT /api/v1/shipments/:id` — WAREHOUSE_ROLES

Status transitions enforced:
```
loading → dispatched → in_transit → delivered
```

Timestamps auto-stamped: `loaded_at` + `dispatched_at` when → `dispatched`; `delivered_at` when → `delivered`.

**Request body** — `{ "status": "in_transit", "carrier": "FedEx", "tracking_number": "9876543210", "notes": null }`

**Response `200`** — updated shipment

---

### `GET /api/v1/shipments/:shipment_id/lines`

**Response `200`** — `[{ "id": "uuid", "shipment_id": "uuid", "item_id": "uuid", "batch_id": "uuid", "qty_shipped": "10000.0000", "uom_id": "uuid" }]`

---

### `POST /api/v1/shipments/:shipment_id/lines`

**Request body** — `{ "item_id": "uuid", "batch_id": "uuid", "qty_shipped": "10000.0000", "uom_id": "uuid" }`

**Response `201`** — created line

---

### `GET /api/v1/shipments/:shipment_id/documents`

Shipping documents (packing list, COA, etc.) for a shipment.

**Response `200`** — `[{ "id": "uuid", "shipment_id": "uuid", "doc_type": "packing_list", "file_url": "https://...", "issued_at": "..." }]`

---

### `POST /api/v1/shipments/:shipment_id/documents`

**Request body** — `{ "shipment_id": "uuid", "doc_type": "packing_list", "file_url": "https://..." }`

**Response `201`** — created document record

---

## Finance

### `GET /api/v1/invoices`

**Query parameters** — `status`: `draft`, `sent`, `partially_paid`, `paid`, `overdue`, `cancelled`

**Response `200`**
```json
[{
  "id":               "uuid",
  "invoice_number":   "INV-2026-0001",
  "sales_order_id":   "uuid",
  "customer_id":      "uuid",
  "shipment_id":      "uuid",
  "status":           "sent",
  "issue_date":       "2026-03-01",
  "due_date":         "2026-03-31",
  "subtotal":         "45000.00",
  "tax":              "3150.00",
  "total":            "48150.00",
  "currency":         "USD",
  "notes":            null,
  "created_at":       "..."
}]
```

---

### `GET /api/v1/invoices/:id`

Single invoice. `404` if not found.

---

### `POST /api/v1/invoices` — FINANCE_ROLES

`invoice_number` is auto-generated (`INV-YYYY-NNNN`). `subtotal` and `total` are computed from invoice lines; they start at 0. `tax` defaults to `0`; `currency` defaults to `USD`.

**Request body**
```json
{
  "sales_order_id": "uuid",
  "customer_id":    "uuid",
  "shipment_id":    "uuid",
  "issue_date":     "2026-03-01",
  "due_date":       "2026-03-31",
  "tax":            "3150.00",
  "currency":       "USD",
  "notes":          null
}
```

**Response `201`** — created invoice

---

### `PUT /api/v1/invoices/:id` — FINANCE_ROLES

Status transitions enforced:
```
draft → sent → partially_paid → paid
             ↘ overdue        ↘ (terminal)
             ↘ cancelled
```

`total` is recalculated as `subtotal + tax` on every update.

**Request body** — all optional
```json
{
  "status":     "sent",
  "issue_date": "2026-03-01",
  "due_date":   "2026-03-31",
  "tax":        "3150.00",
  "notes":      null
}
```

**Response `200`** — updated invoice

---

### `GET /api/v1/invoices/:invoice_id/lines`

**Response `200`** — `[{ "id": "uuid", "invoice_id": "uuid", "item_id": "uuid", "description": "Moisturising Cream 50ml", "qty": "10000.0000", "uom_id": "uuid", "unit_price": "4.5000", "line_total": "45000.00" }]`

---

### `POST /api/v1/invoices/:invoice_id/lines`

Side effect: recalculates `invoices.subtotal` and `invoices.total` after insert.

**Request body**
```json
{
  "item_id":     "uuid",
  "description": "Moisturising Cream 50ml",
  "qty":         "10000.0000",
  "uom_id":      "uuid",
  "unit_price":  "4.5000"
}
```

`line_total` is computed as `qty × unit_price`.

**Response `201`** — created line

---

### `GET /api/v1/payments`

**Response `200`**
```json
[{
  "id":                 "uuid",
  "payment_number":     "PAY-2026-0001",
  "payment_type":       "customer",
  "customer_id":        "uuid",
  "supplier_id":        null,
  "invoice_id":         "uuid",
  "purchase_order_id":  null,
  "amount":             "48150.00",
  "currency":           "USD",
  "payment_date":       "2026-03-20",
  "method":             "wire",
  "reference":          "TRF-2026-001",
  "status":             "cleared",
  "notes":              null,
  "created_at":         "..."
}]
```

---

### `POST /api/v1/payments` — FINANCE_ROLES

`payment_number` is auto-generated (`PAY-YYYY-NNNN`). `currency` defaults to `USD`. If `invoice_id` is set, the linked invoice's status is recalculated automatically (`partially_paid` / `paid`).

**Request body**
```json
{
  "payment_type":      "customer",
  "customer_id":       "uuid",
  "supplier_id":       null,
  "invoice_id":        "uuid",
  "purchase_order_id": null,
  "amount":            "48150.00",
  "currency":          "USD",
  "payment_date":      "2026-03-20",
  "method":            "wire",
  "reference":         "TRF-2026-001",
  "notes":             null
}
```

**Response `201`** — created payment

---

## Access Requests

### `GET /api/v1/access-requests`

Admins see all requests. Other roles see only their own.

**Response `200`**
```json
[{
  "id":          "uuid",
  "user_id":     "uuid",
  "permission":  "approve_artwork",
  "reason":      "Need to approve client artwork",
  "status":      "pending",
  "reviewed_by": null,
  "reviewed_at": null,
  "created_at":  "..."
}]
```

---

### `POST /api/v1/access-requests`

Any authenticated user can submit a request. `user_id` is set from JWT claims.

**Request body** — `{ "permission": "approve_artwork", "reason": "Need to approve client artwork" }`

**Response `201`** — created access request

---

### `PUT /api/v1/access-requests/:id` — Admin only

Review (approve or reject) a request. `reviewed_by` and `reviewed_at` are auto-set.

**Request body** — `{ "status": "approved" }`

**Response `200`** — updated access request

---

## Global Search

### `GET /api/v1/search`

Cross-entity search (case-insensitive, substring match) across sales orders, purchase orders, manufacturing orders, production batches, invoices, shipments, receipts, items, customers, and suppliers.

**Query parameters** — `q`: search string (required, must be non-empty)

**Response `200`**
```json
[{
  "entity_type": "sales_order",
  "id":          "uuid",
  "label":       "SO-2026-001",
  "sublabel":    "confirmed"
}]
```

Returns at most 5 results per entity type, 50 total. Returns `[]` if `q` is empty.

---

## Audit Log

### `GET /api/v1/audit-logs` — Admin only

Paginated audit trail. Joins user table to include `changed_by_name`.

**Query parameters**

| Param | Description |
|---|---|
| `table_name` | Filter by database table (e.g. `sales_orders`) |
| `record_id` | Filter by record UUID (as text) |
| `action` | `INSERT`, `UPDATE`, or `DELETE` |
| `limit` | Max records to return (default 200, max 1000) |
| `offset` | Pagination offset (default 0) |

**Response `200`**
```json
[{
  "id":               "uuid",
  "table_name":       "sales_orders",
  "record_id":        "uuid",
  "action":           "UPDATE",
  "old_data":         { "status": "confirmed" },
  "new_data":         { "status": "in_production" },
  "changed_by":       "uuid",
  "changed_by_name":  "Samie Saheb",
  "changed_at":       "2026-02-01T09:15:00Z"
}]
```

---

## Error Responses

All errors return JSON with a single `error` key:

```json
{ "error": "Sales order SO-2026-001 not found" }
```

| Status | `AppError` variant | When |
|---|---|---|
| `400` | `BadRequest` | Invalid input that can't be represented as `422` |
| `401` | `Unauthorized` | Missing/invalid token, wrong credentials, access window violation |
| `403` | `Forbidden` | Valid token but insufficient role |
| `404` | `NotFound` | Record does not exist |
| `409` | `Conflict` | Unique constraint violation (e.g. duplicate `item_code`) |
| `422` | `Unprocessable` | Invalid status transition |
| `500` | `Internal` | Unexpected server error |

---

## Role Permission Summary

| Endpoint group | Minimum role |
|---|---|
| `POST /auth/login`, `GET /health` | Public |
| `GET /api/v1/users/me` | Any authenticated |
| `GET|POST|PUT /api/v1/users` | `admin` |
| `GET /api/v1/audit-logs` | `admin` |
| `PUT /api/v1/access-requests/:id` | `admin` |
| `POST /api/v1/sales-orders`, `PUT /api/v1/sales-orders/:id` | `admin`, `planner`, `sales` |
| `POST /api/v1/manufacturing-orders` | `admin`, `planner` |
| `PUT /api/v1/manufacturing-orders/:id`, batch create | `admin`, `planner`, `supervisor` |
| `PUT /api/v1/production/batches/:id`, QC, downtime, issues | `admin`, `planner`, `supervisor`, `qc`, `subcontractor` |
| `POST /api/v1/purchase-orders`, `PUT /api/v1/purchase-orders/:id` | `admin`, `planner`, `purchasing` |
| `POST /api/v1/receipts`, `PUT receipt lines` | `admin`, `planner`, `supervisor`, `warehouse`, `purchasing` |
| `POST /api/v1/shipments`, `PUT /api/v1/shipments/:id` | `admin`, `planner`, `supervisor`, `warehouse` |
| `POST|PUT /api/v1/invoices`, `POST /api/v1/payments` | `admin`, `sales` |
| `POST|PUT /api/v1/work-centers`, routing steps | `admin`, `planner` |
| All read endpoints not listed above | Any authenticated |
