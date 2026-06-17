#!/usr/bin/env node
/**
 * One-off cleanup after the full import: merge alias-duplicate states the name
 * normaliser couldn't catch (e.g. "Uttranchal" vs "Uttarakhand"), drop empty
 * duplicate UT rows, and tidy awkward UT names. Idempotent.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 2 });

const idByName = async (name) => {
  const { rows } = await pool.query(`SELECT id, lgd_code, state_code FROM "cat".geographies WHERE type='state' AND name=$1 LIMIT 1`, [name]);
  return rows[0] || null;
};

// dup → canonical: move the dup's children to canonical, then delete the dup.
const MERGES = [["Uttranchal", "Uttarakhand"]];
// pure empty duplicates (0 children) — the master supplied the real versions.
const DROP_EMPTY = [
  "Chandigarh (UT)", "Dadra and Nagar Haveli (UT)", "Daman and Diu (UT)",
  "Delhi (NCT)", "Lakshadweep (UT)", "Puducherry (UT)",
];
// tidy names from the LGD source.
const RENAMES = [
  ["Andaman And Nicobar", "Andaman & Nicobar Islands"],
  ["Daman", "Daman & Diu"],
  ["Dadra", "Dadra & Nagar Haveli"],
  ["Pondicherry", "Puducherry"],
];

for (const [dupName, canonName] of MERGES) {
  const dup = await idByName(dupName);
  const canon = await idByName(canonName);
  if (!dup || !canon) { console.log(`  merge skip: ${dupName}→${canonName} (missing)`); continue; }
  const moved = await pool.query(`UPDATE "cat".geographies SET parent_id=$1 WHERE parent_id=$2`, [canon.id, dup.id]);
  await pool.query(`UPDATE "cat".geographies SET lgd_code=COALESCE(lgd_code,$2) WHERE id=$1`, [canon.id, dup.lgd_code]);
  await pool.query(`DELETE FROM "cat".geographies WHERE id=$1`, [dup.id]);
  console.log(`  merged ${dupName} → ${canonName} (${moved.rowCount} children moved)`);
}

for (const name of DROP_EMPTY) {
  const row = await idByName(name);
  if (!row) continue;
  const { rows } = await pool.query(`SELECT count(*) n FROM "cat".geographies WHERE parent_id=$1`, [row.id]);
  if (Number(rows[0].n) > 0) { console.log(`  keep ${name} (has ${rows[0].n} children)`); continue; }
  await pool.query(`DELETE FROM "cat".geographies WHERE id=$1`, [row.id]);
  console.log(`  dropped empty duplicate: ${name}`);
}

for (const [from, to] of RENAMES) {
  const row = await idByName(from);
  if (!row) continue;
  // don't collide with an existing canonical row
  const exists = await idByName(to);
  if (exists) { console.log(`  rename skip: "${to}" already exists`); continue; }
  await pool.query(`UPDATE "cat".geographies SET name=$2 WHERE id=$1`, [row.id, to]);
  console.log(`  renamed "${from}" → "${to}"`);
}

const { rows: c } = await pool.query(`SELECT count(*) n FROM "cat".geographies WHERE type='state'`);
console.log(`✓ states now: ${c[0].n}`);
await pool.end();
