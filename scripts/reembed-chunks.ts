import { config } from "dotenv";
import { Client } from "pg";

/**
 * Re-embed every stored chunk with the current embedding model (lib/ai/embed.ts).
 *
 * Needed because NVIDIA retired nv-embedqa-e5-v5 on 2026-08-25: query vectors
 * from a new model can't be compared with the old stored vectors. While here,
 * strips base64 images that DOCX conversion left inside chunk_text (they made
 * up ~94% of stored characters) and deletes chunks that were only an image.
 *
 * Resumable: rows already carrying the current embedding_model are skipped.
 * Targets the RAG-upgrade Neon branch unless --prod is passed.
 *
 *   npx tsx scripts/reembed-chunks.ts
 *   npx tsx scripts/reembed-chunks.ts --prod
 */
config({ path: ".env.local", quiet: true });

const PAGE = 128;
const MIN_CHARS = 20;

function clean(text: string): string {
  return text
    .replace(/!?\[[^\]]*\]\(data:image\/[^)]*\)/g, "") // markdown image with inline base64
    .replace(/data:image\/[a-z+]+;base64,[A-Za-z0-9+/=]+/g, "") // bare base64 leftovers
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function main() {
  const prod = process.argv.includes("--prod");
  const url = prod ? process.env.DATABASE_URL : process.env.DATABASE_URL_RAG;
  if (!url) throw new Error(prod ? "DATABASE_URL is not set" : "DATABASE_URL_RAG is not set");
  const { embedDocuments, toVectorLiteral, EMBED_MODEL, embeddingsEnabled } = await import("../lib/ai/embed");
  if (!embeddingsEnabled()) throw new Error("VOYAGE_API_KEY is not set");

  const c = new Client({ connectionString: url });
  await c.connect();
  const branch = (await c.query("select current_setting('neon.branch_id', true) b")).rows[0]?.b;
  console.log(`Re-embedding with ${EMBED_MODEL} on branch ${branch}${prod ? " (PRODUCTION)" : ""}`);

  for (const table of ["landscape_document_chunks", "factsheet_chunks"]) {
    const { rows: [{ n }] } = await c.query(
      `SELECT count(*)::int n FROM "cat".${table} WHERE embedding_model IS DISTINCT FROM $1`, [EMBED_MODEL]);
    console.log(`\n${table}: ${n} rows to do`);
    let done = 0, removed = 0, cleaned = 0;

    for (;;) {
      const { rows } = await c.query<{ id: string; chunk_text: string }>(
        `SELECT id, chunk_text FROM "cat".${table}
         WHERE embedding_model IS DISTINCT FROM $1 ORDER BY id LIMIT ${PAGE}`, [EMBED_MODEL]);
      if (rows.length === 0) break;

      const keep: { id: string; text: string; changed: boolean }[] = [];
      for (const r of rows) {
        const text = clean(r.chunk_text);
        if (text.length < MIN_CHARS) {
          await c.query(`DELETE FROM "cat".${table} WHERE id = $1`, [r.id]);
          removed++;
        } else keep.push({ id: r.id, text, changed: text !== r.chunk_text });
      }

      const vectors = await embedDocuments(keep.map((k) => k.text));
      await c.query("BEGIN");
      for (let i = 0; i < keep.length; i++) {
        const k = keep[i];
        if (k.changed) cleaned++;
        await c.query(
          `UPDATE "cat".${table}
           SET embedding = $2::vector, embedding_model = $3${k.changed ? ", chunk_text = $4" : ""}
           WHERE id = $1`,
          k.changed ? [k.id, toVectorLiteral(vectors[i]), EMBED_MODEL, k.text] : [k.id, toVectorLiteral(vectors[i]), EMBED_MODEL],
        );
      }
      await c.query("COMMIT");
      done += keep.length;
      process.stdout.write(`\r  embedded ${done}  cleaned ${cleaned}  removed ${removed}   `);
    }
    console.log();
  }

  await c.end();
  console.log("\nDone.");
}

main().catch((e) => {
  console.error("\nFAILED:", e.message ?? e);
  process.exit(1);
});
