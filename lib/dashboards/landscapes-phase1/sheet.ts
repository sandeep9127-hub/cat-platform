import { readSheetValues } from "@/lib/ingest/drive";

/**
 * "All landscapes, Phase 1": parsing of the All-Landscape Phase 1 Google Sheet.
 * The sheet is read only on demand, server-side with the Hub's service account
 * (admin "Update from sheet" or scripts/sync-phase1.ts); if its layout changes,
 * parsing refuses with a clear error. Pages read the published snapshot.
 */
export const SHEET_ID = "1dzLC3cW9tmYb8mbXbBuPV3O75RCjC5ZCcj6IlrvWFaA";
const DASHBOARD_RANGE = "Dashboard!A1:P150";
const DATA_RANGE = "Data!A1:V700";

export const AGG_COLUMNS = ["All Landscapes", "Average (nil left out)", "Minimum (nil left out)", "Maximum"] as const;
export const DATA_COLUMNS = [
  "Landscape", "S. No", "Category", "Sub Intervention", "Thematic Investment", "Climate", "Equity", "Gender",
  "Economic Purpose", "Institution Type", "Capital", "Biodiversity Class", "CSO line", "MAP line",
  "Total Cost (Rs)", "Phase 1 Cost (Rs)", "Phase 1 Govt (Rs)", "Phase 1 Community (Rs)",
  "Phase 1 Investment Required (Rs)", "Total Govt (Rs)", "Total Community (Rs)", "Total Investment Required (Rs)",
] as const;

/** Sheet landscape name for each Hub landscape slug (the sheet calls Khatarshnong–Laitkroh "Khasi"). */
export const SLUG_TO_SHEET: Record<string, string> = {
  vempalli: "Vempalli", dharashiv: "Dharashiv", ahwa: "Ahwa", dantewada: "Dantewada", rajnagar: "Rajnagar",
  patratu: "Patratu", chitrakonda: "Chitrakonda", mau: "Mau", "khatarshnong-laitkroh": "Khasi", patharpratima: "Patharpratima",
};
export const SHEET_TO_SLUG: Record<string, string> = Object.fromEntries(Object.entries(SLUG_TO_SHEET).map(([k, v]) => [v, k]));

export type MetricRow = { sn: string; section: string; metric: string } & Record<string, number | null | string>;
export type LineRow = Record<string, string | number | null>;
export type CatCell = { Landscape: string; Category: string; phase1: number };

export type SheetData = {
  landscapes: { columns: string[]; rows: MetricRow[] };
  lines: { columns: string[]; rows: LineRow[] };
  /** Phase 1 cost by landscape and category: aggregated from the lines, safe to show publicly. */
  cats: CatCell[];
  fetchedAt: string;
};

export class SheetLayoutError extends Error {}

const num = (s: unknown): number | null => {
  if (s == null) return null;
  const t = String(s).trim();
  if (t === "" || t === "-") return null;
  const v = Number(t.replace(/[,%\s]/g, ""));
  return Number.isFinite(v) ? v : null;
};

/** Dashboard tab: one row per metric with its section heading carried down. */
export function parseDashboard(vals: string[][]): SheetData["landscapes"] {
  const hi = vals.findIndex((r) => r && String(r[0]).trim() === "SN");
  if (hi < 0) throw new SheetLayoutError('Dashboard tab: no header row starting with "SN".');
  const headRow = vals[hi].map((h) => String(h ?? "").trim());
  if (headRow[1] !== "Metric") throw new SheetLayoutError(`Dashboard tab: second header should be "Metric", found "${headRow[1] ?? ""}".`);
  const head = headRow.slice(2, 16);
  const lands = head.slice(0, head.length - AGG_COLUMNS.length);
  const tail = head.slice(-AGG_COLUMNS.length);
  if (head.length !== 14 || AGG_COLUMNS.some((c, i) => tail[i] !== c)) {
    throw new SheetLayoutError(`Dashboard tab: expected 10 landscapes then ${AGG_COLUMNS.join(", ")}; found ${head.join(", ")}.`);
  }
  if (lands.some((l) => !l)) throw new SheetLayoutError("Dashboard tab: a landscape column has no name.");
  let section = "";
  const rows: MetricRow[] = [];
  for (const r of vals.slice(hi + 1)) {
    if (!r || !r.length) continue;
    const a = String(r[0] ?? "").trim();
    const b = String(r[1] ?? "").trim();
    if (a && !b) { section = a; continue; }
    if (!a) continue; // "Total (should be 100%)" rows and notes
    const o = { sn: a, section, metric: b } as MetricRow;
    head.forEach((h, i) => { o[h] = num(r[i + 2]); });
    rows.push(o);
  }
  for (const sn of ["1", "2", "3", "4", "5", "6", "7", "7a", "7b"]) {
    if (!rows.some((r) => r.sn === sn)) throw new SheetLayoutError(`Dashboard tab: metric row SN ${sn} is missing.`);
  }
  return { columns: ["sn", "section", "metric", ...head], rows };
}

