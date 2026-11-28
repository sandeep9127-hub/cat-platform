import { config } from "dotenv";

/**
 * Update the Hub's Phase 1 figures from the All-Landscape Phase 1 sheet, the
 * same as the admin "Update from sheet" + "Publish this update" buttons.
 *
 *   npx tsx scripts/sync-phase1.ts --dev [--dry-run]   # CAT dev database branch
 *   npx tsx scripts/sync-phase1.ts --cat [--dry-run]   # the live CAT database
 *
 * --dry-run reads and checks the sheet and prints the before/after summary
 * without saving anything. One of --dev / --cat is required.
 */
config({ path: ".env.local", quiet: true });
const dev = process.argv.includes("--dev");
const cat = process.argv.includes("--cat");
const dryRun = process.argv.includes("--dry-run");
if (dev === cat) {
  console.error("Say which database: --dev (CAT dev branch) or --cat (live).");
  process.exit(2);
}
const url = dev ? process.env.DATABASE_URL_DEV : process.env.DATABASE_URL_CAT;
if (!url) {
  console.error(`${dev ? "DATABASE_URL_DEV" : "DATABASE_URL_CAT"} is not set.`);
  process.exit(2);
}
process.env.DATABASE_URL = url;

const cr = (v: number | null | undefined) => (v == null ? "—" : `Rs ${(v / 1e7).toFixed(2)} cr`);

(async () => {
  const { fetchSheetLive } = await import("../lib/dashboards/landscapes-phase1/sheet");
  const { loadPublished, saveDraft, publishSnapshot, summarize } = await import("../lib/dashboards/landscapes-phase1/snapshot");
  const fresh = await fetchSheetLive(); // throws with a clear message if the layout changed
  const live = await loadPublished();
  const a = live ? summarize(live.data) : null;
  const b = summarize(fresh);
  console.log(`Target: ${dev ? "dev" : "LIVE"} database${dryRun ? " (dry run)" : ""}`);
  console.log(`Lines: ${a?.lines ?? "—"} → ${b.lines}`);
  console.log(`All landscapes Phase 1 (Dashboard tab): ${cr(a?.allPhase1)} → ${cr(b.allPhase1)}`);
  console.log(`Net grant + returnable grant: ${a?.netGrant ?? "—"}% → ${b.netGrant}%`);
  console.log(`7-year total of all lines: ${cr(a?.totalCost)} → ${cr(b.totalCost)}`);
  for (const x of b.perLandscape) {
    const o = a?.perLandscape.find((y) => y.name === x.name);
    const changed = !o || o.lines !== x.lines || Math.round(o.total) !== Math.round(x.total) || Math.round(o.phase1) !== Math.round(x.phase1);
    console.log(`  ${changed ? "*" : " "} ${x.name.padEnd(14)} lines ${o?.lines ?? "—"} → ${x.lines}   total ${cr(o?.total)} → ${cr(x.total)}   Phase 1 ${cr(o?.phase1)} → ${cr(x.phase1)}`);
  }
  if (dryRun) { console.log("Dry run: nothing saved."); process.exit(0); }
  const id = await saveDraft(fresh, { userId: null, email: "script:sync-phase1" });
  const r = await publishSnapshot(id, { userId: null, email: "script:sync-phase1" });
  console.log(`Published snapshot ${id}: ${r.passages} Ask passages rebuilt${r.skipped.length ? `; landscapes not on the Hub: ${r.skipped.join(", ")}` : ""}.`);
  process.exit(0);
})().catch((e) => {
  console.error("Not updated:", (e as Error).message);
  process.exit(1);
});
