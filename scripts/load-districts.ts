import { config } from "dotenv";
import { readFileSync } from "node:fs";

/**
 * Load Census 2011 district centroids into cat.district_centroids (CAT database only)
 * and re-place every fact sheet on the Solutions Atlas.
 *
 *   npx tsx scripts/load-districts.ts
 *
 * cat.geographies is not touched. Safe to re-run: rows upsert.
 * Data: data/geo/district-centroids-2011.json (see data/geo/README.md).
 */
config({ path: ".env.local", quiet: true });
if (!process.env.DATABASE_URL_CAT) throw new Error("DATABASE_URL_CAT is not set; this script only targets the CAT database");
process.env.DATABASE_URL = process.env.DATABASE_URL_CAT;

const STATE_CODES: Record<string, string> = {
  "Andaman & Nicobar Island": "AN", "Andhra Pradesh": "AP", "Arunanchal Pradesh": "AR", Assam: "AS",
  Bihar: "BR", Chandigarh: "CH", Chhattisgarh: "CG", "Dadara & Nagar Havelli": "DN", "Daman & Diu": "DD",
  Goa: "GA", Gujarat: "GJ", Haryana: "HR", "Himachal Pradesh": "HP", "Jammu & Kashmir": "JK",
  Jharkhand: "JH", Karnataka: "KA", Kerala: "KL", Lakshadweep: "LD", "Madhya Pradesh": "MP",
  Maharashtra: "MH", Manipur: "MN", Meghalaya: "ML", Mizoram: "MZ", "NCT of Delhi": "DL",
  Nagaland: "NL", Odisha: "OD", Puducherry: "PY", Punjab: "PB", Rajasthan: "RJ", Sikkim: "SK",
  "Tamil Nadu": "TN", Tripura: "TR", "Uttar Pradesh": "UP", Uttarakhand: "UK", "West Bengal": "WB",
};
// 2011 Andhra Pradesh districts that are now in Telangana.
const TELANGANA = new Set(["Adilabad", "Nizamabad", "Karimnagar", "Medak", "Hyderabad", "Rangareddy",
  "Mahbubnagar", "Nalgonda", "Warangal", "Khammam"]);
// [state code, alias, 2011 district name]
const ALIASES: [string, string, string][] = [
  ["AP", "Kadapa", "Y.s.r."], ["AP", "YSR Kadapa", "Y.s.r."], ["AP", "Cuddapah", "Y.s.r."],
  ["AP", "Nellore", "Sri Potti Sriramulu Nellore"], ["AP", "Ananthapuramu", "Anantapur"],
  ["CG", "Balodabazar-Bhatapara", "Raipur"], ["CG", "Baloda Bazar", "Raipur"],
  ["TN", "Pattukkottai", "Thanjavur"], ["HR", "Gurugram", "Gurgaon"], ["MH", "Buldhana", "Buldana"],
  ["TG", "Ranga Reddy", "Rangareddy"], ["TG", "Mahabubnagar", "Mahbubnagar"],
];

type Row = { state: string; district: string; census: string; lat: number; lon: number };

(async () => {
  const { db } = await import("../lib/db");
  const { sql } = await import("drizzle-orm");
  const rows = JSON.parse(readFileSync("data/geo/district-centroids-2011.json", "utf8")) as Row[];

  const byName = new Map<string, { code: string; r: Row }>();
  let n = 0;
  for (const r of rows) {
    const code = r.state === "Andhra Pradesh" && TELANGANA.has(r.district) ? "TG" : STATE_CODES[r.state];
    if (!code) throw new Error(`No state code for ${r.state}`);
    byName.set(`${code}|${r.district}`, { code, r });
    await db.execute(sql`
      INSERT INTO "cat".district_centroids (state_code, name_norm, name, census_code, is_alias, latitude, longitude)
      VALUES (${code}, "cat".geo_norm(${r.district}), ${r.district}, ${r.census}, false, ${r.lat}, ${r.lon})
      ON CONFLICT (state_code, name_norm) DO UPDATE SET name = EXCLUDED.name, census_code = EXCLUDED.census_code,
        is_alias = false, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude`);
    n++;
  }
  for (const [code, alias, target] of ALIASES) {
    const t = byName.get(`${code}|${target}`) ?? byName.get(`AP|${target}`) ?? byName.get(`TG|${target}`);
    if (!t) throw new Error(`Alias target not found: ${code} ${target}`);
    await db.execute(sql`
      INSERT INTO "cat".district_centroids (state_code, name_norm, name, census_code, is_alias, latitude, longitude)
      VALUES (${code}, "cat".geo_norm(${alias}), ${target}, ${t.r.census}, true, ${t.r.lat}, ${t.r.lon})
      ON CONFLICT (state_code, name_norm) DO NOTHING`);
  }
  // Touch every fact sheet so the placement trigger runs.
  await db.execute(sql`UPDATE "cat".solution_factsheets SET district = district`);

  const summary = (await db.execute(sql`
    SELECT geo_precision, count(*)::int AS n FROM "cat".solution_factsheets GROUP BY 1 ORDER BY 1`)).rows;
  const unmatched = (await db.execute(sql`
    SELECT slug, state_code, district FROM "cat".solution_factsheets
     WHERE coalesce(district, '') <> '' AND geo_precision <> 'district'`)).rows;
  console.log(`${n} districts loaded, ${ALIASES.length} aliases.`);
  console.log("Fact sheet placement:", summary);
  if (unmatched.length) console.log("District named but not matched (placed at state level):", unmatched);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
