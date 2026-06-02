#!/usr/bin/env node
/**
 * Ingest the NCNF / Core Stack census into the directory tables.
 * The CSV is org x location: 332 organisations across 2,583 work locations.
 *
 * Pre-step (Python handles CSV quoting + normalisation):
 *   writes /tmp/orgs.json (332) and /tmp/locs.json (2,583, keyed to orgs)
 *
 * This loads orgs (PII isolated) then their locations.
 * Usage: node scripts/ingest-directory.mjs
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { Pool } from "pg";
import { promises as fs } from "node:fs";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL missing");
const pool = new Pool({ connectionString: url.replace(/[?&]sslmode=[^&]+/, ""), ssl: { rejectUnauthorized: false }, max: 4 });

async function main() {
  const orgs = JSON.parse(await fs.readFile("/tmp/orgs.json", "utf8"));
  const locs = JSON.parse(await fs.readFile("/tmp/locs.json", "utf8"));
  console.log(`\n→ Ingesting ${orgs.length} orgs + ${locs.length} locations`);

  await pool.query(`TRUNCATE "cat".directory_locations, "cat".directory_orgs RESTART IDENTITY CASCADE`);
  console.log("  cleared previous rows");

  // 1. insert orgs, capture key -> id
  const keyToId = new Map();
  const OB = 100;
  for (let i = 0; i < orgs.length; i += OB) {
    const batch = orgs.slice(i, i + OB);
    const params = [];
    const tuples = batch.map((o, j) => {
      const b = j * 6;
      params.push(o.name, o.org_type, o.org_type, JSON.stringify(o.domains || []), o.contact_person, o.contact_email);
      return `($${b+1},$${b+2},$${b+3},$${b+4}::jsonb,$${b+5},$${b+6})`;
    });
    const r = await pool.query(
      `INSERT INTO "cat".directory_orgs (name, org_type, org_type_raw, domains, contact_person, contact_email)
       VALUES ${tuples.join(",")} RETURNING id`,
      params
    );
    batch.forEach((o, j) => keyToId.set(o.key, r.rows[j].id));
  }
  console.log(`  ${keyToId.size} orgs inserted`);

  // 2. insert locations
  const valid = locs.filter((l) => keyToId.has(l.key));
  const LB = 200;
  for (let i = 0; i < valid.length; i += LB) {
    const batch = valid.slice(i, i + LB);
    const params = [];
    const tuples = batch.map((l, j) => {
      const b = j * 8;
      params.push(keyToId.get(l.key), l.source_id, l.state, l.district, l.subdistrict, l.block, l.lat, l.lng);
      return `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6},$${b+7},$${b+8})`;
    });
    await pool.query(
      `INSERT INTO "cat".directory_locations (org_id, source_id, state, district, subdistrict, block, latitude, longitude)
       VALUES ${tuples.join(",")}`,
      params
    );
    process.stdout.write(`  ${Math.min(i + LB, valid.length)}/${valid.length} locations\r`);
  }
  console.log(`\n  ${valid.length} locations inserted`);

  const stats = await pool.query(`
    SELECT (SELECT count(*) FROM "cat".directory_orgs) orgs,
           (SELECT count(*) FROM "cat".directory_locations) locs,
           (SELECT count(*) FROM "cat".directory_locations WHERE latitude IS NOT NULL) geocoded,
           (SELECT count(distinct state) FROM "cat".directory_locations) states`);
  console.log("  stats:", stats.rows[0]);
  await pool.end();
}
main().catch((e) => { console.error("FAILED:", e); process.exit(1); });
