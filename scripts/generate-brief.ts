import { config } from "dotenv";

/**
 * Generate (or refresh) landscape briefs, CAT database only. Skips a landscape
 * whose brief is current unless --force.
 *
 *   npx tsx scripts/generate-brief.ts --only=patratu [--force]
 *   npx tsx scripts/generate-brief.ts --all
 */
config({ path: ".env.local", quiet: true });
if (!process.env.DATABASE_URL_CAT) throw new Error("DATABASE_URL_CAT is not set");
process.env.DATABASE_URL = process.env.DATABASE_URL_CAT;

(async () => {
  const { LANDSCAPES } = await import("../lib/data/landscapes");
  const { generateBrief } = await import("../lib/briefs/generate");
  const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7).split(",");
  if (!only && !process.argv.includes("--all")) throw new Error("Pass --only=<slug>[,<slug>] or --all");
  const slugs = only ?? Object.keys(LANDSCAPES);
  for (const slug of slugs) {
    const t = Date.now();
    const r = await generateBrief(slug, { force: process.argv.includes("--force") });
    if (r.error) { console.log(`- ${slug}: ${r.error}`); continue; }
    console.log(`✓ ${slug}: ${r.cached ? "already current" : `written, $${(r.costUsd ?? 0).toFixed(3)}, ${Math.round((Date.now() - t) / 1000)}s`}`);
  }
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
