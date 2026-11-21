import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { embedQuery, rerank, toVectorLiteral } from "@/lib/ai/embed";

/**
 * Hybrid retrieval over published chunks (cat.chunks WHERE is_current):
 *   vector (pgvector cosine, HNSW) top N  +  keyword (Postgres FTS on
 *   context+text) top N  ->  reciprocal rank fusion  ->  Voyage rerank  ->  top k.
 *
 * Every hit carries what a citation needs: document, version, section path,
 * page range (when the source has real pages) and landscape.
 */

export type Hit = {
  chunkId: string;
  sourceKind: string;
  /** Non-document chunks: e.g. the fact-sheet slug, or "<landscape>:<row>" for interventions. */
  sourceRef: string | null;
  documentId: string | null;
  versionId: string | null;
  documentTitle: string | null;
  versionLabel: string | null;
  landscapeSlug: string | null;
  sectionPath: string | null;
  pageStart: number | null;
  pageEnd: number | null;
  kind: string;
  context: string | null;
  text: string;
  score: number; // rerank relevance, 0-1
};

const RRF_K = 60;
const rows = <T>(r: unknown) => (r as { rows: T[] }).rows;

export async function hybridSearch(opts: {
  query: string;
  landscapeSlug?: string | null;
  k?: number;
  candidates?: number;
  /** Limit to these chunk kinds (e.g. ['document','intervention'] or ['factsheet']). Omitted = all. */
  sourceKinds?: string[];
}): Promise<Hit[]> {
  const k = opts.k ?? 8;
  const n = opts.candidates ?? 40;
  const kinds = opts.sourceKinds?.length
    ? sql`AND c.source_kind IN (${sql.join(opts.sourceKinds.map((k) => sql`${k}`), sql`, `)})`
    : sql``;
  const scope = sql`${opts.landscapeSlug ? sql`AND c.landscape_slug = ${opts.landscapeSlug}` : sql``} ${kinds}`;
  const qvec = toVectorLiteral(await embedQuery(opts.query));

  const [vec, fts] = await Promise.all([
    db.transaction(async (tx) => {
      // Filtered HNSW: keep scanning until enough rows pass the WHERE clause.
      await tx.execute(sql`SET LOCAL hnsw.ef_search = 100`);
      await tx.execute(sql`SET LOCAL hnsw.iterative_scan = relaxed_order`);
      return rows<{ id: string }>(await tx.execute(sql`
        SELECT c.id FROM "cat".chunks c
        WHERE c.is_current AND c.embedding IS NOT NULL ${scope}
        ORDER BY c.embedding <=> ${qvec}::vector
        LIMIT ${n}`));
    }),
    db.execute(sql`
      SELECT c.id FROM "cat".chunks c
      WHERE c.is_current ${scope} AND c.tsv @@ websearch_to_tsquery('english', ${opts.query})
      ORDER BY ts_rank_cd(c.tsv, websearch_to_tsquery('english', ${opts.query})) DESC
      LIMIT ${n}`).then((r) => rows<{ id: string }>(r)),
  ]);

  // Reciprocal rank fusion.
  const fused = new Map<string, number>();
  vec.forEach((r, i) => fused.set(r.id, (fused.get(r.id) ?? 0) + 1 / (RRF_K + i + 1)));
  fts.forEach((r, i) => fused.set(r.id, (fused.get(r.id) ?? 0) + 1 / (RRF_K + i + 1)));
  const ids = [...fused.entries()].sort((a, b) => b[1] - a[1]).slice(0, Math.max(k * 4, 24)).map(([id]) => id);
  if (!ids.length) return [];

  const candidates = rows<Omit<Hit, "score">>(await db.execute(sql`
    SELECT c.id AS "chunkId", c.source_kind AS "sourceKind", c.source_ref AS "sourceRef", c.document_id AS "documentId", c.version_id AS "versionId",
           d.title AS "documentTitle", v.label AS "versionLabel", c.landscape_slug AS "landscapeSlug",
           s.path AS "sectionPath", c.page_start AS "pageStart", c.page_end AS "pageEnd",
           c.kind, c.context, c.text
    FROM "cat".chunks c
    LEFT JOIN "cat".documents d ON d.id = c.document_id
    LEFT JOIN "cat".document_versions v ON v.id = c.version_id
    LEFT JOIN "cat".sections s ON s.id = c.section_id
    WHERE c.id IN (${sql.join(ids.map((id) => sql`${id}::uuid`), sql`, `)}) AND c.is_current`));

  const ranked = await rerank(
    opts.query,
    candidates.map((c) => `${c.context ?? ""}\n\n${c.text}`.slice(0, 6000)),
    Math.min(k, candidates.length),
  );
  return ranked.map((r) => ({ ...candidates[r.index], score: r.score }));
}
