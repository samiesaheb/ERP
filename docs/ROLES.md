# Roles & Permissions — Skyhigh MES/ERP

There are two layers of access control:

1. **API enforcement** — `require_role()` in Rust handlers returns `403 Forbidden` if the caller's role is not in the allowed list. This is the authoritative layer.
2. **Frontend visibility** — `ROLE_ACCESS` in `web/lib/rbac.ts` hides sidebar links and redirects to `/login` if a user navigates to a route their role cannot access. This is a UX layer only; it does not replace API enforcement.

---

## The Eight Roles

| Role | Colour in UI | Intended user |
|---|---|---|
| `admin` | Red | System administrator — full access |
| `planner` | Blue | Production/supply chain planner |
| `supervisor` | Green | Factory floor supervisor |
| `purchasing` | Blue | Procurement officer |
| `sales` | Green | Sales representative / account manager |
| `warehouse` | Amber | Warehouse operator |
| `qc` | Amber | Quality control inspector |
| `subcontractor` | Gray | External contract manufacturer |

Roles are stored as plain text strings. The system is case-sensitive; all built-in roles are lowercase. Custom role strings can be assigned via the Users page but will not match any `require_role()` group and will therefore be treated as read-only on all write endpoints.

---

## API Permission Groups

These constants are defined in `api/crates/api/src/middleware/rbac.rs` and used directly in handler code.

| Constant | Roles |
|---|---|
| `ADMIN` | `admin` |
| `ADMIN_PLANNER` | `admin`, `planner` |
| `ADMIN_PLANNER_SUPERVISOR` | `admin`, `planner`, `supervisor` |
| `SALES_ROLES` | `admin`, `sales`, `planner`, `supervisor` |
| `PURCHASING_ROLES` | `admin`, `purchasing`, `planner` |
| `WAREHOUSE_ROLES` | `admin`, `warehouse`, `purchasing`, `supervisor`, `planner`, `qc` |
| `PRODUCTION_ROLES` | `admin`, `planner`, `supervisor`, `subcontractor`, `qc` |
| `FINANCE_ROLES` | `admin`, `sales` |

---

## Endpoint Permission Matrix

`✓` = allowed · `—` = forbidden (returns `403`) · `·` = no role check (any authenticated user)

### Authentication & Users

| Endpoint | admin | planner | supervisor | purchasing | sales | warehouse | qc | subcontractor |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `POST /auth/login` | · | · | · | · | · | · | · | · |
| `GET /health` | · | · | · | · | · | · | · | · |
| `GET /api/v1/users/me` | · | · | · | · | · | · | · | · |
| `GET /api/v1/users` | ✓ | — | — | — | — | — | — | — |
| `POST /api/v1/users` | ✓ | — | — | — | — | — | — | — |
| `PUT /api/v1/users/:id` | ✓ | — | — | — | — | — | — | — |
| `DELETE /api/v1/users/:id` | ✓ | — | — | — | — | — | — | — |

### Dashboard & Masters

| Endpoint | admin | planner | supervisor | purchasing | sales | warehouse | qc | subcontractor |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `GET /api/v1/dashboard/kpis` | · | · | · | · | · | · | · | · |
| `GET /api/v1/customer-types` | · | · | · | · | · | · | · | · |
| `GET /api/v1/countries` | · | · | · | · | · | · | · | · |
| `GET /api/v1/uoms` | · | · | · | · | · | · | · | · |
| `GET /api/v1/customers` | · | · | · | · | · | · | · | · |
| `POST /api/v1/customers` | · | · | · | · | · | · | · | · |
| `PUT /api/v1/customers/:id` | · | · | · | · | · | · | · | · |
| `GET /api/v1/items` | · | · | · | · | · | · | · | · |
| `POST /api/v1/items` | · | · | · | · | · | · | · | · |
| `PUT /api/v1/items/:id` | · | · | · | · | · | · | · | · |
| `GET /api/v1/items/:id/suppliers` | · | · | · | · | · | · | · | · |
| `POST /api/v1/items/:id/suppliers` | · | · | · | · | · | · | · | · |
| `GET /api/v1/items/:id/uom-conversions` | · | · | · | · | · | · | · | · |
| `POST /api/v1/items/:id/uom-conversions` | · | · | · | · | · | · | · | · |
| `GET /api/v1/suppliers` | · | · | · | · | · | · | · | · |
| `POST /api/v1/suppliers` | · | · | · | · | · | · | · | · |
| `PUT /api/v1/suppliers/:id` | · | · | · | · | · | · | · | · |

