#!/usr/bin/env node
/**
 * Build-time guard for the India basemap.
 *
 * The Solutions Atlas page hard-depends on `public/geo/india-states.json` —
 * without it the map renders a "RUN `NPM RUN GEO:DOWNLOAD`" placeholder and
 * none of the pins are visible.
 *
 * Strategy:
 *  1. If the file already exists (developer ran download once, or it was
 *     committed), exit 0 immediately — no network round-trip.
 *  2. Otherwise, fetch the public-domain Datameet GeoJSON. The Vercel
 *     builder has outbound HTTPS, so this is safe at build-time.
 *  3. Network failure is non-fatal: the build still proceeds. The map page
 *     will degrade gracefully to its placeholder rather than crashing the
 *     whole site. Sourcing new atlas records is decoupled from this file's
 *     presence.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, "..", "public", "geo");
const outFile = path.join(outDir, "india-states.json");

const SOURCE_URL =
  "https://raw.githubusercontent.com/datameet/maps/master/States/Admin2.geojson";

async function main() {
  if (existsSync(outFile)) {
    const bytes = statSync(outFile).size;
    if (bytes > 50_000) {
      console.log(`[geo] India basemap present (${(bytes / 1024).toFixed(0)} KB) — skipping fetch.`);
      return;
    }
    console.log(`[geo] India basemap looks truncated (${bytes} bytes); re-fetching.`);
  }

  if (!existsSync(outDir)) await mkdir(outDir, { recursive: true });

  try {
    console.log(`[geo] Fetching India admin-1 GeoJSON from Datameet...`);
    const res = await fetch(SOURCE_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const text = await res.text();
    await writeFile(outFile, text);
    console.log(`[geo] Wrote ${outFile} (${(text.length / 1024).toFixed(0)} KB)`);
  } catch (err) {
    // Non-fatal — the map page degrades to its placeholder.
    console.warn(`[geo] Could not fetch basemap: ${err instanceof Error ? err.message : err}`);
    console.warn(`[geo] Build will continue; /map will show the placeholder.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(0); // Never break the build over a missing basemap.
});
