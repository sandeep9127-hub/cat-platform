#!/usr/bin/env node
/**
 * Augment a landscape's climate meta with the cached "Portfolio Headlines"
 * aggregates (all-tracks GHG, creditable carbon, co-benefit pool) WITHOUT
 * re-ingesting the per-intervention lines. Use this when a workbook has
 * uncached per-line formula cells (which would zero-out a full re-ingest) but
 * its headline block is cached.
 *
 * Usage: node scripts/augment-climate-meta.mjs <slug> <climate.xlsx>
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { Pool } from "pg";
import ExcelJS from "exceljs";

const [, , SLUG, XLSX] = process.argv;
if (!SLUG || !XLSX) {
  console.error("Usage: augment-climate-meta.mjs <slug> <climate.xlsx>");
  process.exit(1);
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 2 });

const val = (c) => {
  const v = c.value;
  if (v == null) return null;
  if (typeof v === "object" && "result" in v) return v.result;
  if (typeof v === "object" && "richText" in v) return v.richText.map((t) => t.text).join("");
  return v;
};
const num = (c) => { const x = Number(val(c)); return isFinite(x) ? x : null; };
const str = (c) => { const x = val(c); return x == null ? "" : String(x).replace(/\s+/g, " ").trim(); };

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(XLSX);
const calc = wb.getWorksheet("03_Calculations");
const carbon = wb.getWorksheet("04_View_Carbon_Investor");

let ghgTotal = null, cobenefitInr = null;
for (let r = 1; r <= calc.actualRowCount; r++) {
  const lab = str(calc.getRow(r).getCell(1));
  if (/total co-?benefit pool/i.test(lab)) cobenefitInr = num(calc.getRow(r).getCell(2));
  if (/total tco2e.*all interventions|total tco2e, 7 ?yr/i.test(lab)) ghgTotal = num(calc.getRow(r).getCell(2));
}
let creditable = 0;
for (let r = 6; r <= carbon.actualRowCount; r++) {
  const a = str(carbon.getRow(r).getCell(1));
  if (!a) continue;
  if (/SUPPLEMENTARY/i.test(a)) break;
  if (/SUBTOTAL|TOTAL/i.test(a)) continue;
  if (/register/i.test(str(carbon.getRow(r).getCell(13)))) creditable += num(carbon.getRow(r).getCell(12)) ?? 0;
}

// Ensure the columns exist (no-op if already added).
for (const col of [
  `ghg_total_tco2e numeric`,
  `carbon_creditable_tco2e numeric`,
  `cobenefit_total_inr bigint`,
]) {
  await pool.query(`ALTER TABLE "cat".landscape_climate_meta ADD COLUMN IF NOT EXISTS ${col}`);
}

const { rowCount } = await pool.query(
  `UPDATE "cat".landscape_climate_meta
     SET ghg_total_tco2e = $2, carbon_creditable_tco2e = $3, cobenefit_total_inr = $4, updated_at = now()
   WHERE landscape_slug = $1`,
  [SLUG, ghgTotal != null ? Math.round(ghgTotal) : null, Math.round(creditable) || null,
   cobenefitInr != null ? Math.round(cobenefitInr) : null]
);

const cr = (n) => (n == null ? "—" : `₹${(n / 1e7).toFixed(2)}cr`);
console.log(`✓ augmented ${SLUG} (${rowCount} meta row):`);
console.log(`  GHG total (all tracks): ${ghgTotal != null ? Math.round(ghgTotal).toLocaleString() + " tCO2e" : "—"}`);
console.log(`  Creditable today:       ${Math.round(creditable).toLocaleString()} tCO2e`);
console.log(`  Co-benefit pool:        ${cr(cobenefitInr)}`);
await pool.end();
