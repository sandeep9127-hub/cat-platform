/**
 * Reverse-geocode every directory location to its CANONICAL admin area using
 * CoRE Stack's public Survey-of-India tehsil layer (no API key), and store the
 * clean values alongside the originals.
 *
 * Why: the directory was mirrored from an old tracker and its state/district/
 * block text is unreliable (wrong states, "nan" blocks). The lat/lng is
 * trustworthy, so we derive the correct STATE / District / TEHSIL from the point
 * itself. Non-destructive: writes new geo_state / geo_district / geo_tehsil
 * columns; the original columns are left untouched.
 *
 * Idempotent — only fills rows that don't yet have geo_state. Safe to re-run.
 *   node scripts/costack-geocode-locations.mjs
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { Pool } from "pg";
import dns from "node:dns";
dns.setDefaultResultOrder("verbatim");

const GEO = "https://geoserver.core-stack.org:8443/geoserver";
const SOI = "pan_india_asset:SOI_tehsil_pan_india_dataset";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 4,
});

/** SOI layer is stored in lat/lon axis order → POINT(lat lon). Returns {state,district,tehsil} or null (outside) or undefined (error). */
async function geocode(lat, lon) {
  const cql = encodeURIComponent(`INTERSECTS(geom, POINT(${lat} ${lon}))`);
  const u = `${GEO}/pan_india_asset/ows?service=WFS&version=2.0.0&request=GetFeature&typeName=${SOI}&outputFormat=application/json&count=1&propertyName=STATE,District,TEHSIL&CQL_FILTER=${cql}`;
  for (let a = 0; a < 4; a++) {
    try {
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), 20000);
      const r = await fetch(u, { signal: c.signal });
      clearTimeout(t);
      if (!r.ok) { await sleep(700 * (a + 1)); continue; }
      const j = await r.json();
      const f = j.features && j.features[0];
      if (!f) return null;
      const p = f.properties || {};
      return { state: p.STATE ?? null, district: p.District ?? null, tehsil: p.TEHSIL ?? null };
    } catch { await sleep(900 * (a + 1)); }
  }
  return undefined;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runPool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const k = i++; await fn(items[k], k); }
  }));
}

async function main() {
  // 1) additive schema (idempotent)
  await pool.query(`ALTER TABLE "cat".directory_locations
      ADD COLUMN IF NOT EXISTS geo_state text,
      ADD COLUMN IF NOT EXISTS geo_district text,
      ADD COLUMN IF NOT EXISTS geo_tehsil text,
      ADD COLUMN IF NOT EXISTS geo_status text`);

  // 2) distinct un-geocoded coordinates (dedupe: many rows share a point)
  const { rows: coords } = await pool.query(
    `SELECT DISTINCT round(latitude::numeric,5) lat, round(longitude::numeric,5) lng
       FROM "cat".directory_locations
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND geo_status IS NULL`);
  console.log(`geocoding ${coords.length} distinct coordinates…`);

  let done = 0, ok = 0, outside = 0, err = 0;
  await runPool(coords, 5, async (c) => {
    const lat = Number(c.lat), lon = Number(c.lng);
    const g = await geocode(lat, lon);
    const status = g === undefined ? "error" : g === null ? "outside" : "ok";
    if (status === "ok") ok++; else if (status === "outside") outside++; else err++;
    // Update all rows at this rounded coordinate.
    await pool.query(
      `UPDATE "cat".directory_locations
          SET geo_state=$1, geo_district=$2, geo_tehsil=$3, geo_status=$4
        WHERE round(latitude::numeric,5)=$5 AND round(longitude::numeric,5)=$6`,
      [g?.state ?? null, g?.district ?? null, g?.tehsil ?? null, status, lat, lon]);
    if (++done % 50 === 0) console.log(`  ${done}/${coords.length}  (ok ${ok}, outside ${outside}, err ${err})`);
  });

  const { rows: summary } = await pool.query(
    `SELECT geo_status, count(*) n FROM "cat".directory_locations WHERE latitude IS NOT NULL GROUP BY geo_status ORDER BY 2 DESC`);
  console.log("\n✓ Done. Row-level status:");
  for (const s of summary) console.log(`  ${s.geo_status ?? "pending"}: ${s.n}`);
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
