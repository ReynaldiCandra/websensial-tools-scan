import { rateLimit, sweepRateLimitBuckets } from "./rate-limit";

export const LANDING_COPY_REQUESTS_PER_HOUR = 5;
const LANDING_COPY_WINDOW_MS = 60 * 60 * 1000;

/**
 * Cost guard for AI copy generation. Uses the API server's existing in-memory
 * fixed-window limiter, keyed by the trusted client address from the proxy.
 * On Vercel this is per warm function instance, not a globally shared quota.
 */
export function allowLandingCopyGeneration(ip: string): { allowed: boolean; retryAfterSeconds: number } {
  sweepRateLimitBuckets();
  return rateLimit(`landing-copy:${ip}`, LANDING_COPY_REQUESTS_PER_HOUR, LANDING_COPY_WINDOW_MS);
}
