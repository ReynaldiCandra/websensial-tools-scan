/**
 * Thin wrapper around fetch for the CRM API.
 *
 * Authentication is a httpOnly session cookie issued by `POST /api/auth/login`,
 * so no API key is bundled into the frontend. `credentials: "same-origin"`
 * makes the cookie travel with every request (including on preview deploys,
 * which are same-origin with their own API function).
 */
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${BASE}${path.startsWith("/") ? path : `/${path}`}`, {
    credentials: "same-origin",
    ...init,
  });
}
