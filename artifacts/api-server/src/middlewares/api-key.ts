import type { NextFunction, Request, Response } from "express";
import crypto from "node:crypto";
import { logger } from "../lib/logger";

/** Returned once per process so dev logs are not spammed. */
let warnedMissingKey = false;

function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
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
 */
export function requireApiKey(req: Request, res: Response, next: NextFunction): Response | void {
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
