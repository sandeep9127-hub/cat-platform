import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export type RunType = "registry_crawl" | "discovery_agent" | "draft_writer" | "freshness_sweep";

/**
 * Begin an ingestion run and return helpers to update + close it.
 * Every cron handler must wrap its work in startRun so we get telemetry.
 */
export async function startRun(runType: RunType, triggeredBy: "cron" | "manual" = "cron") {
  const [row] = await db
    .insert(schema.ingestionRuns)
    .values({ runType, triggeredBy, status: "running" })
    .returning();

  let processed = 0;
  let yielded = 0;
  let costUsd = 0;
  const errors: string[] = [];

  return {
    id: row.id,
    incrementProcessed: (n = 1) => {
      processed += n;
    },
    incrementYielded: (n = 1) => {
      yielded += n;
    },
    addCost: (usd: number) => {
      costUsd += usd;
    },
    addError: (err: unknown) => {
      errors.push(err instanceof Error ? err.message : String(err));
    },
    finish: async (status: "succeeded" | "failed" | "partial" = "succeeded") => {
      await db
        .update(schema.ingestionRuns)
        .set({
          completedAt: new Date(),
          status: errors.length > 0 && status === "succeeded" ? "partial" : status,
          itemsProcessed: processed,
          itemsYielded: yielded,
          costUsd: costUsd > 0 ? costUsd : null,
          errorLog: errors.length > 0 ? errors.join("\n---\n") : null,
        })
        .where(eq(schema.ingestionRuns.id, row.id));
      return { id: row.id, processed, yielded, costUsd, errors };
    },
  };
}

/**
 * Compute a stable content hash for a fetched URL response. Strips
 * common volatile bits (timestamps, nonces in HTML attributes) before
 * hashing so that cosmetic-only changes don't trigger freshness flags.
 */
export async function contentHash(text: string): Promise<string> {
  const stripped = text
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const enc = new TextEncoder();
  const bytes = await crypto.subtle.digest("SHA-256", enc.encode(stripped));
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Polite fetch with a descriptive User-Agent (per PRODUCT.md §15).
 * Honours robots.txt is not implemented in v1; we operate from a
 * curated allowlist of source URLs that already agreed to be crawled.
 */
export async function politeFetch(url: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "user-agent":
        "CATPlatform/1.0 editorial-ingestion contact: editors@cat.org.in",
      accept: "text/html, text/plain, application/json, */*;q=0.5",
    },
    signal,
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`Fetch ${url} failed: ${res.status} ${res.statusText}`);
  }
  return await res.text();
}

/** Verify the request came from Vercel Cron (or a manual admin trigger). */
export function authoriseCronRequest(req: Request): boolean {
  // Vercel Cron sets `authorization: Bearer ${CRON_SECRET}`.
  const auth = req.headers.get("authorization");
  if (!auth) return false;
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return auth === `Bearer ${secret}`;
}
