import { config } from "dotenv";

/**
 * Load the 10 live intervention sheets ("Final folder/5.2 data - final/Live
 * Google Sheets") into the NEW CAT database.
 *
 *   npx tsx scripts/load-interventions.ts                     # preview only, no writes
 *   npx tsx scripts/load-interventions.ts --approve-baseline  # first load: approved baseline
 *   npx tsx scripts/load-interventions.ts --stage             # later syncs: pending changes for review
 */
config({ path: ".env.local", quiet: true });
if (!process.env.DATABASE_URL_CAT) throw new Error("DATABASE_URL_CAT is not set");
process.env.DATABASE_URL = process.env.DATABASE_URL_CAT;

const args = new Set(process.argv.slice(2));
const BASELINE = args.has("--approve-baseline");
const STAGE = args.has("--stage");
if (BASELINE && STAGE) throw new Error("Pass only one of --approve-baseline / --stage");

const SLUG: Record<string, string> = {
  ahwa: "ahwa", chitrakonda: "chitrakonda", dantewada: "dantewada", dharashiv: "dharashiv",
  khasi: "khatarshnong-laitkroh", mau: "mau", patharpratima: "patharpratima", patratu: "patratu",
  rajnagar: "rajnagar", vempalli: "vempalli",
};
const cr = (n: number) => `₹${(n / 1e7).toFixed(2)} cr`;

async function main() {
  const drive = await import("../lib/ingest/drive");
  const { parseInterventionSheet, stageInterventions } = await import("../lib/ingest/sheets");
  const { sql } = await import("drizzle-orm");
  const { db } = await import("../lib/db");

  const sheets = (await drive.listTree(process.env.DRIVE_FINAL_FOLDER_ID!, "Final folder"))
    .filter((f) => f.path.includes("/Live Google Sheets/") && f.mimeType === drive.GOOGLE_SHEET)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Old budget totals in the (copied) database, for a sanity comparison.
  const old = new Map(
    ((await db.execute(sql`SELECT landscape_slug, sum(total_cost)::float AS t FROM "cat".landscape_budget_lines GROUP BY 1`).catch(() => ({ rows: [] }))) as unknown as { rows: { landscape_slug: string; t: number }[] }).rows.map((r) => [r.landscape_slug, r.t]),
  );

  console.log(`${BASELINE ? "APPROVED BASELINE" : STAGE ? "STAGING CHANGES" : "PREVIEW (no writes)"}\n`);
  let grand = 0;
  for (const f of sheets) {
    const slug = SLUG[f.name.trim().toLowerCase()];
    if (!slug) { console.warn(`! no landscape for sheet "${f.name}"`); continue; }
    const rows = parseInterventionSheet(await drive.readSheetValues(f.id, "Data"));
    const total = rows.reduce((n, r) => n + Number(r.totals.grand_total ?? 0), 0);
    const inv = rows.reduce((n, r) => n + Number(r.totals.investment ?? 0), 0);
    const hh = rows.reduce((n, r) => n + Number(r.phase1.households ?? 0) + Number(r.phase2.households ?? 0), 0);
    grand += total;
    const was = old.get(slug);
    let line = `${slug.padEnd(22)} ${String(rows.length).padStart(3)} rows  total ${cr(total).padStart(12)}  investment ${cr(inv).padStart(12)}  households ${hh.toLocaleString("en-IN").padStart(9)}`;
    line += was ? `   (old site: ${cr(was)})` : "";
    if (BASELINE || STAGE) {
      const r = await stageInterventions({ landscapeSlug: slug, sheet: rows, driveFileId: f.id, approveBaseline: BASELINE });
      line += `  -> ${r.mode}: +${r.added} ~${r.updated} -${r.removed} =${r.unchanged}`;
    }
    console.log(line);
  }
  console.log(`\nAll landscapes: ${cr(grand)}`);
  process.exit(0);
}

main().catch((e) => { console.error("FAILED:", e.stack ?? e.message); process.exit(1); });
