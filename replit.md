# Agency CRM & Prospecting Tool

Platform all-in-one untuk web developer / digital agency Indonesia: temukan bisnis tanpa website di Google Maps, kelola pipeline penjualan, kirim WA outreach, generate preview website demo, dan buat invoice — semuanya dalam satu dashboard.

## Run & Operate

- `npm run dev` (or `pnpm dev`) — run API + frontend together (ports 8080 / 20165)
- `npm run dev:api` — run the API server only (port 8080)
- `npm run dev:web` — run the frontend only (port 20165)
- `npm run typecheck` — full typecheck across all packages
- `npm run build` — typecheck + build all packages
- `npm test` — API endpoint tests (search + bulk-import; import test needs `DATABASE_URL`)
- `npm run db:push` — push DB schema changes (dev only)
- `npm --workspace @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required env: `DATABASE_URL` — Postgres connection string; `ADMIN_API_KEY` + `VITE_API_KEY` (same value) for API auth in production (see `README.md`)

Both npm and pnpm installs are supported. The local Vite server proxies `/api`
to `http://localhost:8080`, so no separate proxy is required.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (port 8080, path prefix `/api`)
- Frontend: React + Vite (served at `/`)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API auth: `ADMIN_API_KEY` (server) — semua endpoint kecuali `/healthz` menuntut header `x-api-key` / `Authorization: Bearer`. Frontend mengirim `VITE_API_KEY` sebagai `x-api-key`.
- CSV import: otomatis mendeteksi baris header dari ekspor ekstensi browser (G Maps Leads Finder, dll) dan mendupe by nomor telepon ternormalisasi + URL maps (dalam batch & terhadap database).
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
- The Prospecting Tool uses Overpass API (OpenStreetMap) first (it carries website/phone tags), then falls back to Photon/Komoot when Overpass is at capacity. Search works even if the database is down; imports and CRM pages require `DATABASE_URL`.

## Product

- **Dashboard** — Pipeline funnel counts, revenue summary, recent activity feed
- **Prospecting Tool** — Search bisnis via OpenStreetMap (20 kota, 19 kategori) + CSV import (auto-detect kolom ekspor ekstensi G Maps, dedupe otomatis) + panduan Google Maps
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

- `ADMIN_API_KEY` wajib di produksi (`NODE_ENV=production`): tanpa key, server menolak melayani endpoint CRM (fail closed, 503). Di development boleh kosong (unauthenticated + warning).
- `VITE_API_KEY` (frontend) harus sama nilainya dengan `ADMIN_API_KEY` (server).
- Karena kunci dikirim dari bundle browser (Vite), ini penghalang scanner/bot — bukan pengganti user auth penuh untuk multi-user.
- Import CSV akan skip baris duplikat (telepon ternormalisasi atau URL maps sudah ada di database/batch) dan melaporkan jumlah skip di response (`skippedDuplicatesInBatch`, `skippedExisting`, `invalidRows`, `truncated`).

- Always run `pnpm --filter @workspace/api-spec run codegen` after changing `openapi.yaml`
- Always run `pnpm --filter @workspace/db run push` after adding/changing schema files
- Do not import `zod` directly in api-server routes — it is now a direct dep, but prefer `@workspace/api-zod` schemas when available
- Preview HTML pages are served by Express at `/preview/:token` — they are outside the Vite SPA routing
- Overpass API has a rate limit — avoid running many searches in quick succession

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
