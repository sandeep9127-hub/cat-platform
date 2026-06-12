/**
 * One-off repair: canonicalise solution_factsheets.themes so every entry is a
 * valid Atlas category slug. Fixes hand-edited values like "Fisheries" (capital
 * F) that saved but never matched the lowercase controlled vocabulary, so the
 * Atlas filter and the landing-page counts silently ignored them.
 *
 * Single idempotent UPDATE — only rows that actually contain a non-canonical
 * entry are rewritten (case-insensitive match against the 10 slugs, order and
 * de-dup preserved). Clean rows are left untouched.
 *
 *   npx tsx scripts/normalize-factsheet-themes.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import dns from "node:dns";
import { Pool } from "pg";

dns.setDefaultResultOrder("verbatim");

const SLUGS = [
  "agri-horti-agroforestry", "forestry-ntfp", "livestock", "fisheries", "nrm",
  "biodiversity", "nutrition", "market", "energy", "technical-assistance",
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({
    connectionString: url.replace(/[?&]sslmode=[^&]+/g, ""),
    max: 1,
    ssl: { rejectUnauthorized: false },
  });

  const valuesList = SLUGS.map((s) => `('${s}')`).join(",");

  const res = await pool.query(`
    UPDATE "cat".solution_factsheets sf
    SET themes = COALESCE((
      SELECT jsonb_agg(slug ORDER BY ord)
      FROM (
        SELECT DISTINCT ON (v.slug) v.slug AS slug, t.ord AS ord
        FROM jsonb_array_elements_text(sf.themes) WITH ORDINALITY AS t(raw, ord)
        JOIN (VALUES ${valuesList}) AS v(slug)
          ON lower(btrim(t.raw)) = v.slug
        ORDER BY v.slug, t.ord
      ) q
    ), '[]'::jsonb),
    updated_at = now()
    WHERE EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(sf.themes) AS t(raw)
      WHERE t.raw NOT IN (${SLUGS.map((s) => `'${s}'`).join(",")})
    )
    RETURNING slug, themes
  `);

  console.log(`Normalised ${res.rowCount} fact sheet(s):`);
  for (const r of res.rows) console.log(`  ${r.slug} -> ${JSON.stringify(r.themes)}`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