/** Data tab: one row per cost line; "(Rs)" columns are numbers, "-" or blank is nil. */
export function parseData(vals: string[][]): SheetData["lines"] {
  if (!vals.length) throw new SheetLayoutError("Data tab returned no rows.");
  const head = vals[0].map((h) => String(h ?? "").trim());
  const bad = DATA_COLUMNS.filter((c, i) => head[i] !== c);
  if (bad.length) {
    throw new SheetLayoutError(`Data tab: columns changed. Expected ${DATA_COLUMNS.join(", ")}; found ${head.slice(0, 22).join(", ")}.`);
  }
  const money = head.map((h) => /\(Rs\)$/.test(h));
  const rows: LineRow[] = [];
  for (const r of vals.slice(1)) {
    if (!r || !String(r[0] ?? "").trim()) continue;
    const o: LineRow = {};
    head.forEach((h, i) => {
      if (!h) return;
      const s = String(r[i] ?? "").trim();
      if (money[i]) {
        const v = s === "" || s === "-" ? null : Number(s.replace(/[,\s]/g, ""));
        o[h] = v != null && Number.isFinite(v) ? v : null;
      } else o[h] = s;
    });
    rows.push(o);
  }
  return { columns: head.filter(Boolean), rows };
}

export function categoryMatrix(lines: LineRow[]): CatCell[] {
  const m = new Map<string, CatCell>();
  for (const r of lines) {
    const land = String(r.Landscape);
    const cat = String(r.Category || "") || "(no category)";
    const k = land + "\u0000" + cat;
    const c = m.get(k) ?? { Landscape: land, Category: cat, phase1: 0 };
    c.phase1 += Number(r["Phase 1 Cost (Rs)"] || 0);
    m.set(k, c);
  }
  return [...m.values()];
}

/** Read and parse the sheet now (admin "Update from sheet" and scripts only; pages read the published snapshot). */
export async function fetchSheetLive(): Promise<SheetData> {
  const [dash, data] = await Promise.all([readSheetValues(SHEET_ID, DASHBOARD_RANGE), readSheetValues(SHEET_ID, DATA_RANGE)]);
  const landscapes = parseDashboard(dash);
  const lines = parseData(data);
  return { landscapes, lines, cats: categoryMatrix(lines.rows), fetchedAt: new Date().toISOString() };
}

/**
 * The published snapshot, as the dashboard and the public pages see it. Cached
 * until a publish or restore calls revalidateTag(PHASE1_TAG).
 */
export async function getPhase1Data(): Promise<{ ok: true; data: SheetData } | { ok: false; error: string }> {
  try {
    const { getPublishedSnapshot } = await import("./snapshot");
    const snap = await getPublishedSnapshot();
    if (!snap) return { ok: false, error: "No Phase 1 data has been published yet. An admin can load it with “Update from sheet”." };
    return { ok: true, data: snap.data };
  } catch (e) {
    console.error("[dashboard landscapes-phase-1] snapshot load failed:", (e as Error).message);
    return { ok: false, error: "The investment figures couldn't load right now." };
  }
}

/* ---------- One landscape, for its public Budget tab and overview ---------- */

export type LandscapeSummary = {
  sheetName: string;
  /** Dashboard-tab metrics for this landscape only (SN → value). */
  metric: Record<string, number | null>;
  /** Phase 1 cost by category, with each category's share of this landscape's lines (rounded to 0.1, as on the profile tab). */
  categories: { Category: string; phase1: number; share: number | null }[];
};

/** The public summary for one Hub landscape, or null when the sheet doesn't cover it (e.g. Pangi). */
export async function getLandscapeSummary(slug: string): Promise<{ ok: true; data: LandscapeSummary | null } | { ok: false; error: string }> {
  const sheetName = Object.hasOwn(SLUG_TO_SHEET, slug) ? SLUG_TO_SHEET[slug] : null;
  if (!sheetName) return { ok: true, data: null };
  const res = await getPhase1Data();
  if (!res.ok) return res;
  const { landscapes, cats } = res.data;
  if (!landscapes.columns.includes(sheetName)) return { ok: true, data: null };
  const metric: Record<string, number | null> = {};
  for (const r of landscapes.rows) metric[r.sn] = (r[sheetName] as number | null) ?? null;
  const mine = cats.filter((c) => c.Landscape === sheetName);
  const total = mine.reduce((t, c) => t + (c.phase1 || 0), 0);
  const categories = mine
    .map((c) => ({ Category: c.Category, phase1: c.phase1, share: total ? Math.round((c.phase1 / total) * 1000) / 10 : null }))
    .sort((a, b) => b.phase1 - a.phase1);
  return { ok: true, data: { sheetName, metric, categories } };
}
