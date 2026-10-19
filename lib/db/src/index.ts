import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

export const isDatabaseConfigured = Boolean(connectionString);

// Do not throw at import time. A missing DATABASE_URL used to crash the whole
// serverless function (Vercel returns a plain-text "A server error..." page),
// which also broke features that do not need the database, like prospecting
// search. Instead, point the pool at a deliberately invalid address so queries
// fail quickly with a normal, catchable connection error.
export const pool = new Pool(
  connectionString
    ? {
        connectionString,
        max: 5,
        connectionTimeoutMillis: 5_000,
        idleTimeoutMillis: 30_000,
      }
    : {
        connectionString: "postgresql://invalid:invalid@127.0.0.1:1/invalid",
        max: 1,
        connectionTimeoutMillis: 1_000,
      },
);

// Idle clients can emit errors (for example when a hosted database is paused).
// Without a listener Node treats that as an unhandled error and kills the
// process, so keep it as a log instead.
pool.on("error", (err) => {
  console.error("[db] Unexpected PostgreSQL pool error:", err.message);
});

export const db = drizzle(pool, { schema });

export * from "./schema";
