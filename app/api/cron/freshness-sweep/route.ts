import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { and, eq, isNotNull, sql } from "drizzle-orm";
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
 * Weekly freshness sweep. For every published entry that has a source URL
 * recorded in external_links, re-fetch the source, fingerprint its visible
 * text, and compare with the last fingerprint (cat.source_snapshots). The first
 * visit only records a baseline. A real change creates a FreshnessFlag for an
 * editor to review; the entry stays published (a changed source is a prompt to
 * check, not proof the entry is wrong).
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
        // Fingerprint the visible text only, so scripts, styles and markup churn don't count.
        const visible = text
          .replace(/<script[\s\S]*?<\/script>/gi, " ")
          .replace(/<style[\s\S]*?<\/style>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/&[a-z#0-9]+;/gi, " ")
          .replace(/\s+/g, " ")
          .trim();
        const hash = await contentHash(visible);

        const prev = (await db.execute(sql`
          SELECT hash FROM "cat".source_snapshots WHERE entry_id = ${e.id} AND url = ${link.url}`) as unknown as {
          rows: { hash: string }[];
        }).rows[0];
        await db.execute(sql`
          INSERT INTO "cat".source_snapshots (entry_id, url, hash, checked_at, changed_at)
          VALUES (${e.id}, ${link.url}, ${hash}, now(), NULL)
          ON CONFLICT (entry_id, url) DO UPDATE SET hash = EXCLUDED.hash, checked_at = now(),
            changed_at = CASE WHEN "cat".source_snapshots.hash <> EXCLUDED.hash THEN now() ELSE "cat".source_snapshots.changed_at END`);

        if (prev && prev.hash !== hash) {
          await db.insert(schema.freshnessFlags).values({
            entryId: e.id,
            detectedInRunId: run.id,
            sourceUrl: link.url,
            diffSummary: `Source page changed since the last weekly check (${new Date().toISOString().slice(0, 10)}).`,
            status: "pending_review",
          });
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