### Sales Orders & Artwork

| Endpoint | admin | planner | supervisor | purchasing | sales | warehouse | qc | subcontractor |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `GET /api/v1/sales-orders` | · | · | · | · | · | · | · | · |
| `GET /api/v1/sales-orders/:id` | · | · | · | · | · | · | · | · |
| `POST /api/v1/sales-orders` | ✓ | ✓ | ✓ | — | ✓ | — | — | — |
| `PUT /api/v1/sales-orders/:id` | ✓ | ✓ | ✓ | — | ✓ | — | — | — |
| `GET /api/v1/sales-orders/:id/lines` | · | · | · | · | · | · | · | · |
| `POST /api/v1/sales-orders/:id/lines` | · | · | · | · | · | · | · | · |
| `PUT /api/v1/sales-orders/:id/lines/:id` | · | · | · | · | · | · | · | · |
| `DELETE /api/v1/sales-orders/:id/lines/:id` | · | · | · | · | · | · | · | · |
| `GET /api/v1/artworks` | · | · | · | · | · | · | · | · |
| `POST /api/v1/artworks` | · | · | · | · | · | · | · | · |
| `PUT /api/v1/artworks/:id` | · | · | · | · | · | · | · | · |
| `GET /api/v1/fda-registrations` | · | · | · | · | · | · | · | · |
| `POST /api/v1/fda-registrations` | · | · | · | · | · | · | · | · |
| `PUT /api/v1/fda-registrations/:id` | · | · | · | · | · | · | · | · |
| `GET /api/v1/fda-registrations/:id/documents` | · | · | · | · | · | · | · | · |
| `POST /api/v1/fda-registrations/:id/documents` | · | · | · | · | · | · | · | · |

### Formulations & BOM

| Endpoint | admin | planner | supervisor | purchasing | sales | warehouse | qc | subcontractor |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `GET /api/v1/formulations` | · | · | · | · | · | · | · | · |
| `GET /api/v1/formulations/:id` | · | · | · | · | · | · | · | · |
| `POST /api/v1/formulations` | · | · | · | · | · | · | · | · |
| `PATCH /api/v1/formulations/:id` | · | · | · | · | · | · | · | · |
| `DELETE /api/v1/formulations/:id` | · | · | · | · | · | · | · | · |
| `GET /api/v1/ingredients` | · | · | · | · | · | · | · | · |
| `POST /api/v1/ingredients` | · | · | · | · | · | · | · | · |
| `GET /api/v1/products` | · | · | · | · | · | · | · | · |
| `GET /api/v1/boms` | · | · | · | · | · | · | · | · |
| `GET /api/v1/boms/:id` | · | · | · | · | · | · | · | · |
| `POST /api/v1/boms` | · | · | · | · | · | · | · | · |
| `DELETE /api/v1/boms/:id` | · | · | · | · | · | · | · | · |
| `GET /api/v1/boms/:id/lines` | · | · | · | · | · | · | · | · |
| `POST /api/v1/boms/:id/lines` | · | · | · | · | · | · | · | · |
| `GET /api/v1/boms/:id/explode` | · | · | · | · | · | · | · | · |

### Procurement & Receiving

| Endpoint | admin | planner | supervisor | purchasing | sales | warehouse | qc | subcontractor |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `GET /api/v1/purchase-orders` | · | · | · | · | · | · | · | · |
| `GET /api/v1/purchase-orders/:id` | · | · | · | · | · | · | · | · |
| `POST /api/v1/purchase-orders` | ✓ | ✓ | — | ✓ | — | — | — | — |
| `PUT /api/v1/purchase-orders/:id` | ✓ | ✓ | — | ✓ | — | — | — | — |
| `GET /api/v1/purchase-orders/:id/lines` | · | · | · | · | · | · | · | · |
| `POST /api/v1/purchase-orders/:id/lines` | · | · | · | · | · | · | · | · |
| `GET /api/v1/receipts` | · | · | · | · | · | · | · | · |
| `POST /api/v1/receipts` | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | — |
| `GET /api/v1/receipts/:id/lines` | · | · | · | · | · | · | · | · |
| `PUT /api/v1/receipts/:id/lines/:id` | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | — |

### Inventory & Locations

