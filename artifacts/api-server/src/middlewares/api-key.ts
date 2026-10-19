import type { NextFunction, Request, Response } from "express";
import crypto from "node:crypto";
import { logger } from "../lib/logger";
import { SESSION_COOKIE, verifySessionToken } from "../lib/session";

/** Returned once per process so dev logs are not spammed. */
let warnedMissingKey = false;

function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Public route that must stay reachable without an API key: the prospect demo
 * share link `/preview/:token` (24-char hex token) sent to business owners via
 * WhatsApp. Everything else stays gated.
 */
function isPublicShareLink(req: Request): boolean {
  if (req.method !== "GET") return false;
  return /^\/(api\/)?preview\/[0-9a-fA-F]{24}$/.test(req.path);
}

/**
 * Auth gate for every API route except /healthz.
 *
 * Behaviour:
 * - `ADMIN_API_KEY` set      → requests must send `x-api-key: <key>` or
 *   `Authorization: Bearer <key>`; otherwise 401.
 * - `ADMIN_API_KEY` unset    → dev convenience: request allowed, but a warning
 *   is logged. In production (`NODE_ENV=production`) the server refuses to
 *   serve instead of leaking CRM data (fail closed).
 * - Exception: GET `/preview/:token` (prospect demo share link) stays public.
 */
export function requireApiKey(req: Request, res: Response, next: NextFunction): Response | void {
  if (isPublicShareLink(req)) return next();

  // Browser sessions take precedence: the UI never holds an API key anymore.
  if (verifySessionToken(req.cookies?.[SESSION_COOKIE])) return next();

  const expected = process.env.ADMIN_API_KEY?.trim();

  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      return res.status(503).json({
        error:
          "Server is not configured: ADMIN_API_KEY is missing, refusing to serve CRM endpoints unauthenticated. Set ADMIN_API_KEY in the environment.",
      });
    }
    if (!warnedMissingKey) {
      warnedMissingKey = true;
      logger.warn(
        "ADMIN_API_KEY is not set — API runs unauthenticated (allowed in development only). Set ADMIN_API_KEY before deploying.",
      );
    }
    return next();
  }

  const headerKey = req.header("x-api-key");
  const authHeader = req.header("authorization");
  const bearerKey =
    authHeader && authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice("bearer ".length).trim() : null;
  const provided = headerKey ?? bearerKey;

  if (!provided || !timingSafeEqualStrings(provided, expected)) {
    return res.status(401).json({ error: "Unauthorized: missing or invalid API key." });
  }

  return next();
}
