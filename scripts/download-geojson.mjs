#!/usr/bin/env node
/**
 * Downloads the India admin-1 GeoJSON from Datameet's public maps repository.
 *
 * Source: https://github.com/datameet/maps (Public Domain)
 *
 * Output:
 *   public/geo/india-states.json — full-resolution GeoJSON
 *
 * After download, simplify with Mapshaper to ~5% retention per PRODUCT.md.
 *   mapshaper public/geo/india-states.json -simplify 5% -o force public/geo/india-states.simplified.json
 *
 * Then run through SVGOMG (or svgo) on the resulting SVG export.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, "..", "public", "geo");
const outFile = path.join(outDir, "india-states.json");

const SOURCE_URL =
  "https://raw.githubusercontent.com/datameet/maps/master/States/Admin2.geojson";

async function main() {
  if (!existsSync(outDir)) await mkdir(outDir, { recursive: true });

  console.log(`Fetching India admin-1 GeoJSON from Datameet...`);
  const res = await fetch(SOURCE_URL);
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  await writeFile(outFile, text);
  console.log(`Wrote ${outFile} (${(text.length / 1024).toFixed(1)} KB)`);
  console.log(`Next: simplify with Mapshaper to ~5% retention.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
