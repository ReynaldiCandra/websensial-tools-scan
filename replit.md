# Agency CRM & Prospecting Tool

Platform all-in-one untuk web developer / digital agency Indonesia: temukan bisnis tanpa website di Google Maps, kelola pipeline penjualan, kirim WA outreach, generate preview website demo, dan buat invoice — semuanya dalam satu dashboard.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/agency-crm run dev` — run the frontend (port 20165)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (port 8080, path prefix `/api`)
- Frontend: React + Vite (served at `/`)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/api-client-react/src/generated/` — generated React Query hooks (do not edit)
- `lib/api-zod/src/generated/` — generated Zod schemas (do not edit)
- `lib/db/src/schema/` — Drizzle ORM table definitions (prospects, activities, templates, invoices, packages, previews)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/agency-crm/src/pages/` — React pages
- `artifacts/agency-crm/src/components/` — Shared React components

## Architecture decisions

- Contract-first API: OpenAPI spec → codegen → hooks + Zod schemas. Always edit `openapi.yaml` first, then run codegen.
- Preview websites are served as raw HTML at `/preview/:token` directly from the Express API (not the Vite frontend). Token is a 24-char hex string.
- Prospect source field: `manual` (hand-entered) or `gmaps` (imported from Prospecting Tool / CSV).
- All numeric DB fields (price, total, rating, dealValue) are stored as Postgres `numeric` → cast to `parseFloat()` before sending to client.
- The Prospecting Tool uses Overpass API (OpenStreetMap) — free, no API key required, but data coverage varies by city/category.

## Product

- **Dashboard** — Pipeline funnel counts, revenue summary, recent activity feed
- **Prospecting Tool** — Search bisnis via OpenStreetMap (15 kota, 15 kategori) + CSV import + panduan Google Maps
- **Prospects** — CRUD prospect/lead dengan filter by status, kategori, search
- **Pipeline** — Kanban view: Belum Dihubungi → Dihubungi → Demo → Deal → Invoice → Selesai
- **WA Templates** — 5 template default (Initial, Follow-up, Demo, Proposal, Closing) dengan merge variables
- **Preview Website Generator** — Generate demo website HTML untuk bisnis prospek, serve di `/preview/:token`, share via WA
- **Invoices** — Builder dengan line items, diskon, due date, status tracking
- **Packages** — Paket Entry (Rp 2.5jt), Mid (Rp 4.5jt), Premium (Rp 7.5jt)

## Deployment

### Replit (easiest — 1 click)
Use the Deploy button in Replit. Full-stack with PostgreSQL, no extra config needed.

### GitHub + Cursor
1. Connect Replit project to GitHub via **Version Control** tab (sidebar)
2. Push to GitHub
3. Clone locally: `git clone https://github.com/your-repo/agency-crm`
4. `cp .env.example .env` and fill in `DATABASE_URL`
5. `pnpm install`
6. `pnpm --filter @workspace/db run push` (run once to create tables)
7. Open in Cursor: `cursor .`

### Vercel (frontend only) + Railway (backend)
**Frontend → Vercel:**
- Set root directory: `artifacts/agency-crm`
- Build command: `pnpm run build`
- Output directory: `dist`
- Update `vercel.json` → replace `YOUR_BACKEND_URL` with your Railway URL

**Backend → Railway:**
- Connect GitHub repo
- Set root directory: `artifacts/api-server` (or use `railway.json`)
- Set env: `DATABASE_URL`, `PORT`, `NODE_ENV=production`

**Database → Neon (free PostgreSQL):**
- Create project at neon.tech
- Copy connection string → `DATABASE_URL`
- Run `pnpm --filter @workspace/db run push` once

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after changing `openapi.yaml`
- Always run `pnpm --filter @workspace/db run push` after adding/changing schema files
- Do not import `zod` directly in api-server routes — it is now a direct dep, but prefer `@workspace/api-zod` schemas when available
- Preview HTML pages are served by Express at `/preview/:token` — they are outside the Vite SPA routing
- Overpass API has a rate limit — avoid running many searches in quick succession

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
