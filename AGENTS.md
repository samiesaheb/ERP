# AGENTS.md — Skyhigh MES/ERP

Instructions for AI agents working in this repository.
Read this file fully before making any changes.

---

## Project Overview

This is a **full-stack ERP/MES** for Sky High International Co., Ltd. — a Thai cosmetics manufacturer.

- **Backend:** Rust · Axum 0.7 · SQLx 0.8 · Tokio — lives in `api/`
- **Frontend:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 — lives in `web/`
- **Database:** PostgreSQL — UUID PKs throughout, 44 tables, migrations in `api/crates/db/migrations/`
- **Deploy:** Railway (nixpacks) for the API. Frontend can be deployed separately.

---

## Dev Environment

### Start the API
```bash
# From repo root
DATABASE_URL=postgres://localhost/skyhigh_mes \
JWT_SECRET=dev-secret-change-in-production \
ALLOWED_ORIGIN=http://localhost:3000 \
PORT=8080 \
./target/release/skyhigh-api
```

Build first (always use SQLX_OFFLINE=true — see below):
```bash
SQLX_OFFLINE=true cargo build --release
```

### Start the Frontend
```bash
cd web && npm run dev   # http://localhost:3000
```

### Database
```bash
DATABASE_URL=postgres://localhost/skyhigh_mes   # in api/.env
# Migrations run automatically on API startup via sqlx::migrate!
# To run manually:
DATABASE_URL=postgres://localhost/skyhigh_mes sqlx migrate run
```

### Check everything compiles
```bash
SQLX_OFFLINE=true cargo check --quiet    # Rust — fast, no link step
cd web && npx tsc --noEmit               # TypeScript — no emit
```

---

## Critical: SQLx Offline Mode

SQLx verifies SQL queries against a live database **at compile time**. In CI and deployment there is no database, so this project uses **offline mode**.

**Rule: always build with `SQLX_OFFLINE=true`.**

When you add or change a `sqlx::query!` or `sqlx::query_as!` macro:
1. Write the query.
2. Run `DATABASE_URL=postgres://localhost/skyhigh_mes cargo sqlx prepare --workspace` — this regenerates the `.sqlx/` cache files.
3. Commit the updated `.sqlx/` files alongside your code changes.
4. The build will now work with `SQLX_OFFLINE=true`.

If you forget step 2, the build will fail in CI with "query not found in offline cache".

---

## Crate Structure

```
api/crates/
├── domain/     Shared types: request bodies, response structs, DB row types.
│               The single source of truth for all data shapes.
├── api/        Axum handlers, routes, middleware, AppState.
├── db/         SQL migrations only (no Rust code other than the migrations dir).
└── workers/    Background tasks (currently minimal).
```

**The dependency direction is one-way:** `api` depends on `domain`. Never put business logic or HTTP types in `domain` — only plain structs and `sqlx::FromRow` derives.

---

## Adding a New API Endpoint

Follow this exact pattern. Example: adding a `work_notes` table.

### 1. Add domain types (`api/crates/domain/src/<module>.rs`)
```rust
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct WorkNote {
    pub id:         Uuid,
    pub batch_id:   Uuid,
    pub note:       String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateWorkNote {
    pub batch_id: Uuid,
    pub note:     String,
}
```

Re-export from `api/crates/domain/src/lib.rs`:
```rust
pub use work_notes::{WorkNote, CreateWorkNote};
```

### 2. Write the handler (`api/crates/api/src/handlers/<module>.rs`)
```rust
use axum::{extract::{Path, State}, http::StatusCode, Json};
use uuid::Uuid;
use crate::{error::Result, state::AppState};
use domain::{WorkNote, CreateWorkNote};

pub async fn list_work_notes(
    State(state): State<AppState>,
    Path(batch_id): Path<Uuid>,
) -> Result<Json<Vec<WorkNote>>> {
    let rows = sqlx::query_as!(
        WorkNote,
        "SELECT id, batch_id, note, created_at
         FROM work_notes WHERE batch_id = $1 ORDER BY created_at",
        batch_id
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}
```

