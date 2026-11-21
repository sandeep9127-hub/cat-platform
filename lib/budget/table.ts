import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * The full approved investment table (cat.interventions): every column of the
 * landscape's "5.2 data" sheet. Used by the admin view and private share links;
 * the public Budget page keeps its summary.
 */

export type InterventionRecord = {
  landscape_slug: string;
  row_key: string;
  category: string;
  intervention: string;
  sub_intervention: string;
  unit: string | null;
  thematic_investment: string | null;
  capital_cost: string | null;
  capital_desc: string | null;
  recurring_per_year: string | null;
  recurring_desc: string | null;
  recurring_years: number | null;
  recurring_total: string | null;
  unit_cost_total: string | null;
  phase1: Record<string, string | number | null>;
  phase2: Record<string, string | number | null>;
  totals: Record<string, string | number | null>;
  tags: Record<string, string | null>;
  approved_at: string;
};

export type Column = {
  key: string;
  label: string;
  group: "Intervention" | "Unit cost" | "Phase 1" | "Phase 2" | "Totals" | "Tags";
  kind: "text" | "money" | "number" | "long";
  get: (r: InterventionRecord) => string | number | null;
};

const PHASE = (p: "phase1" | "phase2", group: Column["group"]): Column[] => [
  { key: `${p}.units`, label: "Units", group, kind: "number", get: (r) => r[p]?.units ?? null },
  { key: `${p}.households`, label: "Households", group, kind: "number", get: (r) => r[p]?.households ?? null },
  { key: `${p}.hectares`, label: "Hectares", group, kind: "number", get: (r) => r[p]?.hectares ?? null },
  { key: `${p}.animals`, label: "Animals", group, kind: "number", get: (r) => r[p]?.animals ?? null },
  { key: `${p}.cost`, label: "Cost", group, kind: "money", get: (r) => r[p]?.cost ?? null },
  { key: `${p}.govt`, label: "Government", group, kind: "money", get: (r) => r[p]?.govt ?? null },
  { key: `${p}.govt_scheme`, label: "Government scheme", group, kind: "long", get: (r) => r[p]?.govt_scheme ?? null },
  { key: `${p}.community`, label: "Community", group, kind: "money", get: (r) => r[p]?.community ?? null },
  { key: `${p}.investment`, label: "Investment ask", group, kind: "money", get: (r) => r[p]?.investment ?? null },
  { key: `${p}.payee`, label: "Payee", group, kind: "text", get: (r) => r[p]?.payee ?? null },
];

