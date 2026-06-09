import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * Lightweight, durable rate limiting backed by Postgres (fixed-window).
 *
 * Serverless functions don't share memory, so an in-process limiter is useless
 * across instances. This keeps a tiny counter row per (key, ip, window) in
 * "cat".rate_limit and increments it atomically. Good enough to stop anonymous
 * abuse / cost-runaway on the public AI endpoints without an external Redis.
 */

let ensured = false;
async function ensureTable() {
  if (ensured) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "cat".rate_limit (
      bucket text PRIMARY KEY,
      count integer NOT NULL DEFAULT 0,
      expires_at timestamptz NOT NULL
    )
  `);
  ensured = true;
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export type RateLimitResult = { ok: boolean; remaining: number };

/**
 * Fixed-window limiter. Returns ok=false once `limit` requests for this
 * (key, ip) have been made within the current `windowSec` window.
 * Fails OPEN on any DB error (availability over strictness for a public site).
 */
export async function rateLimit(opts: {
  key: string;
  ip: string;
  limit: number;
  windowSec: number;
}): Promise<RateLimitResult> {
  const { key, ip, limit, windowSec } = opts;
  try {
    await ensureTable();
    const now = Math.floor(Date.now() / 1000);
    const windowIndex = Math.floor(now / windowSec);
    const bucket = `${key}:${ip}:${windowIndex}`;
    const expiresAtSec = (windowIndex + 1) * windowSec;

    const res = await db.execute(sql`
      INSERT INTO "cat".rate_limit (bucket, count, expires_at)
      VALUES (${bucket}, 1, to_timestamp(${expiresAtSec}))
      ON CONFLICT (bucket)
      DO UPDATE SET count = "cat".rate_limit.count + 1
      RETURNING count
    `);
    const count = Number((res.rows?.[0] as { count?: number } | undefined)?.count ?? 1);

    // Opportunistic cleanup of stale rows (cheap, ~1% of calls).
    if (Math.random() < 0.02) {
      await db.execute(sql`DELETE FROM "cat".rate_limit WHERE expires_at < now()`);
    }

    return { ok: count <= limit, remaining: Math.max(0, limit - count) };
  } catch {
    // Don't take the site down if the limiter table/DB hiccups.
    return { ok: true, remaining: limit };
  }
}
