import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * Landscape intervention tables from the "5.2 data - final/Live Google Sheets"
 * (tab "Data", 46 columns, one row per sub-intervention).
 *
 * The approved copy lives in cat.interventions. Each sync compares the sheet
 * with it; differences become cat.intervention_changes (pending) plus a triage
 * item, and only an editor's approval updates what the site shows.
 */

export type InterventionRow = {
  row_key: string;
  sort_order: number;
  category_no: number | null;
  category: string;
  intervention: string;
  s_no: number | null;
  sub_intervention: string;
  unit: string | null;
  thematic_investment: string | null;
  capital_cost: number | null;
  capital_desc: string | null;
  recurring_per_year: number | null;
  recurring_desc: string | null;
  recurring_years: number | null;
  recurring_total: number | null;
  unit_cost_total: number | null;
  phase1: Record<string, string | number | null>;
  phase2: Record<string, string | number | null>;
  totals: Record<string, string | number | null>;
  tags: Record<string, string | null>;
};

const num = (v: string | undefined): number | null => {
  const s = (v ?? "").replace(/[,\s₹]|rs\.?/gi, "").trim();
  if (!s || s === "-" || s === "–") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
const txt = (v: string | undefined): string | null => {
  const s = (v ?? "").trim();
  return !s || s === "-" ? null : s;
};

export function parseInterventionSheet(values: string[][]): InterventionRow[] {
  const [header, ...data] = values;
  const col = (name: string) => {
    const i = header.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());
    if (i < 0) throw new Error(`Sheet column missing: ${name}`);
    return i;
  };
  const C = {
    catNo: col("Category No."), cat: col("Category"), int: col("Intervention"), sNo: col("S. No"),
    sub: col("Sub Intervention"), theme: col("Thematic investment"),
    cap: col("Capital / one-time cost"), capDesc: col("Description Capital / One-time cost"),
    rec: col("Per year recurring cost"), recDesc: col("Description Recurring cost"), years: col("No of years"),
    recTotal: col("Total recurring cost per unit"), unitTotal: col("Total Per Unit cost"),
    grand: col("Grand Total"), payee: col("To whom the fund provider pays"),
    climate: col("Climate"), equity: col("Equity"), gender: col("Gender"),
    purpose: col("Economic purpose"), institution: col("Institution type"), capital: col("Capital"),
  };
  const phase = (p: 1 | 2, r: string[]) => {
    const k = `Phase ${p} _`;
    const g = (n: string) => r[col(k + n)];
    return {
      units: num(g(p === 1 ? "No of units" : "No of unit")),
      cost: num(g("Total intervention cost")),
      govt: num(g("Government")),
      govt_scheme: txt(g("Govt Scheme description")),
      community: num(g("Community")),
      investment: num(g("Investment Required")),
      households: num(g("Impact no Household")),
      hectares: num(g("Impact no Hectares")),
      animals: num(g("Impact no Animals")),
      payee: txt(g("To whom the fund provider pays")),
    };
  };

  const out: InterventionRow[] = [];
  const seen = new Map<string, number>();
  data.forEach((r, i) => {
    if (!r.some((c) => c?.trim())) return;
    const sub = (r[C.sub] ?? "").trim();
    if (!sub) return;
    const catNo = num(r[C.catNo]);
    const sNo = num(r[C.sNo]);
    let key = `${catNo ?? "x"}.${sNo ?? i + 1}`;
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    if (n > 1) key = `${key}#${n}`;
    const unit = sub.match(/\[unit:\s*([^\]]+)\]/i)?.[1]?.trim() ?? null;
    out.push({
      row_key: key,
      sort_order: out.length,
      category_no: catNo,
      category: (r[C.cat] ?? "").trim(),
      intervention: (r[C.int] ?? "").trim(),
      s_no: sNo,
      sub_intervention: sub.replace(/\s*\[unit:[^\]]+\]\s*/i, "").trim(),
      unit,
      thematic_investment: txt(r[C.theme]),
      capital_cost: num(r[C.cap]),
      capital_desc: txt(r[C.capDesc]),
      recurring_per_year: num(r[C.rec]),
      recurring_desc: txt(r[C.recDesc]),
      recurring_years: num(r[C.years]),
      recurring_total: num(r[C.recTotal]),
      unit_cost_total: num(r[C.unitTotal]),
      phase1: phase(1, r),
      phase2: phase(2, r),
      totals: {
        cost: num(r[col("Total intervention cost for project period")]),
        govt: num(r[col("Total Govt")]),
        community: num(r[col("Total Community")]),
        investment: num(r[col("Total Investment Required")]),
        grand_total: num(r[C.grand]),
        payee: txt(r[C.payee]),
      },
      tags: {
        climate: txt(r[C.climate]), equity: txt(r[C.equity]), gender: txt(r[C.gender]),
        economic_purpose: txt(r[C.purpose]), institution_type: txt(r[C.institution]), capital: txt(r[C.capital]),
      },
    });
  });
  return out;
}

const FIELDS: (keyof InterventionRow)[] = [
  "category_no", "category", "intervention", "s_no", "sub_intervention", "unit", "thematic_investment",
  "capital_cost", "capital_desc", "recurring_per_year", "recurring_desc", "recurring_years", "recurring_total",
  "unit_cost_total", "phase1", "phase2", "totals", "tags", "sort_order",
];

function changedFields(a: Record<string, unknown>, b: InterventionRow): string[] {
  const out: string[] = [];
  for (const f of FIELDS) {
    const x = a[f], y = b[f];
    if (y && typeof y === "object") {
      const xo = (x ?? {}) as Record<string, unknown>;
      for (const k of Object.keys(y)) if (String(xo[k] ?? "") !== String((y as Record<string, unknown>)[k] ?? "")) out.push(`${f}.${k}`);
    } else if (String(x ?? "") !== String(y ?? "") && !(x !== null && y !== null && Number(x) === Number(y))) out.push(f);
  }
  return out;
}

