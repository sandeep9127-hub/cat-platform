import { config } from "dotenv";
/** Re-index approved interventions as searchable chunks (CAT database). npx tsx scripts/index-interventions.ts [slug…] */
config({ path: ".env.local", quiet: true });
if (!process.env.DATABASE_URL_CAT) throw new Error("DATABASE_URL_CAT is not set");
process.env.DATABASE_URL = process.env.DATABASE_URL_CAT;
(async () => {
  const { indexInterventions } = await import("../lib/ingest/intervention-chunks");
  const { LANDSCAPES } = await import("../lib/data/landscapes");
  const { sql } = await import("drizzle-orm"); const { db } = await import("../lib/db");
  const only = process.argv.slice(2);
  const slugs = ((await db.execute(sql`SELECT DISTINCT landscape_slug FROM "cat".interventions ORDER BY 1`)) as unknown as { rows: { landscape_slug: string }[] })
    .rows.map((r) => r.landscape_slug).filter((s) => !only.length || only.includes(s));
  for (const s of slugs) console.log(`${s}: ${await indexInterventions(s, LANDSCAPES[s]?.name ?? s)} interventions indexed`);
  process.exit(0);
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
