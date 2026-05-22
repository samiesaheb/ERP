# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Skyhigh MES/ERP — a manufacturing execution and enterprise resource planning system for Sky High International Co., Ltd. (cosmetics manufacturer, Thailand). Covers the full production lifecycle: sales orders, formulations, BOM, procurement, inventory, manufacturing, shop floor, shipments, and finance.

## Commands

### API (Rust — run from `api/`)

```bash
# Dev run (with live DB)
DATABASE_URL=postgres://localhost/skyhigh_mes JWT_SECRET=dev-secret ALLOWED_ORIGIN=http://localhost:3000 PORT=8080 cargo run

# Check compile without DB (offline mode — reads .sqlx/ cache)
SQLX_OFFLINE=true cargo check

# Build release offline
SQLX_OFFLINE=true cargo build --release

# Regenerate SQLx query cache after changing any sqlx::query!() call
DATABASE_URL=postgres://localhost/skyhigh_mes cargo sqlx prepare --workspace

# Run pending migrations manually
DATABASE_URL=postgres://localhost/skyhigh_mes sqlx migrate run
```

> Migrations also run automatically on API startup — no manual step needed in dev.

### Frontend (Next.js — run from `web/`)

```bash
npm run dev      # http://localhost:3000
npm run build
npx tsc --noEmit # type-check only
```

### Database setup (first time)

```bash
createdb skyhigh_mes
psql skyhigh_mes -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
```

## Architecture

### System topology

```
Browser → Next.js (port 3000) → Rust API (port 8080) → PostgreSQL
```

The browser **never** calls the Rust API directly — all traffic goes through Next.js. The one exception is client components, which call `NEXT_PUBLIC_API_URL` directly with a JWT Bearer token read from the cookie.

Three Next.js API routes exist (everything else is Rust):
- `POST /api/auth/login` — proxies to Rust, sets JWT cookie
- `POST /api/auth/logout` — clears cookie
- `GET /api/search` — aggregates ten Rust search endpoints in parallel

### Rust crate structure

```
api/crates/
├── domain/    Types only — structs, request/response bodies, sqlx::FromRow derives
├── api/       Axum handlers, routes, middleware, app state
├── db/        SQL migrations only (no Rust code); sqlx::migrate! points here
└── workers/   Background Tokio tasks (stub)
```

`domain` is depended on by `api`. `db` has no Rust code. Dependencies flow one way only.

**`api` internal layout:**
- `main.rs` — env, tracing, DB pool, migrations, CORS, server
- `state.rs` — `AppState { db: PgPool, jwt_secret, google_* }`
- `error.rs` — `AppError` enum → HTTP status + `{ "error": "..." }` JSON
- `routes/mod.rs` — all route registrations in one file
- `handlers/` — one file per domain area (auth, masters, sales, formulation, bom, procurement, inventory, locations, production, shop_floor, shipments, finance, search, dashboard, audit)
- `middleware/auth.rs` — JWT validation + injects `Claims` into request extensions + sets `app.current_user_id` session var
- `middleware/rbac.rs` — `require_role(&claims, ALLOWED_ROLES)?` + role constant groups

### Frontend patterns

Every page follows this split:
- `page.tsx` — React Server Component, fetches all data using `lib/api.ts`, passes as props
- `*Client.tsx` — `'use client'` component, owns UI state (selected row, slide-over open, form handlers)

Two API modules — **never mix them**:
- `lib/api.ts` — server-side only; uses `process.env.API_URL` + `next/headers cookies()`
- `lib/client-api.ts` — browser-safe; uses `NEXT_PUBLIC_API_URL` + `document.cookie`

All authenticated pages live in `web/app/(dashboard)/` (route group — no URL segment added).

### Authentication

JWT stored in a cookie (`httpOnly: false` — deliberate, needed for client components to read it for the `Authorization: Bearer` header). Cookie set by Next.js login route handler; validated by Rust `require_auth` middleware on every protected request.

JWT `Claims` fields: `sub` (user UUID), `email`, `full_name`, `role`, `iat`, `exp` (24h).

Role enforcement has two layers:
1. **Frontend** — `web/lib/rbac.ts` `ROLE_ACCESS` map controls sidebar links and UI visibility (UX only)
2. **API** — `require_role(&claims, ROLES)?` at top of write handlers (actual security boundary)

Most `GET` endpoints do not call `require_role`. Write endpoints do.

### Database

- All PKs are `UUID` (`gen_random_uuid()` / `uuid_generate_v4()`). No integer sequences.
- Status fields use `TEXT` not PostgreSQL `ENUM` (avoids `ALTER TYPE` table locks).
- No ORM — all queries use `sqlx::query!()` / `sqlx::query_as!()` macros with compile-time SQL verification.
- Pool max: 20 connections.
- **Audit trail**: an `AFTER INSERT/UPDATE/DELETE` trigger fires on 32 of 44 tables, writes a JSONB snapshot to `audit_logs`. The middleware sets `app.current_user_id` via `SET LOCAL` (transaction-scoped) so triggers can attribute writes to a user.

### SQLx offline mode

`sqlx::query!()` macros verify SQL against the DB at **compile time** using cached `.sqlx/*.json` files. When there is no DB available (CI, deployment):

```bash
SQLX_OFFLINE=true cargo build
```

After changing any query, regenerate the cache and commit the updated `.sqlx/` files:

```bash
DATABASE_URL=postgres://localhost/skyhigh_mes cargo sqlx prepare --workspace
```

### env vars

**`api/.env`**
```
DATABASE_URL=postgres://localhost/skyhigh_mes
JWT_SECRET=<secret>
ALLOWED_ORIGIN=http://localhost:3000
# Optional Google OAuth:
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:8080/auth/google/callback
FRONTEND_URL=http://localhost:3000
```

**`web/.env.local`**
```
NEXT_PUBLIC_API_URL=http://localhost:8080
API_URL=http://localhost:8080
```

## Important notes for Next.js

This project uses **Next.js 16 with React 19**. APIs, conventions, and file structure may differ from earlier versions. Check `node_modules/next/dist/docs/` before writing Next.js-specific code.

## Deployment

Railway (nixpacks). Migrations run automatically on startup. `SQLX_OFFLINE=true` must be set in the Railway build environment so the Rust build does not require a DB connection at compile time.
