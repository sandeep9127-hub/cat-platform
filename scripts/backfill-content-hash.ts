import { config } from "dotenv";

/**
 * Fill document_versions.content_hash for versions ingested before the column
 * existed, from the parsed.json stored in R2. Same fingerprint as lib/ingest/pipeline (contentFingerprint).
 * CAT database only.
 *
 *   npx tsx scripts/backfill-content-hash.ts
 */
config({ path: ".env.local", quiet: true });
if (!process.env.DATABASE_URL_CAT) throw new Error("DATABASE_URL_CAT is not set");
process.env.DATABASE_URL = process.env.DATABASE_URL_CAT;

async function main() {
  const { sql } = await import("drizzle-orm");
  const { db } = await import("../lib/db");
  const { getObjectBytes } = await import("../lib/storage/r2");
  const { contentFingerprint } = await import("../lib/ingest/pipeline");
  type Blocks = Parameters<typeof contentFingerprint>[0];

  const todo = ((await db.execute(sql`
    SELECT id, r2_parsed_key FROM "cat".document_versions WHERE r2_parsed_key IS NOT NULL`)) as unknown as {
    rows: { id: string; r2_parsed_key: string }[];
  }).rows;
  for (const v of todo) {
    const parsed = JSON.parse(new TextDecoder().decode(await getObjectBytes(v.r2_parsed_key))) as { blocks: Blocks };
    const hash = contentFingerprint(parsed.blocks);
    if (!hash) { console.log(`  ${v.id}: empty parse, left null`); continue; }
    await db.execute(sql`UPDATE "cat".document_versions SET content_hash = ${hash} WHERE id = ${v.id}`);
    console.log(`  ${v.id}: ${hash.slice(0, 12)}…`);
  }
  console.log(`Backfilled ${todo.length} version(s).`);
  process.exit(0);
}
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
