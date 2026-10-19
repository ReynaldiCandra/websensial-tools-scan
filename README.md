# Websensial — Agency CRM & Prospecting Tool

React + Vite frontend, Express API, PostgreSQL + Drizzle ORM.

## Requirements

- Node.js **24** (Node 22.9+ also works)
- npm **or** pnpm
- A PostgreSQL database (Neon, Supabase, Railway, etc.)

## 1. Install

Both package managers are supported:

```bash
npm install
# or
pnpm install
```

The old `preinstall` guard that rejected npm has been removed. Workspace
packages use `file:` dependencies so npm can link them too.

If this checkout already has a pnpm-managed `node_modules`, npm can fail while
reading pnpm's internal `.pnpm` folder. Clean it first, then install:

```bash
npm run clean
npm install
```

## 2. Configure the database

Copy the example env file and fill in a **working** connection string:

```bash
cp .env.example .env.local
```

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
PORT=8080
```

Free PostgreSQL options: [Neon](https://neon.tech) or [Supabase](https://supabase.com).
If your provider requires SSL, append `?sslmode=require`.

Then create the tables once:

```bash
npm run db:push
# or: pnpm --filter @workspace/db run push
```

> `.env.local` is gitignored. This checkout is already configured with a Neon
> database; a fresh clone needs its own connection string.

## 3. Run

```bash
npm run dev
```

- Web app: http://localhost:20165
- API: http://localhost:8080
- Vite proxies `/api` to the API server automatically.

You can also run them separately:

```bash
npm run dev:api
npm run dev:web
```

## Build / typecheck / test

```bash
npm run typecheck
npm run build
npm test
```

`npm test` runs the API endpoint tests:

- **Prospecting search** — Overpass success, website filtering, Photon fallback
  on plain-text/HTML errors, and JSON error handling when both sources fail.
  These run without a database.
- **Bulk import** — creates a temporary database, imports prospects, verifies
  the pipeline row, and drops the database afterwards. Skipped automatically
  when `DATABASE_URL` is not available; it needs permission to `CREATE DATABASE`
  on the configured PostgreSQL server.

## Prospecting search

The search endpoint tries Overpass API first (it includes website/phone tags)
and falls back to Photon (Komoot) when Overpass is at capacity. Results from
Photon do not include website/phone tags, so every result is marked as
"belum ada website"; Overpass results are more accurate.

Search **works even when the database is unavailable**. Saving prospects,
importing to the pipeline, and the CRM pages require `DATABASE_URL`.

If you see an error in the Search tab:

- `Database belum terhubung` — set `DATABASE_URL` in `.env.local` and restart.
- `Sumber data OpenStreetMap sedang sibuk` — both Overpass and Photon failed;
  retry in a minute or use the **Import CSV** tab.

## Deploy to Vercel

1. Push the repo to GitHub and import it in Vercel.
2. Add these environment variables in **Project → Settings → Environment
   Variables** (Production and Preview): `DATABASE_URL`, `ADMIN_API_KEY`, and
   `VITE_API_KEY`. `VITE_API_KEY` must match `ADMIN_API_KEY`; it is embedded at
   build time, so redeploy after changing it.
3. Deploy. `vercel.json` builds the frontend and bundles `api/index.ts` into
   `api/index.mjs` with `scripts/build-api-function.mjs`. Because Overpass can
   be slow, set the function's max duration in the Vercel dashboard if the
   default is too short.
4. Run `npm run db:push` locally once against the production database.

## Project layout

- `artifacts/agency-crm` — React + Vite frontend
- `artifacts/api-server` — Express API (mounted at `/api`)
- `lib/db` — Drizzle schema and database connection
- `lib/api-client-react` / `lib/api-zod` — generated API client and schemas
- `scripts` — utility scripts
