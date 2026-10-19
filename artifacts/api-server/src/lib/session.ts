import crypto from "node:crypto";

/**
 * Cookie-based sessions for the CRM UI.
 *
 * The UI used to ship `VITE_API_KEY` inside the JS bundle, which meant anyone
 * who opened the site could extract the key and read every prospect. Login now
 * exchanges a password for a signed, httpOnly cookie so the key never reaches
 * the browser. `ADMIN_API_KEY` stays valid for scripts/tests.
 */

export const SESSION_COOKIE = "ws_session";
export const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 hari

/** Password login uses AUTH_PASSWORD, falling back to ADMIN_API_KEY. */
function loginPassword(): string | null {
  return process.env.AUTH_PASSWORD?.trim() || process.env.ADMIN_API_KEY?.trim() || null;
}

/** HMAC key: SESSION_SECRET when set, otherwise the admin key. */
function signingKey(): string | null {
  return process.env.SESSION_SECRET?.trim() || process.env.ADMIN_API_KEY?.trim() || null;
}

export function isLoginConfigured(): boolean {
  return loginPassword() !== null;
}

function sign(value: string, key: string): string {
  return crypto.createHmac("sha256", key).update(value).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

export function verifyPassword(candidate: string): boolean {
  const expected = loginPassword();
  if (!expected) return false;
  return safeEqual(candidate, expected);
}

export function createSessionToken(now = Date.now()): string {
  const key = signingKey();
  if (!key) throw new Error("SESSION_SECRET/ADMIN_API_KEY is not configured");

  const expiresAt = now + SESSION_MAX_AGE_MS;
  return `${expiresAt}.${sign(String(expiresAt), key)}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;

  const key = signingKey();
  if (!key) return false;

  const [expiresRaw, signature] = token.split(".");
  if (!expiresRaw || !signature) return false;

  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  return safeEqual(signature, sign(expiresRaw, key));
}
