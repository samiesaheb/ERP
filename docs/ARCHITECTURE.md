# ARCHITECTURE.md — System Architecture

How the system is structured, how its layers communicate, and why key decisions were made.

---

## System Topology

Two independently deployed services communicate over HTTP. The browser never talks directly to the Rust API.

```
┌─────────────────────────────────────────────────────────────────────┐
│  Browser                                                            │
│  - Renders React components (RSC + Client)                          │
│  - Reads JWT from cookie for Authorization header                   │
│  - Talks to Next.js only (never directly to Rust API)               │
└────────────────────────┬───────────────────────────────────────────-┘
                         │  HTTP  (port 3000 in dev)
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Next.js 16  (web/)                                                 │
│  - App Router with React Server Components                          │
│  - Three Next.js API Routes:                                        │
│      POST /api/auth/login   — proxies to Rust, sets cookie          │
│      POST /api/auth/logout  — clears cookie                         │
│      GET  /api/search       — server-side search aggregation        │
│  - Server Components fetch data from Rust API using cookie token    │
│  - Client Components mutate via clientFetch() using cookie token    │
└────────────────────────┬────────────────────────────────────────────┘
                         │  HTTP  (port 8080 in dev)
                         │  Bearer <JWT> on every request
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Rust API  (api/)                                                   │
│  - Axum 0.7 on Tokio async runtime                                  │
│  - Workspace of 4 crates: api, domain, db, workers                 │
│  - All business logic and data access lives here                    │
│  - Talks only to PostgreSQL                                         │
└────────────────────────┬────────────────────────────────────────────┘
                         │  TCP (SQLx connection pool, max 20 conns)
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PostgreSQL                                                         │
│  - 44 tables, UUID PKs throughout                                   │
│  - 17 migrations applied on API startup                             │
│  - Audit trigger fires AFTER every write on 32 tables               │
│  - Session variable app.current_user_id bridges API → trigger       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Rust Crate Architecture

The API is a Cargo workspace with four crates. Dependencies flow in one direction only.

```
        ┌──────────┐
        │  domain  │  Types only — structs, request/response bodies,
        │          │  sqlx::FromRow derives. No HTTP, no DB logic.
        └────┬─────┘
             │  depended on by
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌───────┐        ┌────────┐
│  api  │        │   db   │  SQL migrations only (no Rust code).
│       │        │        │  sqlx::migrate! in main.rs points here.
└───────┘        └────────┘
    │
    ▼
┌─────────┐
│ workers │  Background Tokio tasks (currently a stub).
└─────────┘
```

**`domain`** is the contract between all crates and between the API and frontend. Every data shape lives here exactly once. The frontend's `web/lib/types.ts` is a manual mirror of these structs — field names must match exactly because the API serialises to `snake_case` JSON with no transformation layer.

**`api`** contains five internal modules:

```
api/crates/api/src/
├── main.rs          Entry point: env, tracing, DB pool, migrations, CORS, server
├── state.rs         AppState { db: PgPool, jwt_secret: String }
├── error.rs         AppError enum → HTTP status + JSON body
├── routes/
│   └── mod.rs       All route registrations in one place
├── handlers/        One file per domain area (16 handler modules)
│   ├── auth.rs
│   ├── masters.rs
│   ├── sales.rs
│   ├── artwork.rs
│   ├── formulation.rs
│   ├── bom.rs
│   ├── procurement.rs
│   ├── inventory.rs
│   ├── locations.rs
│   ├── production.rs
│   ├── shop_floor.rs
│   ├── shipments.rs
│   ├── finance.rs
│   ├── search.rs
│   ├── dashboard.rs
│   └── audit.rs
└── middleware/
    ├── auth.rs      JWT validation, Claims injection, session var
    └── rbac.rs      require_role() helper + role constant groups
