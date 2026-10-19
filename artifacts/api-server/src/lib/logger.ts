import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Logger tanpa transport (worker thread) — di serverless (Vercel), kegagalan
 * spawn worker pino tampil sebagai FUNCTION_INVOCATION_FAILED. JSON log biasa
 * cukup untuk prod maupun dev.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']",
  ],
});
