import type { Request } from "express";

/**
 * Small in-memory fixed-window limiter.
 *
 * Serverless instances are short-lived, so this is not a global quota — it is
 * a guard against double clicks, runaway scripts, and password brute force.
 * The real credit protection is the login session.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Client address used as the rate-limit bucket key.
 *
 * `x-forwarded-for` can be prepended by the caller, so the left-most entry is
 * attacker-controlled: sending a new fake IP per attempt would reset the login
 * bucket every time. The trusted proxy (Vercel) appends the address it actually
 * saw, so the right-most entry is the one to trust.
 */
export function clientIp(req: Request): string {
  const realIp = req.header("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwarded = req.header("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded.split(",").map((hop) => hop.trim()).filter(Boolean);
    const nearestProxy = hops[hops.length - 1];
    if (nearestProxy) return nearestProxy;
  }

  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

/** Keeps the map from growing without bound on a long-lived instance. */
export function sweepRateLimitBuckets(now = Date.now()): void {
  if (buckets.size < 500) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}