export const COLUMNS: Column[] = [
  { key: "row_key", label: "No.", group: "Intervention", kind: "text", get: (r) => r.row_key },
  { key: "category", label: "Category", group: "Intervention", kind: "text", get: (r) => r.category },
  { key: "intervention", label: "Intervention", group: "Intervention", kind: "text", get: (r) => r.intervention },
  { key: "sub_intervention", label: "Sub-intervention", group: "Intervention", kind: "text", get: (r) => r.sub_intervention },
  { key: "unit", label: "Unit", group: "Intervention", kind: "text", get: (r) => r.unit },
  { key: "thematic_investment", label: "Thematic investment", group: "Intervention", kind: "text", get: (r) => r.thematic_investment },
  { key: "capital_cost", label: "Capital cost", group: "Unit cost", kind: "money", get: (r) => r.capital_cost },
  { key: "capital_desc", label: "Cost build-up", group: "Unit cost", kind: "long", get: (r) => r.capital_desc },
  { key: "recurring_per_year", label: "Recurring / year", group: "Unit cost", kind: "money", get: (r) => r.recurring_per_year },
  { key: "recurring_desc", label: "Recurring description", group: "Unit cost", kind: "long", get: (r) => r.recurring_desc },
  { key: "recurring_years", label: "Years", group: "Unit cost", kind: "number", get: (r) => r.recurring_years },
  { key: "recurring_total", label: "Recurring total", group: "Unit cost", kind: "money", get: (r) => r.recurring_total },
  { key: "unit_cost_total", label: "Unit cost total", group: "Unit cost", kind: "money", get: (r) => r.unit_cost_total },
  ...PHASE("phase1", "Phase 1"),
  ...PHASE("phase2", "Phase 2"),
  { key: "totals.cost", label: "Cost", group: "Totals", kind: "money", get: (r) => r.totals?.cost ?? null },
  { key: "totals.govt", label: "Government", group: "Totals", kind: "money", get: (r) => r.totals?.govt ?? null },
  { key: "totals.community", label: "Community", group: "Totals", kind: "money", get: (r) => r.totals?.community ?? null },
  { key: "totals.investment", label: "Investment ask", group: "Totals", kind: "money", get: (r) => r.totals?.investment ?? null },
  { key: "totals.grand_total", label: "Grand total", group: "Totals", kind: "money", get: (r) => r.totals?.grand_total ?? null },
  { key: "totals.payee", label: "Payee", group: "Totals", kind: "text", get: (r) => r.totals?.payee ?? null },
  { key: "tags.climate", label: "Climate", group: "Tags", kind: "text", get: (r) => r.tags?.climate ?? null },
  { key: "tags.equity", label: "Equity", group: "Tags", kind: "text", get: (r) => r.tags?.equity ?? null },
  { key: "tags.gender", label: "Gender", group: "Tags", kind: "text", get: (r) => r.tags?.gender ?? null },
  { key: "tags.economic_purpose", label: "Economic purpose", group: "Tags", kind: "text", get: (r) => r.tags?.economic_purpose ?? null },
  { key: "tags.institution_type", label: "Institution type", group: "Tags", kind: "text", get: (r) => r.tags?.institution_type ?? null },
  { key: "tags.capital", label: "Capital", group: "Tags", kind: "text", get: (r) => r.tags?.capital ?? null },
];

export const toNumber = (v: string | number | null | undefined): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export async function getInterventions(landscapeSlug: string | null): Promise<InterventionRecord[]> {
  const where = landscapeSlug ? sql`WHERE landscape_slug = ${landscapeSlug}` : sql``;
  const r = await db.execute(sql`
    SELECT landscape_slug, row_key, category, intervention, sub_intervention, unit, thematic_investment,
           capital_cost, capital_desc, recurring_per_year, recurring_desc, recurring_years, recurring_total,
           unit_cost_total, phase1, phase2, totals, tags, approved_at
    FROM "cat".interventions ${where}
    ORDER BY landscape_slug, sort_order`);
  return (r as unknown as { rows: InterventionRecord[] }).rows;
}

export type LandscapeBudgetSummary = { landscape_slug: string; rows: number; grand_total: number; last_approved: string };

export async function getBudgetSummaries(): Promise<LandscapeBudgetSummary[]> {
  const r = await db.execute(sql`
    SELECT landscape_slug, count(*)::int AS rows,
           coalesce(sum((totals->>'grand_total')::numeric), 0)::float8 AS grand_total,
           max(approved_at) AS last_approved
    FROM "cat".interventions GROUP BY 1 ORDER BY 1`);
  return (r as unknown as { rows: LandscapeBudgetSummary[] }).rows;
}

/** CSV of the full table (UTF-8 with BOM so Excel reads ₹ and Indian names). */
export function toCsv(rows: InterventionRecord[], landscapeName: (slug: string) => string): string {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    // Neutralise spreadsheet formulas in text cells.
    const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d/.test(s) ? `'${s}` : s;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const header = ["Landscape", ...COLUMNS.map((c) => (c.group === "Intervention" ? c.label : `${c.group}: ${c.label}`))];
  const lines = [header.map(esc).join(",")];
  for (const r of rows) lines.push([landscapeName(r.landscape_slug), ...COLUMNS.map((c) => c.get(r))].map(esc).join(","));
  return "﻿" + lines.join("\r\n");
}
