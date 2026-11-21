import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { LANDSCAPES } from "@/lib/data/landscapes";

/**
 * Editor approval of intervention (budget table) changes found by the Drive
 * sync. Approving writes the sheet row into cat.interventions (what the site
 * shows); rejecting leaves the approved row as it is. Either way the change and
 * its triage item record who decided and when.
 */

export type PendingChange = {
  id: string;
  landscape_slug: string;
  row_key: string;
  change_type: "add" | "update" | "remove";
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  changed_fields: string[];
  detected_at: string;
};

const rows = <T>(r: unknown) => (r as { rows: T[] }).rows;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function listPendingChanges(): Promise<PendingChange[]> {
  return rows<PendingChange>(await db.execute(sql`
    SELECT id, landscape_slug, row_key, change_type, before, after, changed_fields, detected_at
    FROM "cat".intervention_changes
    WHERE status = 'pending'
    ORDER BY landscape_slug, (coalesce(after, before)->>'sort_order')::int NULLS LAST, row_key`));
}

/** Value at "phase1.cost" style paths, for showing before -> after. */
export function fieldValue(row: Record<string, unknown> | null, path: string): string {
  if (!row) return "";
  const [a, b] = path.split(".");
  const v = b ? (row[a] as Record<string, unknown> | undefined)?.[b] : row[a];
  return v === null || v === undefined ? "" : String(v);
}

export async function decideChanges(opts: {
  ids: string[];
  decision: "approve" | "reject";
  userId: string | null;
  note?: string | null;
}): Promise<{ decided: number; skipped: number; landscapes: string[] }> {
  const ids = [...new Set(opts.ids)].filter((id) => UUID.test(id)).slice(0, 2000);
  if (!ids.length) return { decided: 0, skipped: 0, landscapes: [] };
  const userId = opts.userId && UUID.test(opts.userId) ? opts.userId : null;
  const approve = opts.decision === "approve";
  const touched = new Set<string>();
  let decided = 0;

  await db.transaction(async (tx) => {
    // Lock the rows so two editors can't decide the same change twice.
    const changes = rows<PendingChange>(await tx.execute(sql`
      SELECT id, landscape_slug, row_key, change_type, before, after, changed_fields, detected_at
      FROM "cat".intervention_changes
      WHERE id IN (${sql.join(ids.map((id) => sql`${id}::uuid`), sql`, `)}) AND status = 'pending'
      FOR UPDATE`));

    const batchId = crypto.randomUUID();
    for (const c of changes) {
      if (approve) {
        if (c.change_type === "remove") {
          await tx.execute(sql`DELETE FROM "cat".interventions WHERE landscape_slug = ${c.landscape_slug} AND row_key = ${c.row_key}`);
        } else {
          const r = c.after as Record<string, unknown>;
          const j = (k: string) => JSON.stringify(r[k] ?? {});
          await tx.execute(sql`
            INSERT INTO "cat".interventions
              (landscape_slug, row_key, sort_order, category_no, category, intervention, s_no, sub_intervention, unit,
               thematic_investment, capital_cost, capital_desc, recurring_per_year, recurring_desc, recurring_years,
               recurring_total, unit_cost_total, phase1, phase2, totals, tags, approved_at, approved_by)
            VALUES (${c.landscape_slug}, ${c.row_key}, ${r.sort_order as number}, ${(r.category_no as number) ?? null},
                    ${r.category as string}, ${r.intervention as string}, ${(r.s_no as number) ?? null},
                    ${r.sub_intervention as string}, ${(r.unit as string) ?? null}, ${(r.thematic_investment as string) ?? null},
                    ${(r.capital_cost as number) ?? null}, ${(r.capital_desc as string) ?? null},
                    ${(r.recurring_per_year as number) ?? null}, ${(r.recurring_desc as string) ?? null},
                    ${(r.recurring_years as number) ?? null}, ${(r.recurring_total as number) ?? null},
                    ${(r.unit_cost_total as number) ?? null},
                    ${j("phase1")}::jsonb, ${j("phase2")}::jsonb, ${j("totals")}::jsonb, ${j("tags")}::jsonb, now(), ${userId})
            ON CONFLICT (landscape_slug, row_key) DO UPDATE SET
              sort_order = EXCLUDED.sort_order, category_no = EXCLUDED.category_no, category = EXCLUDED.category,
              intervention = EXCLUDED.intervention, s_no = EXCLUDED.s_no, sub_intervention = EXCLUDED.sub_intervention,
              unit = EXCLUDED.unit, thematic_investment = EXCLUDED.thematic_investment,
              capital_cost = EXCLUDED.capital_cost, capital_desc = EXCLUDED.capital_desc,
              recurring_per_year = EXCLUDED.recurring_per_year, recurring_desc = EXCLUDED.recurring_desc,
              recurring_years = EXCLUDED.recurring_years, recurring_total = EXCLUDED.recurring_total,
              unit_cost_total = EXCLUDED.unit_cost_total, phase1 = EXCLUDED.phase1, phase2 = EXCLUDED.phase2,
              totals = EXCLUDED.totals, tags = EXCLUDED.tags, approved_at = now(), approved_by = EXCLUDED.approved_by`);
        }
        touched.add(c.landscape_slug);
      }
      await tx.execute(sql`
        UPDATE "cat".intervention_changes
        SET status = ${approve ? "approved" : "rejected"}, decided_by = ${userId}, decided_at = now()
        WHERE id = ${c.id}::uuid`);
      const item = rows<{ id: string; status: string }>(await tx.execute(sql`
        UPDATE "cat".triage_items SET status = ${approve ? "accepted" : "dismissed"}, last_status_change_at = now()
        WHERE kind = 'intervention_change' AND ref_id = ${c.id}::uuid
        RETURNING id, status`))[0];
      if (item) {
        await tx.execute(sql`
          INSERT INTO "cat".triage_events (item_id, actor_id, from_status, to_status, note, batch_id)
          VALUES (${item.id}::uuid, ${userId}, 'new', ${item.status}, ${opts.note?.slice(0, 1000) ?? null}, ${batchId}::uuid)`);
      }
      decided++;
    }
  });

  // Keep Ask's budget answers in step with what the site now shows.
  // Best-effort: the approval is already committed.
  if (touched.size) {
    const { indexInterventions } = await import("@/lib/ingest/intervention-chunks");
    for (const slug of touched) {
      try {
        await indexInterventions(slug, LANDSCAPES[slug]?.name ?? slug);
      } catch (e) {
        console.error("[budget-changes] re-index failed for", slug, (e as Error).message);
      }
    }
  }
  return { decided, skipped: ids.length - decided, landscapes: [...touched] };
}