```

---

## HTTP Request Lifecycle

A complete trace from browser click to JSON response, for a protected endpoint.

```
1. Browser
   │  User clicks "Save" in the inventory page
   │  clientFetch('POST', '/api/v1/inventory/transact', body)
   │  Reads token from cookie → adds Authorization: Bearer <jwt>
   │
2. Next.js  [no interception — passes through to Rust directly]
   │  Next.js has no middleware for /api/v1/* paths
   │  The browser calls the Rust API directly for all /api/v1/ routes
   │
3. Rust API — TCP accept
   │
4. CorsLayer  (tower-http)
   │  Checks Origin header against ALLOWED_ORIGIN env var
   │  Adds Access-Control-Allow-* response headers
   │
5. Router  (axum)
   │  Matches POST /api/v1/inventory/transact
   │  Route is in the `protected` router → require_auth middleware applies
   │
6. require_auth middleware  (middleware/auth.rs)
   │  Extracts Bearer token from Authorization header
   │  Decodes and validates JWT using jwt_secret from AppState
   │  On failure → returns 401 { "error": "..." }
   │  On success:
   │    - Inserts Claims into request extensions (available to handler)
   │    - Runs: SET LOCAL app.current_user_id = '<user-uuid>'
   │      on the pool connection (best-effort, for audit trigger)
   │
7. Handler  (handlers/inventory.rs :: transact_inventory)
   │  Extracts: State(state), Json(body)
   │  Optionally: Extension(claims) if role check needed
   │  Calls require_role(&claims, WAREHOUSE_ROLES)?  if applicable
   │  Executes sqlx::query!(...) against state.db (PgPool)
   │
8. SQLx + PgPool
   │  Acquires a connection from the pool (max 20 connections)
   │  Sends parameterised SQL to PostgreSQL
   │  Waits for result asynchronously (Tokio await)
   │
9. PostgreSQL  — executes INSERT / UPDATE / SELECT
   │  If write: audit_trigger fires AFTER the row is written
   │  Trigger reads app.current_user_id session variable
   │  Writes to audit_logs (table_name, record_id, action, old/new JSONB, user)
   │  Returns rows to SQLx
   │
10. Handler builds response
    │  Maps DB rows to domain types
    │  Returns Ok(Json(result)) or Err(AppError::...)
    │
11. AppError::into_response()  (error.rs)
    │  Maps error variants to HTTP status codes:
    │  NotFound → 404,  Unauthorized → 401,  Conflict → 409, etc.
    │  Serialises { "error": "message" } as JSON body
    │
12. Response travels back through CorsLayer → browser
    │  Browser receives JSON, React state updates, UI re-renders
```

**Key point:** The browser sends JWT in the `Authorization: Bearer` header for all `/api/v1/` calls. The Next.js server sends JWT in the same header for all Server Component fetches. The token originates from the login flow described below.

---

## Authentication Flow

Login is the only flow that routes through Next.js as a proxy. All other authenticated requests go browser → Rust directly.

```
Browser (login page — 'use client')
  │
  │  POST /api/auth/login  { email, password }
  │  (to Next.js, not Rust)
  ▼
Next.js Route Handler  (app/api/auth/login/route.ts)
  │  Forwards request body to Rust:
  │  POST http://localhost:8080/auth/login
  │
  ▼
Rust handler  (handlers/auth.rs :: login)
  │  1. Queries users table WHERE email = $1 AND is_active = TRUE
  │  2. bcrypt::verify(password, stored_hash)
  │  3. Access window checks:
  │     - allowed_days: comma-separated "Mon,Tue,Wed" — checks UTC weekday
  │     - access_time_start / access_time_end: UTC time window
  │     - Supports overnight windows (e.g. 22:00–06:00)
  │  4. On success: builds Claims { sub, email, full_name, role, iat, exp }
  │     JWT expires in 24 hours (exp = iat + 86400)
  │  5. Returns LoginResponse { token, user_id, email, full_name, role }
  │
  ▼
Next.js Route Handler (receives Rust response)
  │  Sets cookie:  token=<jwt>
  │    httpOnly: false  ← intentional: clientFetch reads it for Authorization header
  │    secure: true in production, false in dev
  │    sameSite: 'lax'
  │    maxAge: 86400 (24 hours)
  │  Returns { ok: true } to browser
  │
  ▼
Browser
  Cookie stored. Subsequent requests:
  - RSC fetches: Next.js server reads cookie → adds Authorization header → calls Rust
  - Client fetches: browser reads cookie → adds Authorization header → calls Rust directly
```

**JWT payload (Claims):**
```
{
  "sub":       "uuid-of-user",     // used by audit trigger
  "email":     "user@example.com",
  "full_name": "Khun Nut",
  "role":      "warehouse",
  "iat":       1715000000,
  "exp":       1715086400
}
```

The `role` field in the JWT is the single source of truth for authorisation on every request. It is stamped at login time and does not change until the user logs out and back in.

---

## Authorisation (RBAC)

Two layers enforce role-based access. Neither layer replaces the other.

**Layer 1 — Frontend route guards** (`web/lib/rbac.ts`)

The `ROLE_ACCESS` map defines which URL paths each role can visit. The Sidebar only renders links the current role can access. Client Components call `canAccess(role, pathname)` to show or hide UI elements. This is a UX layer — it prevents confusion but does not enforce security.

**Layer 2 — API role checks** (`api/crates/api/src/middleware/rbac.rs`)

Handlers that perform sensitive operations call `require_role(&claims, ALLOWED_ROLES)?` at the top of the function. This is the actual security boundary.

Role constant groups defined in `rbac.rs`:
```rust
ADMIN                       = ["admin"]
ADMIN_PLANNER               = ["admin", "planner"]
ADMIN_PLANNER_SUPERVISOR    = ["admin", "planner", "supervisor"]
SALES_ROLES                 = ["admin", "sales", "planner", "supervisor"]
PURCHASING_ROLES            = ["admin", "purchasing", "planner"]
WAREHOUSE_ROLES             = ["admin", "warehouse", "purchasing", "supervisor", "planner", "qc"]
PRODUCTION_ROLES            = ["admin", "planner", "supervisor", "subcontractor", "qc"]
FINANCE_ROLES               = ["admin", "sales"]
```

Most read endpoints (`GET`) do not call `require_role` — any authenticated user can view data. Write endpoints (`POST`, `PUT`, `DELETE`) call it selectively based on what they do.

---

## Frontend Architecture

The frontend is a Next.js 16 App Router application. Every page lives in `web/app/(dashboard)/` — the `(dashboard)` is a route group that applies the sidebar layout without adding a URL segment.

### Two rendering modes

```
Server Component (default — no 'use client')
  - Runs on the Next.js server at request time
  - Uses lib/api.ts → apiFetch() which reads cookie server-side
  - Can await data directly in the component body
  - Never shipped to the browser as JavaScript
  - Pattern: page.tsx fetches all data → passes as props to Client Component

Client Component ('use client' at top of file)
  - Runs in the browser
  - Handles state, events, and interactions
  - Uses lib/client-api.ts → clientFetch() which reads cookie from document.cookie
  - Pattern: receives data as props, owns UI state (selected row, slide-over open, etc.)
```

**Standard page pattern:**
```
app/(dashboard)/inventory/
├── page.tsx          RSC — fetches inventory, items, uoms in parallel → renders InventoryClient
└── InventoryClient.tsx  'use client' — DataTable, SlideOver, form handlers
```

### The two API modules

```
web/lib/api.ts          Server-side only
  - Uses process.env.API_URL (server env var, not exposed to browser)
  - Reads cookie with next/headers cookies()
  - cache: 'no-store' on all fetches (always fresh data)
  - Redirects to /login on 401
  - Import only in RSC (page.tsx, layout.tsx, route.ts)

web/lib/client-api.ts   Browser-safe
  - Uses process.env.NEXT_PUBLIC_API_URL (exposed to browser)
  - Reads cookie with document.cookie
  - window.location.href = '/login' on 401
  - Import only in 'use client' components
```

### Three Next.js API Routes

These are the only routes handled by Next.js itself — everything else goes to Rust.

| Route | Purpose |
|---|---|
| `POST /api/auth/login` | Proxies login to Rust, converts the JWT in the response body to an httpOnly-like cookie |
| `POST /api/auth/logout` | Clears the token cookie by setting maxAge=0 |
| `GET /api/search` | Server-side search that calls multiple Rust endpoints and merges results |

The search route exists as a Next.js route (rather than calling Rust directly) because it aggregates across ten entity types in parallel using `Promise.all` — a pattern more natural in the Next.js server environment.

### Shared UI components

All interactive UI is built from a small set of shared components in `web/components/ui/`:

| Component | Responsibility |
|---|---|
| `DataTable` | Sortable, searchable, clickable table. Accepts `columns`, `data`, `onRowClick`, `actions` |
| `SlideOver` | Right-side panel for detail views and forms |
| `ComboBox` | Searchable dropdown; supports freeform text entry |
| `Badge` | Coloured status chip |
| `Button` | Consistent button styles |
| `Card` | Content container |
| `KpiCard` | Dashboard metric tile with label and value |

---

## Database Layer

### Connection pool

SQLx maintains a pool of up to **20 PostgreSQL connections** (set in `main.rs`). Connections are checked out per-query and returned immediately. The pool is stored in `AppState` and cloned cheaply into each handler via Axum's `State` extractor.

### Compile-time query verification (SQLx offline mode)

`sqlx::query!()` and `sqlx::query_as!()` macros verify SQL syntax and column types against the actual database schema **at compile time**. This is done by generating `.sqlx/*.json` cache files that record the expected columns and types for each query.

In CI and deployment there is no database, so the build uses these cached files:

```
SQLX_OFFLINE=true cargo build   ← reads from .sqlx/ cache, no DB needed
```

When a query changes, regenerate the cache:
```
DATABASE_URL=postgres://localhost/skyhigh_mes cargo sqlx prepare --workspace
```

The `.sqlx/` directory is committed to the repository. Every query change requires a cache regeneration commit.

### Migration runner

`sqlx::migrate!("../db/migrations")` in `main.rs` runs all pending migrations automatically on startup, in filename order. This means deployments are self-migrating — no manual `sqlx migrate run` step in production.

The `_sqlx_migrations` table records which migrations have been applied and prevents re-running them.

---

## Audit Trail Architecture

Every write to 32 of the 44 tables is automatically logged. No application code is involved.

```
Handler writes to items (INSERT/UPDATE/DELETE)
        │
        ▼
PostgreSQL executes the write
        │
        ▼  AFTER trigger fires
audit_trigger_fn() runs (PL/pgSQL)
        │
        ├── reads current_setting('app.current_user_id')
        │   (set by require_auth middleware via SET LOCAL)
        │
        ├── on INSERT: writes (table_name, record_id, 'INSERT', new_data JSONB, changed_by)
        ├── on UPDATE: writes (table_name, record_id, 'UPDATE', old_data JSONB, new_data JSONB, changed_by)
        └── on DELETE: writes (table_name, record_id, 'DELETE', old_data JSONB, changed_by)
                │
                ▼
        audit_logs table
        (indexed on table_name, record_id, changed_by, changed_at)
```

The `app.current_user_id` session variable is the bridge between the stateless HTTP layer and the stateful trigger. The middleware sets it with `SET LOCAL` (transaction-scoped) rather than `SET` (session-scoped) to avoid leaking the value to subsequent requests on the same pooled connection. In practice, the connection pool uses LIFO order, so the same connection is typically reused for the same user's requests — but `SET LOCAL` is the safe default.

Tables **not** covered by the audit trigger: `audit_logs` itself, `_sqlx_migrations`, `warehouse_locations`, `artworks_2` (a draft table).

---

## Error Handling

All handler functions return `Result<T>` — a type alias for `std::result::Result<T, AppError>`.

`AppError` is an enum with `#[from]` derives for `sqlx::Error` and `jsonwebtoken::errors::Error`, so database and JWT errors propagate automatically with `?`. Application-level errors are constructed explicitly.

```
AppError variant          HTTP status    When used
─────────────────────────────────────────────────────
NotFound(String)          404            Row not found after query
Unauthorized(String)      401            Missing/invalid JWT, bad password
Forbidden(String)         403            require_role() fails
BadRequest(String)        400            Invalid input that passes JSON parsing
Conflict(String)          409            UNIQUE constraint violation (explicit)
Unprocessable(String)     422            Semantically invalid but well-formed
Database(sqlx::Error)     404 / 409 / 500  Auto-mapped:
  RowNotFound               → 404
  unique_violation          → 409
  everything else           → 500
Jwt(jwt::Error)           401            JWT decode failure
Internal(String)          500            Unexpected server-side failure
```

The `IntoResponse` implementation converts any `AppError` to a JSON body:
```json
{ "error": "descriptive message" }
```

Internal errors (`500`) log the full error with `tracing::error!` but return a generic message to the client so internal state is not leaked.

---

## Key Design Decisions

### UUIDs everywhere, no SERIAL

All primary keys are `UUID DEFAULT gen_random_uuid()` (or `uuid_generate_v4()`). No integer sequences.

**Why:** The system is designed to eventually support distributed data import (multiple factory sites or offline data entry). UUID keys can be generated without a central coordinator, so two separate databases can be merged without ID collisions. Integer sequences would collide. UUIDs also prevent enumeration attacks on REST endpoints.

### `TEXT` not PostgreSQL `ENUM` for status fields

Status values like `'draft'`, `'confirmed'`, `'in_progress'` are stored as `TEXT`, not as PostgreSQL `ENUM` types.

**Why:** Adding a new status value to a PostgreSQL ENUM requires an `ALTER TYPE` migration that locks the table. `TEXT` with application-level validation is simpler to evolve. Status values are documented in domain struct comments and enforced by the Rust API, not the database.

### No ORM — SQLx macros directly

There is no ORM (Diesel, SeaORM, etc.). All queries are written as SQL strings inside `sqlx::query!()` macros.

**Why:** SQLx gives compile-time type checking of SQL without the abstraction cost of an ORM. ERP queries are frequently complex JOINs, aggregations, and `ON CONFLICT` upserts that ORMs handle poorly. Writing SQL directly means the query in the code is exactly what runs in PostgreSQL — no translation layer to debug.

### Single `AppState`, shared via Axum `State`

All handlers receive the same `AppState { db: PgPool, jwt_secret: String }` via Axum's `State` extractor. There is no dependency injection framework.

**Why:** The state is minimal and immutable after startup. `PgPool` is already `Clone + Send + Sync` and manages its own connection lifecycle. Adding new shared state means adding a field to `AppState` and updating `main.rs` — no wiring framework needed.

### Cookie-based JWT, not `localStorage`

The JWT is stored in a cookie set by the Next.js login route, not in `localStorage`.

**Why:** `localStorage` is inaccessible to Server Components (they run on the server, not in the browser). The cookie is readable server-side by Next.js for RSC fetches, and also readable client-side by `document.cookie` for client component fetches. The cookie is `httpOnly: false` — a deliberate trade-off accepted for an internal enterprise application where the alternative (relay all API calls through Next.js) would add latency and complexity.

### `cache: 'no-store'` on all API fetches

Every `apiFetch()` call in `lib/api.ts` sets `cache: 'no-store'`.

**Why:** ERP data changes frequently and correctness matters more than performance. Stale inventory counts or order statuses would cause real operational problems. The Rust API and PostgreSQL are both local-network or same-datacenter, so fetch latency is already low.
