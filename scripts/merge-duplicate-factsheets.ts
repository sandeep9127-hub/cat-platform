import { config } from "dotenv";

/**
 * Merge duplicate Solutions Atlas fact sheets (CAT database only).
 *
 *   npx tsx scripts/merge-duplicate-factsheets.ts            # apply
 *   npx tsx scripts/merge-duplicate-factsheets.ts --dry-run  # show what would change
 *
 * The duplicate is kept with status 'merged' and merged_into = the sheet kept,
 * so its old link redirects and the merge can be undone. Its Ask chunks are
 * removed so answers don't cite the same programme twice.
 * Kept = the better-sourced sheet (more citations; Sikkim: 3 vs 2).
 * Approved by Sandeep on 21 Nov 2026.
 */
config({ path: ".env.local", quiet: true });
if (!process.env.DATABASE_URL_CAT) throw new Error("DATABASE_URL_CAT is not set; this script only targets the CAT database");
process.env.DATABASE_URL = process.env.DATABASE_URL_CAT;

// [duplicate, kept]
const MERGES: [string, string][] = [
  ["chhattisgarh-suraji-gaon-yojana-narwa-garuwa-ghurwa-bari-model", "suraji-gaon-yojana-narwa-garuwa-ghurwa-bari-nggb"],
  ["himachal-pradesh-prakritik-kheti-khushhal-kisan-yojana", "himachal-pradesh-prakritik-kheti-khushhal-kisan-yojana-pk3y"],
  ["kerala-organic-farming-mission-jaiva-keralam", "jaiva-keralam-kerala-organic-farming-mission"],
  ["karnataka-zero-budget-natural-farming-programme", "karnataka-zero-budget-natural-farming-zbnf-programme"],
  ["national-mission-on-natural-farming", "national-mission-on-natural-farming-nmnf"],
  ["odisha-millets-mission", "odisha-millets-mission-omm"],
  ["sikkim-organic-mission-som", "sikkim-organic-mission"],
];

(async () => {
  const { db } = await import("../lib/db");
  const { sql } = await import("drizzle-orm");
  const dryRun = process.argv.includes("--dry-run");

  await db.transaction(async (tx) => {
    for (const [dup, keep] of MERGES) {
      const r = (await tx.execute(sql`
        SELECT slug, status FROM "cat".solution_factsheets WHERE slug IN (${dup}, ${keep})`)).rows as { slug: string; status: string }[];
      const d = r.find((x) => x.slug === dup);
      const k = r.find((x) => x.slug === keep);
      if (!k || k.status !== "published") throw new Error(`Kept sheet ${keep} is missing or not published`);
      if (!d) throw new Error(`Duplicate ${dup} not found`);
      if (d.status === "merged") { console.log(`= ${dup} already merged`); continue; }
      console.log(`${dryRun ? "would merge" : "merge"} ${dup} -> ${keep}`);
      if (dryRun) continue;
      await tx.execute(sql`
        UPDATE "cat".solution_factsheets SET status = 'merged', merged_into = ${keep}, updated_at = now()
        WHERE slug = ${dup}`);
      await tx.execute(sql`DELETE FROM "cat".factsheet_chunks WHERE factsheet_slug = ${dup}`);
    }
  });

  if (!dryRun) {
    const { indexFactsheets } = await import("../lib/ingest/factsheet-chunks");
    console.log(`Fact sheet search index rebuilt: ${await indexFactsheets()} published sheets`);
  }
  const counts = (await db.execute(sql`SELECT status, count(*)::int AS n FROM "cat".solution_factsheets GROUP BY 1 ORDER BY 1`)).rows;
  console.log("Fact sheets by status:", counts);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
