import { config } from "dotenv";

/**
 * Score retrieval against the test set (cat.eval_questions), CAT database only.
 * For each active question: hybrid search over reports and budget rows (as Ask v2
 * does, across all landscapes), then
 *   hit@k   = the expected document and page (±1) appear in the top k
 *   refusal = for off-topic questions, the top rerank score is below Ask's floor
 * The run is stored in cat.eval_runs / eval_results and shown on /admin/quality.
 * Costs only Voyage queries (free tier).
 *
 *   npx tsx scripts/run-eval.ts [--label="..."]
 */
config({ path: ".env.local", quiet: true });
if (process.env.DATABASE_URL_CAT) process.env.DATABASE_URL = process.env.DATABASE_URL_CAT;

type Q = {
  id: string; question: string; should_refuse: boolean;
  expected_sources: { document_id: string; page_start: number; page_end: number }[];
};

(async () => {
  const { db } = await import("../lib/db");
  const { sql } = await import("drizzle-orm");
  const { hybridSearch } = await import("../lib/rag/search");
  const { REFUSAL_FLOOR } = await import("../lib/ask/shared");
  const label = process.argv.find((a) => a.startsWith("--label="))?.slice(8) ?? `run ${new Date().toISOString().slice(0, 16)}`;

  const qs = (await db.execute(sql`
    SELECT id, question, expected_sources, should_refuse FROM "cat".eval_questions WHERE active ORDER BY created_at`)).rows as Q[];
  const run = (await db.execute(sql`
    INSERT INTO "cat".eval_runs (label, config)
    VALUES (${label}, ${JSON.stringify({ k: 10, refusalFloor: REFUSAL_FLOOR, sourceKinds: ["document", "intervention"] })}::jsonb)
    RETURNING id`)).rows[0] as { id: string };

  let answerable = 0, h1 = 0, h5 = 0, h10 = 0, rr = 0, refuseOk = 0, refuseN = 0, falseRefusals = 0;
  const misses: string[] = [];
  for (const q of qs) {
    const hits = await hybridSearch({ query: q.question, k: 10, sourceKinds: ["document", "intervention"] });
    const top = hits[0]?.score ?? 0;
    let rank: number | null = null;
    if (!q.should_refuse) {
      answerable++;
      const i = hits.findIndex((h) => q.expected_sources.some((e) =>
        h.documentId === e.document_id && h.pageStart !== null
        && h.pageStart <= e.page_end + 1 && (h.pageEnd ?? h.pageStart) >= e.page_start - 1));
      rank = i >= 0 ? i + 1 : null;
      if (rank === 1) h1++;
      if (rank && rank <= 5) h5++;
      if (rank) { h10++; rr += 1 / rank; } else misses.push(q.question);
      if (top < REFUSAL_FLOOR) falseRefusals++;
    } else {
      refuseN++;
      if (top < REFUSAL_FLOOR) refuseOk++;
    }
    await db.execute(sql`
      INSERT INTO "cat".eval_results (run_id, question_id, retrieved, scores)
      VALUES (${run.id}::uuid, ${q.id}::uuid,
              ${JSON.stringify(hits.map((h) => ({ chunk: h.chunkId, doc: h.documentId, page: h.pageStart, score: Number(h.score.toFixed(3)) })))}::jsonb,
              ${JSON.stringify({ rank, top: Number(top.toFixed(3)) })}::jsonb)`);
  }
  const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : null);
  const scores = {
    questions: qs.length, answerable,
    hit1: pct(h1, answerable), hit5: pct(h5, answerable), hit10: pct(h10, answerable),
    mrr: answerable ? Number((rr / answerable).toFixed(3)) : null,
    offTopic: refuseN, refusalCorrect: pct(refuseOk, refuseN),
    falseRefusals,
  };
  await db.execute(sql`UPDATE "cat".eval_runs SET scores = ${JSON.stringify(scores)}::jsonb, finished_at = now(), cost_usd = 0 WHERE id = ${run.id}::uuid`);
  console.log(scores);
  if (misses.length) console.log("Not found in the top 10:\n" + misses.map((m) => `  - ${m}`).join("\n"));
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
