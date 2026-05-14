import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { and, eq, isNotNull } from "drizzle-orm";
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
 * Daily freshness sweep. For every published entry that has a source URL
 * recorded in external_links, re-fetch the source, hash it, and compare
 * against the last seen hash. If changed, mark the entry as needs_update
 * and create a FreshnessFlag for the editor to triage.
 *
 * In v1 we look at the first external_link as the canonical source. The
 * AI draft writer fills source_passages with proper provenance; richer
 * freshness diffing comes when those are populated.
 */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production" && !authoriseCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const run = await startRun("freshness_sweep");

  try {
    const entries = await db
      .select({
        id: schema.entries.id,
        slug: schema.entries.slug,
        title: schema.entries.title,
        externalLinks: schema.entries.externalLinks,
        editorialStatus: schema.entries.editorialStatus,
      })
      .from(schema.entries)
      .where(
        and(
          eq(schema.entries.editorialStatus, "published"),
          isNotNull(schema.entries.externalLinks)
        )
      );

    for (const e of entries) {
      run.incrementProcessed();
      const link = (e.externalLinks ?? [])[0];
      if (!link?.url) continue;

      try {
        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), 25_000);
        const text = await politeFetch(link.url, ctrl.signal);
        clearTimeout(timeout);
        const hash = await contentHash(text);

        // Compare against most recent freshness flag for the same source
        const [last] = await db
          .select()
          .from(schema.freshnessFlags)
          .where(eq(schema.freshnessFlags.entryId, e.id))
          .limit(1);

        if (!last || last.diffSummary !== hash) {
          await db.insert(schema.freshnessFlags).values({
            entryId: e.id,
            detectedInRunId: run.id,
            sourceUrl: link.url,
            diffSummary: `Source content hash changed: ${hash.slice(0, 12)}…`,
            status: "pending_review",
          });
          await db
            .update(schema.entries)
            .set({
              editorialStatus: "needs_update",
              needsUpdateReason: `Source updated. Last sweep: ${new Date().toISOString().slice(0, 10)}.`,
            })
            .where(eq(schema.entries.id, e.id));
          run.incrementYielded();
        }
      } catch (err) {
        run.addError(`${e.slug}: ${(err as Error).message}`);
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

export const POST = GET;
