import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { embedDocuments, EMBED_MODEL, toVectorLiteral } from "@/lib/ai/embed";

/**
 * Make a landscape's APPROVED intervention rows searchable: one chunk per row
 * (source_kind 'intervention', source_ref '<slug>:<row_key>'), rendered as a
 * short readable passage with costs, phasing, reach, schemes and tags.
 * Re-run after every approved change; it replaces the landscape's set.
 */

const inr = (n: unknown): string => {
  const v = Number(n);
  if (n === null || n === undefined || !Number.isFinite(v) || v === 0) return "—";
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2).replace(/\.?0+$/, "")} crore`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2).replace(/\.?0+$/, "")} lakh`;
  return `₹${Math.round(v).toLocaleString("en-IN")}`;
};
const cnt = (n: unknown) => (n === null || n === undefined || Number(n) === 0 ? "—" : Number(n).toLocaleString("en-IN"));

type Row = {
  row_key: string; category: string; intervention: string; sub_intervention: string; unit: string | null;
  thematic_investment: string | null; capital_cost: number | null; capital_desc: string | null;
  recurring_per_year: number | null; recurring_years: number | null; unit_cost_total: number | null;
  phase1: Record<string, unknown>; phase2: Record<string, unknown>; totals: Record<string, unknown>; tags: Record<string, unknown>;
};

function render(landscapeName: string, r: Row): { context: string; text: string } {
  const p = (x: Record<string, unknown>, label: string) =>
    `${label}: ${cnt(x.units)} units, ${inr(x.cost)} (government ${inr(x.govt)}, community ${inr(x.community)}, investment required ${inr(x.investment)}); reach ${cnt(x.households)} households, ${cnt(x.hectares)} ha${x.animals ? `, ${cnt(x.animals)} animals` : ""}.`;
  const schemes = [...new Set([r.phase1.govt_scheme, r.phase2.govt_scheme].filter(Boolean))].join("; ");
  const tags = Object.entries(r.tags).filter(([, v]) => v).map(([k, v]) => `${k.replace(/_/g, " ")} ${v}`).join("; ");
  const text = [
    `${r.sub_intervention}${r.unit ? ` (unit: ${r.unit})` : ""}.`,
    `Unit cost ${inr(r.unit_cost_total)}${r.recurring_per_year ? ` (capital ${inr(r.capital_cost)}; recurring ${inr(r.recurring_per_year)} a year for ${r.recurring_years ?? "?"} years)` : ""}.`,
    p(r.phase1, "Phase 1"),
    p(r.phase2, "Phase 2"),
    `Total for the project period: ${inr(r.totals.grand_total)} (government ${inr(r.totals.govt)}, community ${inr(r.totals.community)}, investment required ${inr(r.totals.investment)})${r.totals.payee ? `, paid to ${r.totals.payee}` : ""}.`,
    schemes ? `Government schemes: ${schemes}.` : "",
    tags ? `Tags: ${tags}.` : "",
    r.capital_desc ? `Description and cost build-up: ${r.capital_desc.slice(0, 1500)}` : "",
  ].filter(Boolean).join("\n");
  const context = `${landscapeName} investment plan (approved 5.2 intervention data): ${r.thematic_investment ?? r.category}, ${r.category} > ${r.intervention}.`;
  return { context, text };
}

export async function indexInterventions(landscapeSlug: string, landscapeName: string): Promise<number> {
  const rs = (await db.execute(sql`
    SELECT row_key, category, intervention, sub_intervention, unit, thematic_investment, capital_cost, capital_desc,
           recurring_per_year, recurring_years, unit_cost_total, phase1, phase2, totals, tags
    FROM "cat".interventions WHERE landscape_slug = ${landscapeSlug} ORDER BY sort_order`)) as unknown as { rows: Row[] };
  const items = rs.rows.map((r) => ({ key: r.row_key, ...render(landscapeName, r) }));
  const vectors = await embedDocuments(items.map((i) => `${i.context}\n\n${i.text}`));

  await db.transaction(async (tx) => {
    await tx.execute(sql`DELETE FROM "cat".chunks WHERE source_kind = 'intervention' AND landscape_slug = ${landscapeSlug}`);
    for (let i = 0; i < items.length; i += 50) {
      const values = items.slice(i, i + 50).map((it, j) => sql`(
        'intervention', ${`${landscapeSlug}:${it.key}`}, ${landscapeSlug}, ${i + j}, 'budget', ${it.text}, ${it.context},
        ${Math.ceil(it.text.length / 4)}, true, ${toVectorLiteral(vectors[i + j])}::vector, ${EMBED_MODEL})`);
      await tx.execute(sql`
        INSERT INTO "cat".chunks (source_kind, source_ref, landscape_slug, chunk_index, kind, text, context,
                                  token_count, is_current, embedding, embedding_model)
        VALUES ${sql.join(values, sql`, `)}`);
    }
  });
  return items.length;
}
