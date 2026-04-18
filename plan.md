# SkyHigh MES — Implementation Plan

Based on `database_schema.md` and current codebase state.

---

## Current State

### Database (3 migrations applied)
| Table | Status | Notes |
|-------|--------|-------|
| customer_types | ✅ Done | |
| countries | ✅ Done | |
| customers | ✅ Done | |
| uoms | ✅ Done | |
| items | ✅ Done | |
| uom_conversions | ✅ Done | |
| suppliers | ✅ Done | |
| item_suppliers | ✅ Done | |
| users | ✅ Done | Missing `role` and `name` columns |
| sales_orders | ✅ Done | Missing `order_date`, `required_date`, `notes` |
| sales_order_lines | ❌ Missing | SO is flat (total_pieces only), no line items |
| artwork_docs | ⚠️ Partial | No version, approval workflow, or submitter |
| fda_registrations | ❌ Missing | FDA is only a flag on sales_orders |
| fda_documents | ❌ Missing | |
| boms | ✅ Done | |
| bom_lines | ✅ Done | |
| purchase_orders | ✅ Done | Missing link to `manufacturing_orders` |
| po_lines | ✅ Done | |
| grn / grn_lines | ✅ Done | Equivalent to receipts/receipt_lines |
| inventory | ✅ Done | |
| inventory_txns | ✅ Done | |
| manufacturing_orders | ✅ Done | Missing `planned_start/end`, `actual_start/end`, `qty_produced` |
| production_batches | ⚠️ Partial | Missing per-stage qty and timestamps |
| item_management_txns | ✅ Done | Covers batch component issues |
| production_plans | ❌ Missing | |
| shipments | ❌ Missing | |
| shipment_lines | ❌ Missing | |
| shipping_documents | ❌ Missing | |
| invoices | ⚠️ Partial | Flat amount — no line breakdown, no shipment link |
| invoice_lines | ❌ Missing | |
| payments | ⚠️ Partial | Customer only — no supplier payments, no method/status/currency |

### API (27 endpoints across 10 handlers)
All core CRUD is implemented. Missing endpoints map to missing tables above.

### Frontend (Next.js)
All main module pages exist (Sales Orders, MOs, POs, Inventory, BOM, Invoicing, Receiving, Production, Suppliers, Items, Artwork). No Shipments or FDA management pages.

---

## Phases

---

### Phase 1 — Fill Schema Gaps (Database + API)
*Complete the data model before building new frontend features.*

#### 1.1 — Users: Add role & name
```sql
ALTER TABLE users ADD COLUMN name TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'viewer';
-- roles: admin / planner / production / warehouse / finance / viewer
```
- Update auth handler to include `role` in JWT claims
- Update login response to return `name` and `role`

#### 1.2 — Sales Order Lines
```sql
CREATE TABLE sales_order_lines (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sales_order_id  UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    item_id         UUID NOT NULL REFERENCES items(id),
    qty_ordered     NUMERIC(20,4) NOT NULL,
    uom_id          UUID NOT NULL REFERENCES uoms(id),
    unit_price      NUMERIC(20,4),
    notes           TEXT
);
ALTER TABLE sales_orders ADD COLUMN order_date    DATE;
ALTER TABLE sales_orders ADD COLUMN required_date DATE;
ALTER TABLE sales_orders ADD COLUMN notes         TEXT;
```
- Add `GET /api/v1/sales-orders/:id/lines` and `POST` endpoints
- Update SO detail page to show line items

