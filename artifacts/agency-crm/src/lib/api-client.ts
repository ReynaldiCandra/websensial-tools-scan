/**
 * Thin wrapper around fetch that attaches the CRM API key to every request.
 *
 * The key is compiled into the bundle from `VITE_API_KEY` (same value as the
 * server's `ADMIN_API_KEY`). For a single-operator internal CRM this blocks
 * scanners/bots; it is not a substitute for real user auth if the tool is
 * ever exposed to a team.
 */
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const apiKey = import.meta.env.VITE_API_KEY;
  if (apiKey && !headers.has("x-api-key")) {
    headers.set("x-api-key", String(apiKey));
  }
  return fetch(`${BASE}${path.startsWith("/") ? path : `/${path}`}`, { ...init, headers });
}
