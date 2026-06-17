#!/usr/bin/env node
/**
 * Full India geography import from the CAT "State to Village Mapping" workbook.
 * Streams the master sheet (≈270k rows: state / district / block / panchayat,
 * each with an LGD code + title-cased ancestor names) and rebuilds the canonical
 * tree under cat.geographies, linked by parent_id and carrying lgd_code.
 *
 * States are matched to existing rows (so landscape parent links survive);
 * districts/blocks/villages are replaced wholesale (the earlier district seed
 * had no codes and slightly different spellings, which would duplicate).
 *
 * Usage: node scripts/geo-import-full.mjs "<path-to.xlsx>" [sheetName]
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { Pool } from "pg";
import ExcelJS from "exceljs";

const FILE = process.argv[2];
const SHEET = process.argv[3] || "State to Village Mapping";
if (!FILE) { console.error("Usage: geo-import-full.mjs <xlsx> [sheet]"); process.exit(1); }

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 4 });

const cell = (row, i) => {
  const v = row.getCell(i).value;
  if (v == null) return "";
  if (typeof v === "object") return String(v.result ?? v.text ?? "").trim();
  return String(v).trim();
};
const kebab = (s) => String(s).toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80) || "x";
const norm = (s) => String(s || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");

async function main() {
  console.log(`→ streaming ${SHEET} from ${FILE}`);
  const buckets = { state: [], district: [], block: [], village: [] };
  const reader = new ExcelJS.stream.xlsx.WorkbookReader(FILE, { worksheets: "emit", sharedStrings: "cache", styles: "ignore" });
  for await (const ws of reader) {
    // First sheet is the master mapping.
    for await (const row of ws) {
      const lt = cell(row, 2);
      if (!lt || lt === "location_type") continue;
      const code = cell(row, 3);
      const st = cell(row, 9), di = cell(row, 10), bl = cell(row, 11), pa = cell(row, 12);
      if (lt === "state") buckets.state.push({ code, name: st });
      else if (lt === "district") buckets.district.push({ code, state: st, name: di });
      else if (lt === "block") buckets.block.push({ code, state: st, district: di, name: bl });
      else if (lt === "panchayat" || lt === "village") buckets.village.push({ code, state: st, district: di, block: bl, name: pa });
    }
    break; // only the master sheet
  }
  console.log(`  read: ${buckets.state.length} states, ${buckets.district.length} districts, ${buckets.block.length} blocks, ${buckets.village.length} villages`);

  // 1) States — reuse existing (keep landscape parent links), create any missing.
  const { rows: existingStates } = await pool.query(`SELECT id, name, state_code FROM "cat".geographies WHERE type='state'`);
  const stateByNorm = new Map(existingStates.map((s) => [norm(s.name), s]));
  for (const s of buckets.state) {
    const n = norm(s.name);
    if (stateByNorm.has(n)) {
      // backfill the LGD code if we don't have one
      await pool.query(`UPDATE "cat".geographies SET lgd_code = COALESCE(lgd_code, $2) WHERE id = $1`, [stateByNorm.get(n).id, s.code || null]);
      continue;
    }
    const { rows } = await pool.query(
      `INSERT INTO "cat".geographies (name, slug, type, lgd_code, source, verified)
       VALUES ($1,$2,'state',$3,'cat-lgd',true) ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name
       RETURNING id, name, state_code`,
      [s.name, `${kebab(s.name)}-st`, s.code || null]
    );
    stateByNorm.set(n, rows[0]);
  }

  // 2) Replace districts/blocks/villages (children deleted first for FK safety).
  console.log("  clearing previous district/block/village rows…");
  await pool.query(`DELETE FROM "cat".geographies WHERE type='village'`);
  await pool.query(`DELETE FROM "cat".geographies WHERE type='block'`);
  await pool.query(`DELETE FROM "cat".geographies WHERE type='district'`);

  // Batched multi-row insert; returns inserted {id,name,...} when needed for child linking.
  async function bulkInsert(rows, returning) {
    const out = [];
    const COLS = `(name, slug, type, parent_id, state_code, lgd_code, source, verified, display_on_map)`;
    const PER = 2000;
    for (let i = 0; i < rows.length; i += PER) {
      const slice = rows.slice(i, i + PER);
      const vals = [];
      const params = [];
      slice.forEach((r, j) => {
        const b = j * 9;
        params.push(String(r.name).slice(0, 120), r.slug, r.type, r.parent_id, r.state_code, r.lgd_code, "cat-lgd", true, false);
        vals.push(`($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6},$${b+7},$${b+8},$${b+9})`);
      });
      const ret = returning ? "RETURNING id, name, parent_id, lgd_code" : "";
      const res = await pool.query(`INSERT INTO "cat".geographies ${COLS} VALUES ${vals.join(",")} ON CONFLICT (slug) DO NOTHING ${ret}`, params);
      if (returning) out.push(...res.rows);
      process.stdout.write(`    +${Math.min(i + PER, rows.length)}/${rows.length}\r`);
    }
    return out;
  }

  // 3) Districts → map key "state|district" -> id
  const dRows = [];
  for (const d of buckets.district) {
    const st = stateByNorm.get(norm(d.state));
    if (!st) continue;
    dRows.push({ name: d.name, slug: `${kebab(d.name)}-${d.code}`, type: "district", parent_id: st.id, state_code: st.state_code, lgd_code: d.code || null, _k: `${norm(d.state)}|${norm(d.name)}` });
  }
  const dIns = await bulkInsert(dRows, true);
  const dByLgd = new Map(dIns.map((r) => [r.lgd_code, r]));
  const districtId = new Map();
  dRows.forEach((r) => { const ins = dByLgd.get(r.lgd_code); if (ins) districtId.set(r._k, ins.id); });
  console.log(`\n  districts: ${dIns.length} inserted`);

  // 4) Blocks → map "state|district|block" -> id
  const bRows = [];
  for (const b of buckets.block) {
    const did = districtId.get(`${norm(b.state)}|${norm(b.district)}`);
    if (!did) continue;
    bRows.push({ name: b.name, slug: `${kebab(b.name)}-${b.code}`, type: "block", parent_id: did, state_code: stateByNorm.get(norm(b.state))?.state_code ?? null, lgd_code: b.code || null, _k: `${norm(b.state)}|${norm(b.district)}|${norm(b.name)}` });
  }
  const bIns = await bulkInsert(bRows, true);
  const bByLgd = new Map(bIns.map((r) => [r.lgd_code, r]));
  const blockId = new Map();
  bRows.forEach((r) => { const ins = bByLgd.get(r.lgd_code); if (ins) blockId.set(r._k, ins.id); });
  console.log(`\n  blocks: ${bIns.length} inserted`);

  // 5) Villages (panchayats) → parent = block id
  const vRows = [];
  let orphan = 0;
  for (const v of buckets.village) {
    const bid = blockId.get(`${norm(v.state)}|${norm(v.district)}|${norm(v.block)}`);
    if (!bid) { orphan++; continue; }
    vRows.push({ name: v.name, slug: `${kebab(v.name)}-${v.code}`, type: "village", parent_id: bid, state_code: stateByNorm.get(norm(v.state))?.state_code ?? null, lgd_code: v.code || null });
  }
  await bulkInsert(vRows, false);
  console.log(`\n  villages: ${vRows.length} inserted (${orphan} skipped — no matching block)`);

  const { rows: counts } = await pool.query(`SELECT type, count(*) n FROM "cat".geographies GROUP BY type ORDER BY n DESC`);
  console.log("✓ geographies now:", counts.map((c) => `${c.type}=${c.n}`).join(" "));
  await pool.end();
}
main().catch((e) => { console.error("ERR", e.message); process.exit(1); });