#### 1.3 — FDA Registrations & Documents
```sql
CREATE TABLE fda_registrations (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sales_order_id      UUID NOT NULL REFERENCES sales_orders(id),
    item_id             UUID NOT NULL REFERENCES items(id),
    registration_number TEXT,
    status              TEXT NOT NULL DEFAULT 'pending',
    submitted_at        TIMESTAMPTZ,
    approved_at         TIMESTAMPTZ,
    expiry_date         DATE,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE fda_documents (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fda_registration_id UUID NOT NULL REFERENCES fda_registrations(id) ON DELETE CASCADE,
    doc_type            TEXT NOT NULL,
    file_url            TEXT NOT NULL,
    uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
- Add CRUD endpoints under `/api/v1/fda-registrations`
- Build FDA management tab on SO detail page

#### 1.4 — Artwork: Add workflow fields
```sql
ALTER TABLE artwork_docs ADD COLUMN version      INT NOT NULL DEFAULT 1;
ALTER TABLE artwork_docs ADD COLUMN status       TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE artwork_docs ADD COLUMN submitted_at TIMESTAMPTZ;
ALTER TABLE artwork_docs ADD COLUMN approved_at  TIMESTAMPTZ;
ALTER TABLE artwork_docs ADD COLUMN notes        TEXT;
```
- Add `PATCH /api/v1/artworks/:id/status` endpoint for approval flow
- Update Artwork page to show status badge and approval action

#### 1.5 — Manufacturing Order: Add scheduling fields
```sql
ALTER TABLE manufacturing_orders ADD COLUMN planned_start DATE;
ALTER TABLE manufacturing_orders ADD COLUMN planned_end   DATE;
ALTER TABLE manufacturing_orders ADD COLUMN actual_start  TIMESTAMPTZ;
ALTER TABLE manufacturing_orders ADD COLUMN actual_end    TIMESTAMPTZ;
ALTER TABLE manufacturing_orders ADD COLUMN qty_produced  NUMERIC(20,4) NOT NULL DEFAULT 0;
ALTER TABLE manufacturing_orders ADD COLUMN notes         TEXT;
```

#### 1.6 — Production Batch: Add stage qty & timestamps
```sql
ALTER TABLE production_batches ADD COLUMN qty_bulk_produced NUMERIC(20,4);
ALTER TABLE production_batches ADD COLUMN qty_filled        NUMERIC(20,4);
ALTER TABLE production_batches ADD COLUMN qty_packed        NUMERIC(20,4);
ALTER TABLE production_batches ADD COLUMN bulk_start        TIMESTAMPTZ;
ALTER TABLE production_batches ADD COLUMN bulk_end          TIMESTAMPTZ;
ALTER TABLE production_batches ADD COLUMN fill_start        TIMESTAMPTZ;
ALTER TABLE production_batches ADD COLUMN fill_end          TIMESTAMPTZ;
ALTER TABLE production_batches ADD COLUMN pack_start        TIMESTAMPTZ;
ALTER TABLE production_batches ADD COLUMN pack_end          TIMESTAMPTZ;
```

#### 1.7 — Purchase Order: Link to MO
```sql
ALTER TABLE purchase_orders ADD COLUMN mo_id  UUID REFERENCES manufacturing_orders(id);
ALTER TABLE purchase_orders ADD COLUMN notes  TEXT;
```

#### 1.8 — Production Plans
```sql
CREATE TABLE production_plans (
    id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_date              DATE NOT NULL,
    manufacturing_order_id UUID NOT NULL REFERENCES manufacturing_orders(id),
    purchase_order_id      UUID REFERENCES purchase_orders(id),
    planned_qty            NUMERIC(20,4),
    notes                  TEXT,
    created_by             UUID REFERENCES users(id),
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
- Add planning endpoints and a Planning page in the frontend sidebar

---

### Phase 2 — Shipping Module
*Shipping is the bridge between production and invoicing — currently missing entirely.*

#### 2.1 — Shipments Schema
```sql
CREATE TYPE shipment_status AS ENUM ('loading', 'dispatched', 'in_transit', 'delivered');

CREATE TABLE shipments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_number TEXT NOT NULL UNIQUE,
    sales_order_id  UUID NOT NULL REFERENCES sales_orders(id),
    status          shipment_status NOT NULL DEFAULT 'loading',
    carrier         TEXT,
    tracking_number TEXT,
    loaded_at       TIMESTAMPTZ,
    dispatched_at   TIMESTAMPTZ,
    delivered_at    TIMESTAMPTZ,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE shipment_lines (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    item_id     UUID NOT NULL REFERENCES items(id),
    batch_id    UUID REFERENCES production_batches(id),
    qty_shipped NUMERIC(20,4) NOT NULL,
    uom_id      UUID NOT NULL REFERENCES uoms(id)
);
CREATE TABLE shipping_documents (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    doc_type    TEXT NOT NULL,   -- Bill of Lading, Packing List, COA, COO
    file_url    TEXT NOT NULL,
    issued_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### 2.2 — Shipments API
- `GET  /api/v1/shipments` — list with status filter
- `POST /api/v1/shipments` — create from SO
- `GET  /api/v1/shipments/:id` — detail with lines + documents
- `PATCH /api/v1/shipments/:id/status` — advance status
- `POST /api/v1/shipments/:id/documents` — attach docs

#### 2.3 — Shipments Frontend Page
- New page: `/shipping`
- Table: shipment number, SO#, customer, status, carrier, dispatch date
- Detail slide-over: lines, documents, status timeline
- Link SO detail page to a "Create Shipment" action

---

### Phase 3 — Finance Completion
*Invoices currently have no line breakdown and payments only cover customers.*

#### 3.1 — Invoice Lines
```sql
CREATE TABLE invoice_lines (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id  UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    item_id     UUID REFERENCES items(id),
    description TEXT NOT NULL,
    qty         NUMERIC(20,4) NOT NULL,
    uom_id      UUID REFERENCES uoms(id),
    unit_price  NUMERIC(20,4) NOT NULL,
    line_total  NUMERIC(20,4) NOT NULL
);
ALTER TABLE invoices ADD COLUMN shipment_id UUID REFERENCES shipments(id);
ALTER TABLE invoices ADD COLUMN subtotal    NUMERIC(20,4) NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN tax         NUMERIC(20,4) NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN currency    CHAR(3) NOT NULL DEFAULT 'USD';
ALTER TABLE invoices ADD COLUMN notes       TEXT;
```

#### 3.2 — Supplier Payments
```sql
-- Make invoice_id nullable (supplier payments don't reference an invoice)
ALTER TABLE payments ALTER COLUMN invoice_id DROP NOT NULL;
ALTER TABLE payments ADD COLUMN payment_type TEXT NOT NULL DEFAULT 'customer';
ALTER TABLE payments ADD COLUMN supplier_id  UUID REFERENCES suppliers(id);
ALTER TABLE payments ADD COLUMN po_id        UUID REFERENCES purchase_orders(id);
ALTER TABLE payments ADD COLUMN currency     CHAR(3) NOT NULL DEFAULT 'USD';
ALTER TABLE payments ADD COLUMN method       TEXT;   -- Wire, ACH, Check, Credit
ALTER TABLE payments ADD COLUMN status       TEXT NOT NULL DEFAULT 'pending';
```

#### 3.3 — Finance Frontend Updates
- Add line items view on invoice detail
- Add supplier payment tab alongside customer payments

---

### Phase 4 — Frontend UX Improvements
*Polish and productivity features across all modules.*

#### 4.1 — Toast Notifications
- Implement a global toast context (top-right, auto-dismiss 4s)
- Replace silent `router.refresh()` after every form submission with a success toast
- Show error toasts for API failures instead of inline-only errors
- Affects all SlideOver forms across all 10 modules

#### 4.2 — Search & Filters on DataTable
- Add an optional `searchable` prop to `DataTable` — filters rows client-side
- Add a `filterBar` slot prop for module-specific filters (e.g. status dropdown on SOs)
- Priority: Sales Orders, Purchase Orders, Inventory, Manufacturing Orders

#### 4.3 — Pagination
- Add `page`/`pageSize` props to `DataTable` with a page footer
- Update API endpoints to accept `?page=&limit=` query params
- Priority: Sales Orders, Inventory, Invoices

#### 4.4 — Breadcrumbs
- Add a `<Breadcrumb>` component in the topbar
- Show on all detail pages: e.g. `Sales Orders / SO-0042`
- Required on: SO detail, MO detail, PO detail, Invoice detail

#### 4.5 — Loading Skeletons
- Add a `<Skeleton>` component (animated gray bars)
- Use in table rows during `router.refresh()` transitions
- Use as `loading.tsx` fallback in Next.js route segments

#### 4.6 — SlideOver Forms: Replace UUID inputs with Selects
- `customer_id` on New SO → searchable `<select>` from `/api/v1/masters/customers`
- `country_id` on New SO → `<select>` from `/api/v1/masters/countries`
- `supplier_id` on New PO → `<select>` from `/api/v1/masters/suppliers`
- `item_id` on PO/SO lines → `<select>` from `/api/v1/masters/items`

#### 4.7 — Bulk Actions on DataTable
- Add optional checkbox column to `DataTable`
- Implement bulk status update for SOs (e.g. mark multiple as shipped)
- Implement bulk CSV export

#### 4.8 — Module-Specific Empty States
- Replace generic "No records found" with per-module actionable empty states
- Include a CTA button linking to the relevant "New" action

---

### Phase 5 — Production Floor Real-Time
*Make the production floor page live and actionable.*

#### 5.1 — Batch Stage Advancement
- `PATCH /api/v1/production/batches/:id/advance` — moves batch to next stage
- Each advance records the stage timestamp (bulk_end / fill_start etc.)
- Frontend: stage progress bar on each batch card with an "Advance" button

#### 5.2 — Component Issue / Return UI
- `item_management_txns` has no frontend form yet
- Add an "Issue Material" slide-over on the batch detail view
- Pre-populate BOM requirements; allow qty override

#### 5.3 — Production Dashboard Widget
- Replace the static bar chart with live batch counts per stage
- Clicking a bar filters the batch list below it

---

### Phase 6 — Roles & Permissions
*Currently JWT auth has no role enforcement.*

#### 6.1 — Role-Based Middleware (API)
- Add `require_role(role)` extractor in Rust (reads role from JWT claims)
- Protect write operations by role:
  - `admin` — all
  - `planner` — MOs, POs, production plans
  - `production` — batches, item management, production floor
  - `warehouse` — receiving, inventory, shipping
  - `finance` — invoices, payments
  - `viewer` — GET only across all modules

#### 6.2 — Frontend Role Guards
- Hide New / Edit / Cancel buttons based on user role decoded from JWT
- Show read-only view for `viewer` role

---

## Milestone Summary

| Phase | Focus | Key Deliverable |
|-------|-------|-----------------|
| 1 | Schema gaps | FDA, SO lines, artwork workflow, planning, batch scheduling |
| 2 | Shipping module | End-to-end shipment tracking + documents |
| 3 | Finance completion | Invoice lines, supplier payments |
| 4 | Frontend UX | Toasts, search, pagination, select inputs, skeletons |
| 5 | Production real-time | Stage advancement, material issue UI |
| 6 | Roles & permissions | Route guards, role-based UI |

---

## Migration Strategy

- New tables → new migration file per phase (`0004_schema_gaps.sql`, `0005_shipping.sql`, etc.)
- `ALTER TABLE` changes → included in the same migration as related new tables
- Never modify `0001_initial.sql` — it is the deployed baseline
- Run `cargo sqlx prepare` after every migration to update the offline query cache