const rows = <T>(r: unknown) => (r as { rows: T[] }).rows;

/**
 * Compare a landscape's sheet with its approved rows.
 * - approveBaseline: first load only (no approved rows yet). Writes the sheet
 *   straight in as the approved baseline, recorded as approved changes.
 * - otherwise: each difference becomes a pending change + triage item.
 */
export async function stageInterventions(opts: {
  landscapeSlug: string;
  sheet: InterventionRow[];
  driveFileId: string;
  syncRunId?: string | null;
  approveBaseline?: boolean;
  approvedBy?: string | null;
}): Promise<{ added: number; updated: number; removed: number; unchanged: number; mode: "baseline" | "pending" }> {
  const approved = rows<Record<string, unknown> & { row_key: string }>(
    await db.execute(sql`SELECT * FROM "cat".interventions WHERE landscape_slug = ${opts.landscapeSlug}`),
  );
  const byKey = new Map(approved.map((r) => [r.row_key, r]));
  const sheetKeys = new Set(opts.sheet.map((r) => r.row_key));
  const stats = { added: 0, updated: 0, removed: 0, unchanged: 0 };

  if (opts.approveBaseline && approved.length) throw new Error(`${opts.landscapeSlug} already has approved rows; baseline approval is for the first load only`);
  const baseline = !!opts.approveBaseline;

  await db.transaction(async (tx) => {
    const record = async (rowKey: string, type: "add" | "update" | "remove", before: unknown, after: unknown, fields: string[]) => {
      // The daily sync re-reads unchanged sheets: an identical pending change
      // is left alone (no churn, no duplicate triage items).
      const same = rows<{ id: string }>(await tx.execute(sql`
        SELECT id FROM "cat".intervention_changes
        WHERE landscape_slug = ${opts.landscapeSlug} AND row_key = ${rowKey} AND status = 'pending'
          AND change_type = ${type} AND after IS NOT DISTINCT FROM ${after === null ? null : JSON.stringify(after)}::jsonb`))[0];
      if (same) return;
      // A newer sync supersedes an older pending change for the same row.
      await tx.execute(sql`UPDATE "cat".intervention_changes SET status = 'superseded'
        WHERE landscape_slug = ${opts.landscapeSlug} AND row_key = ${rowKey} AND status = 'pending'`);
      const ch = rows<{ id: string }>(await tx.execute(sql`
        INSERT INTO "cat".intervention_changes
          (landscape_slug, row_key, change_type, before, after, changed_fields, status, sync_run_id, decided_by, decided_at)
        VALUES (${opts.landscapeSlug}, ${rowKey}, ${type},
                ${before === null ? null : JSON.stringify(before)}::jsonb, ${after === null ? null : JSON.stringify(after)}::jsonb,
                ARRAY[${sql.join(fields.map((f) => sql`${f}`), sql`, `)}]::text[], ${baseline ? "approved" : "pending"}, ${opts.syncRunId ?? null},
                ${baseline ? opts.approvedBy ?? null : null}, ${baseline ? new Date() : null})
        RETURNING id`))[0];
      if (!baseline) {
        const title = `${opts.landscapeSlug}: ${type} ${((after ?? before) as { sub_intervention?: string })?.sub_intervention ?? rowKey}`.slice(0, 200);
        await tx.execute(sql`
          INSERT INTO "cat".triage_items (kind, ref_id, title, priority)
          VALUES ('intervention_change', ${ch.id}, ${title}, ${fields.some((f) => /cost|govt|community|investment|grand_total|units/.test(f)) ? "high" : "normal"})
          ON CONFLICT (kind, ref_id) DO NOTHING`);
      }
    };

    for (const r of opts.sheet) {
      const prev = byKey.get(r.row_key);
      if (!prev) { stats.added++; await record(r.row_key, "add", null, r, ["*"]); }
      else {
        const f = changedFields(prev, r);
        if (!f.length) { stats.unchanged++; continue; }
        stats.updated++; await record(r.row_key, "update", prev, r, f);
      }
      if (baseline) {
        await tx.execute(sql`
          INSERT INTO "cat".interventions
            (landscape_slug, row_key, sort_order, category_no, category, intervention, s_no, sub_intervention, unit,
             thematic_investment, capital_cost, capital_desc, recurring_per_year, recurring_desc, recurring_years,
             recurring_total, unit_cost_total, phase1, phase2, totals, tags, source_drive_file_id, approved_by)
          VALUES (${opts.landscapeSlug}, ${r.row_key}, ${r.sort_order}, ${r.category_no}, ${r.category}, ${r.intervention},
                  ${r.s_no}, ${r.sub_intervention}, ${r.unit}, ${r.thematic_investment}, ${r.capital_cost}, ${r.capital_desc},
                  ${r.recurring_per_year}, ${r.recurring_desc}, ${r.recurring_years}, ${r.recurring_total}, ${r.unit_cost_total},
                  ${JSON.stringify(r.phase1)}::jsonb, ${JSON.stringify(r.phase2)}::jsonb, ${JSON.stringify(r.totals)}::jsonb,
                  ${JSON.stringify(r.tags)}::jsonb, ${opts.driveFileId}, ${opts.approvedBy ?? null})`);
      }
    }
    for (const prev of approved) {
      if (sheetKeys.has(prev.row_key)) continue;
      stats.removed++; await record(prev.row_key, "remove", prev, null, ["*"]);
    }
  });
  return { ...stats, mode: baseline ? "baseline" : "pending" };
}
