import { config } from "dotenv";

/**
 * Run the Drive sync once (the same code the daily schedule runs).
 *
 *   npx tsx scripts/drive-sync.ts            # sync into the CAT database
 *   npx tsx scripts/drive-sync.ts --dry-run  # report what would change, no writes or AI spend
 *
 * Locally it reads .env.local and targets DATABASE_URL_CAT. In GitHub Actions
 * the same variables come from repository secrets.
 */
config({ path: ".env.local", quiet: true });
if (process.env.DATABASE_URL_CAT) process.env.DATABASE_URL = process.env.DATABASE_URL_CAT;
if (!process.env.DATABASE_URL) throw new Error("No database configured");

(async () => {
  const { runDriveSync } = await import("../lib/ingest/sync");
  const dryRun = process.argv.includes("--dry-run");
  const t0 = Date.now();
  const s = await runDriveSync({
    triggeredBy: process.env.GITHUB_EVENT_NAME === "schedule" ? "cron" : "manual",
    dryRun,
    log: (m) => console.log(m),
  });
  console.log(
    `\n${dryRun ? "DRY RUN: " : ""}${s.newVersions.length} report update(s), ${s.sheetChanges.length} sheet(s) with changes pending, ` +
      `${s.problems.length} problem(s), $${s.costUsd.toFixed(2)}, ${Math.round((Date.now() - t0) / 1000)}s, email: ${s.emailed}`,
  );
  for (const p of s.problems) console.log(`  ! ${p}`);
  process.exit(s.problems.some((p) => p.includes("failed")) ? 1 : 0);
})().catch((e) => {
  console.error("SYNC FAILED:", e.stack ?? e.message);
  process.exit(1);
});
