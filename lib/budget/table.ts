import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * The full approved investment table (cat.interventions): every column of the
 * landscape's "5.2 data" sheet. Used by the admin view and private share links;
 * the public Budget page keeps its summary.
 */

import { type InterventionRecord } from "@/lib/budget/columns";

export { COLUMNS, toNumber, type Column, type InterventionRecord } from "@/lib/budget/columns";

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

/**
 * Rows whose figures changed through an approved sheet edit (Drive sync, not the
 * first baseline load) in the last 90 days, as "<landscape>:<row_key>".
 */
export async function getRecentlyChanged(landscapeSlug: string | null): Promise<string[]> {
  const where = landscapeSlug ? sql`AND landscape_slug = ${landscapeSlug}` : sql``;
  const r = await db.execute(sql`
    SELECT DISTINCT landscape_slug || ':' || row_key AS k FROM "cat".intervention_changes
    WHERE status = 'approved' AND sync_run_id IS NOT NULL AND change_type <> 'remove'
      AND decided_at > now() - interval '90 days' ${where}`);
  return (r as unknown as { rows: { k: string }[] }).rows.map((x) => x.k);
}
