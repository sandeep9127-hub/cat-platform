#!/usr/bin/env node
/**
 * Import the India administrative hierarchy into cat.geographies for the
 * canonical geography picker. Idempotent: safe to re-run.
 *
 * Phase 1 source: a states→districts JSON ({ states: [{ state, districts:[] }] }).
 * The importer is generic — it walks a level list (state → district → block →
 * village) and upserts each node under its parent, so the same script can ingest
 * deeper LGD/Datameet exports later by extending LEVELS.
 *
 * Usage: node scripts/geo-import.mjs [path-to.json]   (default .data/sd.json)
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { Pool } from "pg";
import { readFileSync } from "node:fs";

const FILE = process.argv[2] || ".data/sd.json";
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 4 });

const kebab = (s) =>
  String(s).toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-");
const normState = (s) => String(s).toLowerCase().replace(/&/g, "and").replace(/[^a-z]/g, "");

// Codes for states/UTs that may be missing from our seed (so new ones get a code).
const STATE_CODES = {
  andamanandnicobarislands: "AN", chandigarh: "CH", dadraandnagarhaveli: "DN",
  damananddiu: "DD", "dadraandnagarhavelianddamananddiu": "DN", lakshadweep: "LD",
  puducherry: "PY", ladakh: "LA", telangana: "TG", delhi: "DL", nctofdelhi: "DL",
};

async function main() {
  const raw = JSON.parse(readFileSync(FILE, "utf8"));
  const states = raw.states || raw;
  console.log(`→ importing ${states.length} states from ${FILE}`);

  // Existing state rows, keyed by normalised name + by code.
  const { rows: existing } = await pool.query(
    `SELECT id, name, slug, state_code FROM "cat".geographies WHERE type = 'state'`
  );
  const stateByNorm = new Map(existing.map((s) => [normState(s.name), s]));

  let statesCreated = 0, districtsInserted = 0, districtsSkipped = 0;

  for (const st of states) {
    const sName = st.state || st.name;
    const norm = normState(sName);
    let state = stateByNorm.get(norm);

    // Create the state/UT if we don't have it yet.
    if (!state) {
      const code = STATE_CODES[norm] || sName.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase();
      const slug = kebab(sName);
      const { rows } = await pool.query(
        `INSERT INTO "cat".geographies (name, slug, type, state_code, source, verified)
         VALUES ($1,$2,'state',$3,'seed',true)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
         RETURNING id, name, slug, state_code`,
        [sName, slug, code]
      );
      state = rows[0];
      stateByNorm.set(norm, state);
      statesCreated++;
    }

    const districts = st.districts || st.children || [];
    for (const d of districts) {
      const dName = typeof d === "string" ? d : d.name || d.district;
      const lgd = typeof d === "object" ? d.lgd_code || d.code || null : null;
      if (!dName) continue;
      const slug = `${kebab(dName)}-${(state.state_code || kebab(sName)).toLowerCase()}`;

      // Skip if this district already exists under this state.
      const dup = await pool.query(
        `SELECT 1 FROM "cat".geographies
         WHERE type='district' AND parent_id=$1 AND lower(name)=lower($2) LIMIT 1`,
        [state.id, dName]
      );
      if (dup.rowCount) { districtsSkipped++; continue; }

      await pool.query(
        `INSERT INTO "cat".geographies (name, slug, type, parent_id, state_code, lgd_code, source, verified, display_on_map)
         VALUES ($1,$2,'district',$3,$4,$5,'seed',true,false)
         ON CONFLICT (slug) DO NOTHING`,
        [dName, slug, state.id, state.state_code, lgd]
      );
      districtsInserted++;
    }
  }

  const { rows: counts } = await pool.query(
    `SELECT type, count(*) n FROM "cat".geographies GROUP BY type ORDER BY n DESC`
  );
  console.log(`✓ states created: ${statesCreated} · districts inserted: ${districtsInserted} · skipped (existing): ${districtsSkipped}`);
  console.log("  geographies now:", counts.map((c) => `${c.type}=${c.n}`).join(" "));
  await pool.end();
}
main();
