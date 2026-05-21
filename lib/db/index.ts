import dns from "node:dns";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * Supabase free-tier direct DB endpoints are IPv6-only. Node defaults to
 * IPv4-first DNS resolution and falls back to no result; this forces the
 * resolver to return whatever the host has (IPv6 in this case).
 */
dns.setDefaultResultOrder("verbatim");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

/**
 * Cache the pg Pool across HMR reloads so we don't exhaust the database
 * connection slots. The cat_user role has limited connections; Next.js
 * re-evaluating server modules on every change otherwise leaks pools.
 */
const globalForPg = globalThis as unknown as {
  pgPool?: Pool;
};

// pg lets the connection string's `sslmode` override the programmatic ssl
// config; strip it so our { rejectUnauthorized: false } takes effect.
const cleanedUrl = connectionString.replace(/[?&]sslmode=[^&]+/g, "");

/**
 * On Vercel each serverless lambda re-evaluates this module on cold start
 * and reuses it on warm invocations. The pool would normally accumulate
 * across cold starts and saturate Supabase's session pooler
 * (EMAXCONNSESSION: max client connections reached) once 20-30 lambdas
 * are warm at once. Two guardrails:
 *
 *   - max: 1 — a single lambda invocation is single-threaded, so one
 *     connection is enough. Concurrent invocations get their own
 *     lambda (and their own pool of 1) rather than competing for slots.
 *   - Cache via globalThis in ALL environments (not just dev), so that
 *     repeated module evaluations within a single lambda runtime never
 *     leak a second pool.
 */
const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString: cleanedUrl,
    max: 1,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 8_000,
    // Supabase Postgres requires TLS but presents a self-signed cert at the
    // direct endpoint; reject-unauthorized=false is the documented setting.
    ssl: { rejectUnauthorized: false },
  });

globalForPg.pgPool = pool;

export const db = drizzle(pool, { schema });
export { schema };
