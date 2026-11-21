/**
 * Keep the fact sheet search index (cat.chunks, source_kind 'factsheet') in
 * step with what's published. Best-effort: a failed embed never fails the edit
 * that triggered it; the nightly sync rebuilds the index anyway.
 */
export async function reindexFactsheets(reason: string): Promise<void> {
  try {
    const { indexFactsheets } = await import("@/lib/ingest/factsheet-chunks");
    const n = await indexFactsheets();
    console.log(`[factsheets] search index rebuilt (${n} sheets) after ${reason}`);
  } catch (e) {
    console.error(`[factsheets] search index rebuild failed after ${reason}:`, (e as Error).message);
  }
}

/** Rebuild after the response is sent, so editors don't wait for embeddings. */
export async function reindexFactsheetsAfterResponse(reason: string): Promise<void> {
  const { after } = await import("next/server");
  after(() => reindexFactsheets(reason));
}
