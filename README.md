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
  when no database is configured; it needs permission to `CREATE DATABASE` on
  that server. Set `TEST_DATABASE_URL` to run it against a local/throwaway
  Postgres instead of the app database. Connection drops from a hosted pooler
  (some resolved IPs refuse connections) are retried automatically.

## Prospecting search

When `SERPER_API_KEY` is set, the search endpoint pulls real Google Maps
business data (name, rating, review count, phone, website) from Serper. If
`SERPER_API_KEY` is missing or Serper fails, `OUTSCRAPER_API_KEY` is tried, and
the endpoint finally falls back to OpenStreetMap: Overpass API first (it
includes website/phone tags), then Photon (Komoot) when Overpass is at
capacity. Results from Photon do not include website/phone tags, so every
result is marked as "belum ada website"; Overpass results are more accurate.

Google Maps results are cached for 24 hours so repeated clicks on the same
city + category do not consume provider credits.

Search **works even when the database is unavailable**. Saving prospects,
importing to the pipeline, and the CRM pages require `DATABASE_URL`.

If you see an error in the Search tab:

- `Database belum terhubung` — set `DATABASE_URL` in `.env.local` and restart.
- `Sumber data OpenStreetMap sedang sibuk` — both Overpass and Photon failed;
  retry in a minute or use the **Import CSV** tab.

## Deploy to Vercel

1. Push the repo to GitHub and import it in Vercel.
2. Add these environment variables in **Project → Settings → Environment
   Variables** (Production and Preview): `DATABASE_URL`, `ADMIN_API_KEY`,
   `VITE_API_KEY`, and `SERPER_API_KEY`. `VITE_API_KEY` must match
   `ADMIN_API_KEY`; it is embedded at build time, so redeploy after changing it.
   `SERPER_API_KEY` enables Google Maps data (rating, phone, website) and needs
   no credit card (2,500 free queries at https://serper.dev). `OUTSCRAPER_API_KEY`
   is still accepted as a fallback; without either key the search uses
   OpenStreetMap.
3. Deploy. `vercel.json` builds the frontend and bundles
   `artifacts/api-server/src/vercel.ts` into `api/_bundle.mjs` with
   `scripts/build-api-function.mjs`. `api/index.js` is the small Vercel function
   entry that re-exports that bundle. Because Overpass can be slow, set the
   function's max duration in the Vercel dashboard if the default is too short.
4. Run `npm run db:push` locally once against the production database.

## Project layout

- `artifacts/agency-crm` — React + Vite frontend
- `artifacts/api-server` — Express API (mounted at `/api`)
- `lib/db` — Drizzle schema and database connection
- `lib/api-client-react` / `lib/api-zod` — generated API client and schemas
- `scripts` — utility scripts
