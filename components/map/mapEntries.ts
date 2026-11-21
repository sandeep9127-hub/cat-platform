import type { MapEntry, MapPoint } from "./IndiaMap";

/**
 * Turns a fact-sheet row into a Solutions Atlas map entry, and decides which
 * programmes belong on the map versus the "Nationwide" strip.
 *
 * Placement fields are being added to the fact-sheet data separately
 * (geo_precision, district-centroid lat/lon, a points list for multi-district
 * programmes, households for reach). They are read loosely here so this works
 * before and after that change:
 *   - no geo_precision: anything with lat/lon is treated as 'state';
 *   - geo_precision 'national', or a national/multi-state scale with no state,
 *     goes to the Nationwide strip, not the map.
 */
type FactSheetLike = {
  slug: string;
  title: string;
  scale_band: string | null;
  state_code: string | null;
  latitude: number | null;
  longitude: number | null;
  themes: string[] | null;
  metrics?: { label: string; value: string }[] | null;
};

type Loose = Record<string, unknown>;

const num = (v: unknown): number | null => (typeof v === "number" && isFinite(v) ? v : null);

function readPoints(raw: unknown): MapPoint[] {
  if (!Array.isArray(raw)) return [];
  const out: MapPoint[] = [];
  for (const p of raw) {
    if (!p || typeof p !== "object") continue;
    const o = p as Loose;
    const lat = num(o.lat) ?? num(o.latitude);
    const lon = num(o.lon) ?? num(o.lng) ?? num(o.longitude);
    if (lat != null && lon != null) out.push({ lat, lon });
  }
  return out;
}

/** "1.77 million+", "6L+", "2 lakh", "12,400" -> a number; null if unreadable. */
export function parseCount(v: string | null | undefined): number | null {
  if (!v) return null;
  const m = String(v).toLowerCase().replace(/,/g, "").match(/([\d.]+)\s*(million|mn|m\b|lakh|lac|l\b|crore|cr\b|k\b|thousand)?/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!isFinite(n)) return null;
  const mult: Record<string, number> = {
    million: 1e6, mn: 1e6, m: 1e6, lakh: 1e5, lac: 1e5, l: 1e5, crore: 1e7, cr: 1e7, k: 1e3, thousand: 1e3,
  };
  return Math.round(n * (m[2] ? mult[m[2]] ?? 1 : 1));
}

/** Households reached: an explicit field if present, else a "households" headline metric. */
function readReach(f: FactSheetLike & Loose): number | null {
  const direct = num(f.households) ?? num(f.households_reached) ?? num(f.reach);
  if (direct != null) return direct;
  const m = (f.metrics ?? []).find((x) => /household/i.test(x?.label ?? ""));
  return m ? parseCount(m.value) : null;
}

export function factsheetToMapEntry(sheet: FactSheetLike): MapEntry {
  const f = sheet as FactSheetLike & Loose;
  const gp = f.geo_precision;
  const geoPrecision =
    gp === "district" || gp === "state" || gp === "national" ? gp : undefined;
  return {
    id: f.slug,
    slug: f.slug,
    title: f.title,
    scaleBand: f.scale_band ?? "multi_district",
    provenance: "sourced",
    stateCode: f.state_code ?? "",
    latitude: f.latitude,
    longitude: f.longitude,
    internalHref: `/factsheet/${f.slug}`,
    themes: f.themes ?? [],
    geoPrecision,
    points: readPoints(f.points),
    reach: readReach(f),
  };
}

/** National or multi-state programmes with no single place: shown in the strip. */
export function isNationwide(e: MapEntry): boolean {
  if (e.geoPrecision === "national") return true;
  if (e.geoPrecision) return false;
  return (e.scaleBand === "national" || e.scaleBand === "multi_state") && !e.stateCode;
}

export function hasMapPoint(e: MapEntry): boolean {
  return (e.points?.length ?? 0) > 0 || (e.latitude != null && e.longitude != null);
}

/** Split fact sheets into map entries and Nationwide-strip entries. */
export function splitAtlasEntries(sheets: FactSheetLike[]) {
  const all = sheets.map(factsheetToMapEntry);
  return {
    mapped: all.filter((e) => !isNationwide(e) && hasMapPoint(e)),
    nationwide: all.filter(isNationwide),
  };
}