### 3. Register the module (`api/crates/api/src/handlers/mod.rs`)
```rust
pub mod work_notes;
```

### 4. Add the route (`api/crates/api/src/routes/mod.rs`)
Add inside the `protected` router:
```rust
.route("/api/v1/production/batches/:batch_id/work-notes",
    get(shop_floor::list_work_notes).post(shop_floor::create_work_note))
```

### 5. Regenerate SQLx cache
```bash
DATABASE_URL=postgres://localhost/skyhigh_mes cargo sqlx prepare --workspace
```

---

## Adding a Database Migration

Migrations live in `api/crates/db/migrations/` and are applied in filename order.

Naming convention: `NNNN_short_description.sql` — increment `NNNN` from the last file.

```sql
-- 0018_work_notes.sql
CREATE TABLE work_notes (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id   UUID        NOT NULL REFERENCES production_batches(id) ON DELETE CASCADE,
    note       TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_work_notes_batch ON work_notes(batch_id);
```

**Rules:**
- Use `UUID PRIMARY KEY DEFAULT gen_random_uuid()` on every new table.
- Use `TIMESTAMPTZ NOT NULL DEFAULT NOW()` for all timestamps — never `TIMESTAMP`.
- Use `NUMERIC(18,4)` for quantities and costs — never `FLOAT` or `REAL`.
- Use `TEXT` for open-ended strings; `VARCHAR(n)` only when there is a meaningful enforced maximum.
- Always add an index on any FK column that will be used in a `WHERE` or `JOIN`.
- Migrations are **irreversible** — never `DROP` or destructively alter existing columns in a migration. Add new columns instead.
- After adding a migration, run `DATABASE_URL=postgres://localhost/skyhigh_mes sqlx migrate run` and then `cargo sqlx prepare --workspace`.

### Audit trigger on new tables

The audit trigger is **not** automatically applied to tables created after migration `0009`. To add it to a new table:
```sql
CREATE TRIGGER audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON work_notes
FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
```
Add this at the end of your migration file.

---

## Error Handling

Use `AppError` from `api/crates/api/src/error.rs`. Return `Result<T>` (the crate-local alias) from all handlers.

```rust
// Row not found
.ok_or_else(|| AppError::NotFound(format!("WorkNote {id} not found")))?;

// Bad input
return Err(AppError::BadRequest("batch_id is required".to_string()));

// Conflict (e.g. duplicate unique key)
return Err(AppError::Conflict("A note already exists for this batch".to_string()));
```

`sqlx::Error` converts to `AppError::Database` automatically via `#[from]`. Do not wrap database errors manually.

---

## Authentication & Authorization

- **All routes under `/api/v1/`** are protected by `require_auth` middleware.
- The middleware validates the JWT `Bearer` token and injects `Claims` into request extensions.
- To read the current user in a handler:
  ```rust
  use axum::extract::Extension;
  use domain::Claims;

  pub async fn my_handler(
      State(state): State<AppState>,
      Extension(claims): Extension<Claims>,
  ) -> Result<Json<…>> {
      let user_id = claims.sub; // UUID as String
      let role    = claims.role;
      …
  }
  ```
- `Claims.role` matches the role strings in `web/lib/rbac.ts`: `admin`, `planner`, `supervisor`, `warehouse`, `qc`, `purchasing`, `sales`, `subcontractor`.
- The middleware also sets `app.current_user_id` as a PostgreSQL session variable so the audit trigger can record who made each change. Do not duplicate this logic.

---

## Audit Trail

**Do not write manual audit inserts.** The `audit_trigger_fn` PostgreSQL trigger automatically records every `INSERT`, `UPDATE`, and `DELETE` on all 32 covered tables into the `audit_logs` table, storing full JSON snapshots of the old and new row.

The `GET /api/v1/audit-logs` endpoint exposes this. Use it for history views.

---

## Frontend Patterns

### Server vs. client components
- `api/` functions in `web/lib/api.ts` are **server-side only** (used in RSC and Server Actions).
- Functions in `web/lib/client-api.ts` use `fetch` with `NEXT_PUBLIC_API_URL` and can be called from client components.
- Default to RSC (no `'use client'`). Add `'use client'` only when you need `useState`, `useEffect`, event handlers, or browser APIs.