| Endpoint | admin | planner | supervisor | purchasing | sales | warehouse | qc | subcontractor |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `GET /api/v1/inventory` | · | · | · | · | · | · | · | · |
| `POST /api/v1/inventory/transact` | · | · | · | · | · | · | · | · |
| `GET /api/v1/inventory/transactions` | · | · | · | · | · | · | · | · |
| `POST /api/v1/inventory/:id/cycle-count` | · | · | · | · | · | · | · | · |
| `GET /api/v1/locations` | · | · | · | · | · | · | · | · |
| `POST /api/v1/locations` | · | · | · | · | · | · | · | · |
| `PUT /api/v1/locations/:id` | · | · | · | · | · | · | · | · |

### Manufacturing & Production

| Endpoint | admin | planner | supervisor | purchasing | sales | warehouse | qc | subcontractor |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `GET /api/v1/manufacturing-orders` | · | · | · | · | · | · | · | · |
| `GET /api/v1/manufacturing-orders/:id` | · | · | · | · | · | · | · | · |
| `POST /api/v1/manufacturing-orders` | ✓ | ✓ | — | — | — | — | — | — |
| `PUT /api/v1/manufacturing-orders/:id` | ✓ | ✓ | ✓ | — | — | — | — | — |
| `GET /api/v1/manufacturing-orders/:id/batches` | · | · | · | · | · | · | · | · |
| `POST /api/v1/manufacturing-orders/:id/batches` | ✓ | ✓ | ✓ | — | — | — | — | — |
| `GET /api/v1/production/batches` | · | · | · | · | · | · | · | · |
| `PUT /api/v1/production/batches/:id` | ✓ | ✓ | ✓ | — | — | — | ✓ | ✓ |
| `GET /api/v1/production/batches/:id/issues` | · | · | · | · | · | · | · | · |
| `POST /api/v1/production/batches/:id/issues` | · | · | · | · | · | · | · | · |
| `GET /api/v1/production/plans` | · | · | · | · | · | · | · | · |
| `POST /api/v1/production/plans` | · | · | · | · | · | · | · | · |

### Shop Floor

| Endpoint | admin | planner | supervisor | purchasing | sales | warehouse | qc | subcontractor |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `GET /api/v1/work-centers` | · | · | · | · | · | · | · | · |
| `POST /api/v1/work-centers` | ✓ | ✓ | — | — | — | — | — | — |
| `PUT /api/v1/work-centers/:id` | ✓ | ✓ | — | — | — | — | — | — |
| `GET /api/v1/boms/:id/routing` | · | · | · | · | · | · | · | · |
| `POST /api/v1/boms/:id/routing` | ✓ | ✓ | — | — | — | — | — | — |
| `DELETE /api/v1/boms/:id/routing/:id` | ✓ | ✓ | — | — | — | — | — | — |
| `GET /api/v1/production/batches/:id/qc-tests` | · | · | · | · | · | · | · | · |
| `POST /api/v1/production/batches/:id/qc-tests` | ✓ | ✓ | ✓ | — | — | — | ✓ | ✓ |
| `PUT /api/v1/production/batches/:id/qc-tests/:id` | ✓ | ✓ | ✓ | — | — | — | ✓ | ✓ |
| `GET /api/v1/production/batches/:id/downtime` | · | · | · | · | · | · | · | · |
| `POST /api/v1/production/batches/:id/downtime` | ✓ | ✓ | ✓ | — | — | — | ✓ | ✓ |
| `PUT /api/v1/production/batches/:id/downtime/:id` | ✓ | ✓ | ✓ | — | — | — | ✓ | ✓ |
| `GET /api/v1/access-requests` | · | · | · | · | · | · | · | · |
| `POST /api/v1/access-requests` | · | · | · | · | · | · | · | · |
| `PUT /api/v1/access-requests/:id` | ✓ | — | — | — | — | — | — | — |

### Shipments

| Endpoint | admin | planner | supervisor | purchasing | sales | warehouse | qc | subcontractor |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `GET /api/v1/shipments` | · | · | · | · | · | · | · | · |
| `GET /api/v1/shipments/:id` | · | · | · | · | · | · | · | · |
| `POST /api/v1/shipments` | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | — |
| `PUT /api/v1/shipments/:id` | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | — |
| `GET /api/v1/shipments/:id/lines` | · | · | · | · | · | · | · | · |
| `POST /api/v1/shipments/:id/lines` | · | · | · | · | · | · | · | · |
| `GET /api/v1/shipments/:id/documents` | · | · | · | · | · | · | · | · |
| `POST /api/v1/shipments/:id/documents` | · | · | · | · | · | · | · | · |

