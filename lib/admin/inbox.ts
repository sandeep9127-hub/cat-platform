import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { LANDSCAPES } from "@/lib/data/landscapes";

/**
 * One list of everything waiting for an editor, oldest first. Each item links to
 * the screen where it's decided; assignment and snoozing are kept in
 * cat.triage_items (one row per item, created on first use).
 */

export type InboxKind =
  | "budget_changes" | "access_request" | "org_submission" | "discovery_candidate" | "factsheet_review" | "source_change";

export const KIND_LABEL: Record<InboxKind, string> = {
  budget_changes: "Budget changes",
  access_request: "Access request",
  org_submission: "Organisation submission",
  discovery_candidate: "Discovery candidate",
  factsheet_review: "Flagged fact sheet",
  source_change: "Source change",
};

export type InboxItem = {
  kind: InboxKind;
  ref_id: string;
  title: string;
  detail: string | null;
  created_at: string;
  href: string;
  assigned_to: string | null;
  assigned_email: string | null;
  snoozed_until: string | null;
};

const rows = <T>(r: unknown) => (r as { rows: T[] }).rows;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ASSIGNABLE = new Set<InboxKind>(["access_request", "org_submission", "discovery_candidate", "factsheet_review", "source_change"]);

export async function listInbox(): Promise<InboxItem[]> {
  const items = rows<InboxItem>(await db.execute(sql`
    WITH waiting AS (
      SELECT 'access_request' AS kind, r.id AS ref_id, r.name || ', ' || r.organisation AS title,
             coalesce(r.landscape_slug, 'all landscapes') AS detail, r.created_at, '/admin/access-requests' AS href
      FROM "cat".access_requests r WHERE r.status = 'pending'
      UNION ALL
      SELECT 'org_submission', s.id, coalesce(s.name, 'Organisation'), s.submission_type, s.created_at, '/admin/submissions'
      FROM "cat".org_submissions s WHERE s.status = 'pending'
      UNION ALL
      SELECT 'discovery_candidate', c.id, c.proposed_title,
             coalesce(c.proposed_state_code, '') || CASE WHEN c.confidence_score IS NOT NULL THEN ' · confidence ' || round((c.confidence_score * 100)::numeric) || '%' ELSE '' END,
             c.created_at, '/admin/candidates'
      FROM "cat".discovery_candidates c WHERE c.status = 'pending_triage'
      UNION ALL
      SELECT 'factsheet_review', f.id, f.title, f.state_code, f.created_at, '/admin/factsheets/' || f.slug || '/edit'
      FROM "cat".solution_factsheets f WHERE f.status = 'flagged'
      UNION ALL
      SELECT 'source_change', fl.id, e.title, fl.source_url, fl.detected_at, '/admin/source-changes'
      FROM "cat".freshness_flags fl JOIN "cat".entries e ON e.id = fl.entry_id WHERE fl.status = 'pending_review'
    )
    SELECT w.kind, w.ref_id::text, w.title, w.detail, w.created_at, w.href,
           t.assigned_to::text, u.email AS assigned_email, t.snoozed_until
    FROM waiting w
    LEFT JOIN "cat".triage_items t ON t.kind = w.kind AND t.ref_id = w.ref_id
    LEFT JOIN "cat".users u ON u.id = t.assigned_to
    ORDER BY w.created_at
    LIMIT 500`));

  // Budget changes: one item per landscape (decided together on their own screen).
  const budget = rows<{ landscape_slug: string; n: number; oldest: string }>(await db.execute(sql`
    SELECT landscape_slug, count(*)::int AS n, min(detected_at) AS oldest
    FROM "cat".intervention_changes WHERE status = 'pending' GROUP BY 1`));
  for (const b of budget) {
    items.push({
      kind: "budget_changes", ref_id: b.landscape_slug, title: `${LANDSCAPES[b.landscape_slug]?.name ?? b.landscape_slug}: ${b.n} change${b.n === 1 ? "" : "s"} to the budget table`,
      detail: null, created_at: b.oldest, href: "/admin/budget-changes", assigned_to: null, assigned_email: null, snoozed_until: null,
    });
  }
  return items.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

/** Assign to someone (or nobody), or snooze until a date (or clear it). Creates the triage row on first use. */
export async function updateInboxItem(opts: {
  kind: InboxKind; refId: string; title: string; actorId: string | null;
  assignTo?: string | null; snoozeDays?: number | null;
}): Promise<void> {
  if (!ASSIGNABLE.has(opts.kind) || !UUID.test(opts.refId)) return;
  const actor = opts.actorId && UUID.test(opts.actorId) ? opts.actorId : null;
  const item = rows<{ id: string; status: string }>(await db.execute(sql`
    INSERT INTO "cat".triage_items (kind, ref_id, title)
    VALUES (${opts.kind}, ${opts.refId}::uuid, ${opts.title.slice(0, 200)})
    ON CONFLICT (kind, ref_id) DO UPDATE SET title = EXCLUDED.title
    RETURNING id, status`))[0];
  if (opts.assignTo !== undefined) {
    const to = opts.assignTo && UUID.test(opts.assignTo) ? opts.assignTo : null;
    await db.execute(sql`UPDATE "cat".triage_items SET assigned_to = ${to}, status = ${to ? "in_review" : "new"}, last_status_change_at = now() WHERE id = ${item.id}::uuid`);
    await db.execute(sql`INSERT INTO "cat".triage_events (item_id, actor_id, from_status, to_status, note)
      VALUES (${item.id}::uuid, ${actor}, ${item.status}, ${to ? "in_review" : "new"}, ${to ? "assigned" : "unassigned"})`);
  }
  if (opts.snoozeDays !== undefined) {
    const days = opts.snoozeDays && opts.snoozeDays > 0 ? Math.min(90, Math.floor(opts.snoozeDays)) : null;
    await db.execute(sql`UPDATE "cat".triage_items
      SET snoozed_until = ${days ? sql`now() + make_interval(days => ${days})` : sql`NULL`}, last_status_change_at = now()
      WHERE id = ${item.id}::uuid`);
    await db.execute(sql`INSERT INTO "cat".triage_events (item_id, actor_id, from_status, to_status, note)
      VALUES (${item.id}::uuid, ${actor}, ${item.status}, ${item.status}, ${days ? `snoozed ${days} days` : "unsnoozed"})`);
  }
}