### Shared UI components
Use these before building new ones:

| Component | Import | Purpose |
|---|---|---|
| `DataTable` | `@/components/ui/DataTable` | All tables — handles search, sort, row click, actions menu |
| `SlideOver` | `@/components/ui/SlideOver` | All detail/edit panels (slides in from the right) |
| `ComboBox` | `@/components/ui/ComboBox` | All dropdowns and selects — supports search and freeform |
| `Badge` | `@/components/ui/Badge` | Status chips |
| `Button` | `@/components/ui/Button` | All buttons |
| `Card` | `@/components/ui/Card` | Content containers |
| `KpiCard` | `@/components/ui/KpiCard` | Dashboard metric tiles |

### DataTable usage
```tsx
<DataTable
  columns={[
    { key: 'item_code', header: 'Code', sortable: true },
    { key: 'description', header: 'Description' },
    { key: 'qty_available', header: 'On Hand', render: (r) => r.qty_available.toString() },
  ]}
  data={items}
  onRowClick={(row) => setSelected(row)}
  actions={(row) => [
    { label: 'Edit', onClick: () => setEditing(row) },
  ]}
  tableId="T-01"
/>
```

### Adding a new page
1. Create `web/app/(dashboard)/<module>/page.tsx` — RSC, fetches data via `lib/api.ts`.
2. Add a sidebar link in `web/components/layout/Sidebar.tsx`.
3. Add the route to the appropriate roles in `web/lib/rbac.ts`.
4. Add the TypeScript types in `web/lib/types.ts` mirroring the Rust domain struct.

### TypeScript types
Keep `web/lib/types.ts` in sync with `api/crates/domain/src/`. Field names must match exactly (Rust uses `snake_case`; the API serializes in `snake_case`; TypeScript uses the same).

---

## RBAC — Frontend Route Guards

`web/lib/rbac.ts` is the **frontend source of truth** for which roles can see which pages. The API enforces permissions server-side via `Claims.role` — the frontend RBAC only controls UI visibility.

When adding a new page, add its path to every role that should have access. Use prefix matching — `/production` also covers `/production/batches/123`.

---

## AppState

`AppState` in `api/crates/api/src/state.rs` holds the database connection pool and JWT secret. It is injected into every handler via `State(state): State<AppState>`. Do not add global mutable state. If you need new configuration, add an env var read in `main.rs` and a new field on `AppState`.

---

## What NOT to Do

- **Do not use `FLOAT` or `REAL`** for any quantity or financial column. Use `NUMERIC`.
- **Do not use `TIMESTAMP`** (without timezone). Always use `TIMESTAMPTZ`.
- **Do not use integer sequences or `SERIAL`** for primary keys. Use `UUID DEFAULT gen_random_uuid()`.
- **Do not use `unwrap()` or `expect()`** in handler code. Propagate errors with `?`.
- **Do not write to `audit_logs` directly** from Rust code. The trigger handles it.
- **Do not hardcode UUIDs** in migrations beyond the seed data in `0002_seed.sql`.
- **Do not add business logic to the `domain` crate.** It holds types only.
- **Do not add `'use client'`** to a component unless it genuinely needs browser APIs or React hooks.
- **Do not drop or rename columns** in a migration. Add new columns; deprecate old ones in application code first.
- **Do not build without `SQLX_OFFLINE=true`** unless you are regenerating the `.sqlx/` cache.

---

## Checklist Before Committing

- [ ] `SQLX_OFFLINE=true cargo check --quiet` passes with no errors or warnings
- [ ] `cd web && npx tsc --noEmit` passes with no errors
- [ ] If SQL queries changed: `cargo sqlx prepare --workspace` run and `.sqlx/` files staged
- [ ] If a new table was added: audit trigger added in the migration
- [ ] If a new page was added: route added to `rbac.ts` for appropriate roles
- [ ] If a new domain type was added: re-exported from `domain/src/lib.rs` and added to `web/lib/types.ts`
