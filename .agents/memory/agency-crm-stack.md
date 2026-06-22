---
name: Agency CRM stack decisions
description: Non-obvious constraints and decisions for the Agency CRM & Prospecting Tool monorepo
---

# Agency CRM — Key Decisions & Gotchas

## Numeric DB fields
Drizzle `numeric()` columns (price, total, rating, dealValue, subtotal, discount) come back as strings from pg driver. Always `parseFloat(row.field)` before sending to client. Failure to do this breaks frontend number formatting.

**Why:** Drizzle-orm with the `pg` driver preserves NUMERIC precision as strings to avoid JS float loss.

**How to apply:** In every route that selects from invoices, packages, or prospects, map the row and parseFloat all numeric columns before `res.json()`.

## Zod in api-server
`zod` must be declared as a direct `dependency` in `artifacts/api-server/package.json` (not just via `@workspace/api-zod`). esbuild cannot resolve workspace transitive deps at bundle time.

**Why:** esbuild bundles only direct deps; workspace peer resolution doesn't work at build time.

**How to apply:** Add `"zod": "catalog:"` to api-server dependencies whenever a new route needs it directly.

## Preview HTML pages
Website previews are served as raw HTML by Express at `/preview/:token`. They are NOT part of the Vite SPA. The route lives in `artifacts/api-server/src/routes/previews.ts`. The shared proxy routes `/preview/*` to the API server (port 8080).

**Why:** Previews must be shareable public URLs that render without the React app loaded — a business owner clicking the link should see a styled page immediately.

**How to apply:** Never add `/preview` routes to the Vite router. Always serve them from Express.

## Prospecting Tool data source
Uses Overpass API (OpenStreetMap) — free, no API key. Data quality varies by city/category. Indonesian cities have moderate OSM coverage for restaurants/cafes but sparse for niche categories. CSV import is the reliable fallback.

## OpenAPI codegen
Always edit `lib/api-spec/openapi.yaml` first, then run `pnpm --filter @workspace/api-spec run codegen`. Generated files in `lib/api-client-react/` and `lib/api-zod/` must never be edited manually.
