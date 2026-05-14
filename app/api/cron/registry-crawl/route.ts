import { NextRequest, NextResponse } from "next/server";
import { and, eq, lte, sql, isNull, or } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import {
  authoriseCronRequest,
  contentHash,
  politeFetch,
  startRun,
} from "@/lib/ingestion/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Weekly registry crawler. Fetches every active source URL whose
 * `last_fetched_at + crawl_frequency_days` has passed, computes a
 * content hash, and updates the registry. When a hash changes for a
 * source that already has linked entries, a freshness flag is created
 * elsewhere by the freshness sweep; the crawler itself only updates
 * the registry. Failed sources are auto-deactivated after 3 misses
 * (not implemented in v1; flagged in error_log instead).
 */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production" && !authoriseCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const run = await startRun("registry_crawl");
  try {
    const due = await db
      .select()
      .from(schema.sourceRegistry)
      .where(
        and(
          eq(schema.sourceRegistry.isActive, true),
          or(
            isNull(schema.sourceRegistry.lastFetchedAt),
            // last_fetched_at + crawl_frequency_days <= now
            sql`(${schema.sourceRegistry.lastFetchedAt} + (${schema.sourceRegistry.crawlFrequencyDays} || ' days')::interval) <= now()`
          )
        )
      );

    for (const src of due) {
      run.incrementProcessed();
      try {
        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), 25_000);
        const text = await politeFetch(src.url, ctrl.signal);
        clearTimeout(timeout);
        const hash = await contentHash(text);
        if (hash !== src.lastContentHash) run.incrementYielded();
        await db
          .update(schema.sourceRegistry)
          .set({ lastFetchedAt: new Date(), lastContentHash: hash })
          .where(eq(schema.sourceRegistry.id, src.id));
      } catch (e) {
        run.addError(`${src.url}: ${(e as Error).message}`);
      }
    }
  } catch (e) {
    run.addError(e);
    const r = await run.finish("failed");
    return NextResponse.json(r, { status: 500 });
  }

  const summary = await run.finish();
  return NextResponse.json(summary);
}

// Manual trigger for admins (same handler, no auth bypass in prod).
export const POST = GET;