### Finance

| Endpoint | admin | planner | supervisor | purchasing | sales | warehouse | qc | subcontractor |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `GET /api/v1/invoices` | · | · | · | · | · | · | · | · |
| `GET /api/v1/invoices/:id` | · | · | · | · | · | · | · | · |
| `POST /api/v1/invoices` | ✓ | — | — | — | ✓ | — | — | — |
| `PUT /api/v1/invoices/:id` | ✓ | — | — | — | ✓ | — | — | — |
| `GET /api/v1/invoices/:id/lines` | · | · | · | · | · | · | · | · |
| `POST /api/v1/invoices/:id/lines` | · | · | · | · | · | · | · | · |
| `GET /api/v1/payments` | · | · | · | · | · | · | · | · |
| `POST /api/v1/payments` | ✓ | — | — | — | ✓ | — | — | — |

### Search & Audit

| Endpoint | admin | planner | supervisor | purchasing | sales | warehouse | qc | subcontractor |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `GET /api/v1/search` | · | · | · | · | · | · | · | · |
| `GET /api/v1/audit-logs` | ✓ | — | — | — | — | — | — | — |

---

## Frontend Page Access

Defined in `web/lib/rbac.ts`. Routes are prefix-matched — `/sales-orders` also covers `/sales-orders/abc123`. `*` means all routes.

| Page | admin | planner | supervisor | purchasing | sales | warehouse | qc | subcontractor |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Dashboard `/` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Sales Orders `/sales-orders` | ✓ | ✓ | ✓ | — | ✓ | — | — | — |
| Customers `/customers` | ✓ | — | — | — | ✓ | — | — | — |
| Artwork `/artwork` | ✓ | — | — | — | ✓ | — | ✓ | — |
| Formulations `/formulations` | ✓ | ✓ | ✓ | — | — | — | — | — |
| BOM `/bom` | ✓ | ✓ | ✓ | — | — | — | — | — |
| Items `/items` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Suppliers `/suppliers` | ✓ | ✓ | — | ✓ | — | — | — | — |
| Purchase Orders `/purchase-orders` | ✓ | ✓ | — | ✓ | — | — | — | — |
| Receiving `/receiving` | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | — |
| Inventory `/inventory` | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | — |
| Manufacturing Orders `/manufacturing-orders` | ✓ | ✓ | ✓ | — | — | — | — | — |
| Production `/production` | ✓ | ✓ | ✓ | — | — | — | ✓ | ✓ |
| Work Centres `/work-centers` | ✓ | ✓ | ✓ | — | — | — | ✓ | — |
| MRP `/mrp` | ✓ | ✓ | — | — | — | — | — | — |
| Shipments `/shipments` | ✓ | — | ✓ | — | ✓ | ✓ | — | — |
| Invoicing `/invoicing` | ✓ | — | — | — | ✓ | — | — | — |
| Payments `/payments` | ✓ | — | — | — | ✓ | — | — | — |
| Access Requests `/access-requests` | ✓ | ✓ | ✓ | — | — | — | ✓ | — |
| Users `/users` | ✓ | — | — | — | — | — | — | — |
| Audit Logs `/audit-logs` | ✓ | — | — | — | — | — | — | — |

---

## Notes

**Read vs. write asymmetry** — Many endpoints have no `require_role` check on GET but do enforce roles on POST/PUT/DELETE. This is intentional: any authenticated employee should be able to view data, but writes are restricted to relevant roles.

**Access Requests** — Any role can submit an access request (`POST /api/v1/access-requests`). Only `admin` can approve or reject them (`PUT /api/v1/access-requests/:id`). Each non-admin user sees only their own requests in the list.

**Self-protection** — `DELETE /api/v1/users/:id` rejects attempts to delete the caller's own account (`400 Bad Request`), even for admins.

**Subcontractor scope** — The `subcontractor` role is intentionally minimal: production batch updates, QC tests, and downtime events only. They cannot see inventory, orders, or financial data, and they have no frontend pages beyond the dashboard and `/production`.

**Adding a new role** — Assign the role string to a user via the Users page. To grant the new role write access to an endpoint, add it to the appropriate constant in `api/crates/api/src/middleware/rbac.rs` and add the relevant page paths to `web/lib/rbac.ts`.
