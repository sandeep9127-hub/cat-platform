import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { embedDocuments, EMBED_MODEL, toVectorLiteral } from "@/lib/ai/embed";
import { writeAudit } from "@/lib/audit";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { categoryMatrix, SHEET_ID, SHEET_TO_SLUG, type LineRow, type MetricRow, type SheetData } from "./sheet";

/**
 * Snapshots of the All-Landscape Phase 1 sheet ("cat".phase1_snapshots).
 * The sheet is read only when someone asks for an update; the parsed Data and
 * Dashboard tabs are stored as a draft, compared with what is live, and
 * published by an admin. Publishing also replaces Ask's budget passages, in
 * one transaction, so the old passages never outlive the old figures. Earlier
 * snapshots are kept and can be restored.
 */
export const PHASE1_TAG = "phase1-snapshot";

export type SnapshotMeta = {
  id: string;
  fetched_at: string;
  fetched_by_email: string | null;
  line_count: number;
  status: "draft" | "published" | "superseded";
  published_at: string | null;
  published_by_email: string | null;
};
export type Snapshot = { meta: SnapshotMeta; data: SheetData };
type Actor = { userId: string | null; email: string | null };

const rows = <T>(r: unknown) => (r as { rows: T[] }).rows;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const META = sql`id, fetched_at, fetched_by_email, line_count, status, published_at, published_by_email`;

type Raw = SnapshotMeta & { landscapes: SheetData["landscapes"]; lines: SheetData["lines"] };
const toSnapshot = (r: Raw): Snapshot => ({
  meta: { id: r.id, fetched_at: String(r.fetched_at), fetched_by_email: r.fetched_by_email, line_count: r.line_count, status: r.status, published_at: r.published_at ? String(r.published_at) : null, published_by_email: r.published_by_email },
  data: { landscapes: r.landscapes, lines: r.lines, cats: categoryMatrix(r.lines.rows), fetchedAt: String(r.fetched_at) },
});

/** The published snapshot, read straight from the database (scripts and admin pages). */
export async function loadPublished(): Promise<Snapshot | null> {
  const r = rows<Raw>(await db.execute(sql`SELECT ${META}, landscapes, lines FROM "cat".phase1_snapshots WHERE status = 'published' LIMIT 1`))[0];
  return r ? toSnapshot(r) : null;
}

/** The live (published) snapshot. Cached until a publish or restore. */
export const getPublishedSnapshot = unstable_cache(loadPublished, ["phase1-published-v1"], { tags: [PHASE1_TAG], revalidate: 3600 });

export async function getSnapshot(id: string): Promise<Snapshot | null> {
  if (!UUID.test(id)) return null;
  const r = rows<Raw>(await db.execute(sql`SELECT ${META}, landscapes, lines FROM "cat".phase1_snapshots WHERE id = ${id}::uuid`))[0];
  return r ? toSnapshot(r) : null;
}

export async function listSnapshots(limit = 20): Promise<SnapshotMeta[]> {
  return rows<SnapshotMeta>(await db.execute(sql`
    SELECT ${META} FROM "cat".phase1_snapshots WHERE status <> 'draft' OR fetched_at > now() - interval '2 days'
    ORDER BY fetched_at DESC LIMIT ${limit}`));
}

/** Store a freshly read sheet as a draft (not visible anywhere until published). */
export async function saveDraft(data: SheetData, actor: Actor): Promise<string> {
  const r = rows<{ id: string }>(await db.execute(sql`
    INSERT INTO "cat".phase1_snapshots (source_sheet_id, fetched_by, fetched_by_email, line_count, landscapes, lines)
    VALUES (${SHEET_ID}, ${actor.userId && UUID.test(actor.userId) ? actor.userId : null}, ${actor.email},
            ${data.lines.rows.length}, ${JSON.stringify(data.landscapes)}::jsonb, ${JSON.stringify(data.lines)}::jsonb)
    RETURNING id`))[0];
  return r.id;
}

/* ---------- Summary, for the before/after comparison ---------- */

export type SnapshotSummary = {
  lines: number;
  allPhase1: number | null;
  netGrant: number | null;
  totalCost: number;
  phase1Lines: number;
  perLandscape: { name: string; lines: number; total: number; phase1: number }[];
};

export function summarize(d: SheetData): SnapshotSummary {
  const metric = (sn: string) => d.landscapes.rows.find((r) => r.sn === sn);
  const per = new Map<string, { name: string; lines: number; total: number; phase1: number }>();
  for (const r of d.lines.rows) {
    const name = String(r.Landscape);
    const x = per.get(name) ?? { name, lines: 0, total: 0, phase1: 0 };
    x.lines += 1;
    x.total += Number(r["Total Cost (Rs)"] || 0);
    x.phase1 += Number(r["Phase 1 Cost (Rs)"] || 0);
    per.set(name, x);
  }
  const perLandscape = [...per.values()].sort((a, b) => a.name.localeCompare(b.name));
  return {
    lines: d.lines.rows.length,
    allPhase1: (metric("1")?.["All Landscapes"] as number | null) ?? null,
    netGrant: (metric("6")?.["All Landscapes"] as number | null) ?? null,
    totalCost: perLandscape.reduce((t, x) => t + x.total, 0),
    phase1Lines: perLandscape.reduce((t, x) => t + x.phase1, 0),
    perLandscape,
  };
}

/* ---------- Ask passages built from a snapshot ---------- */

const crore = (v: number) => `₹${(v / 1e7).toFixed(2)} crore`;
const money = (n: unknown) => {
  const v = Number(n);
  if (n == null || !Number.isFinite(v) || v === 0) return "nil";
  if (Math.abs(v) >= 1e7) return crore(v);
  if (Math.abs(v) >= 1e5) return `₹${(v / 1e5).toFixed(2)} lakh`;
  return `₹${Math.round(v).toLocaleString("en-IN")}`;
};
const pct = (v: unknown) => (v == null ? "nil" : `${Number(v).toFixed(1)}%`);
const TAGS = ["Climate", "Equity", "Gender", "Economic Purpose", "Institution Type", "Capital", "Biodiversity Class", "CSO line", "MAP line"];
const LENSES = ["INSTITUTION TYPE", "EQUITY", "GENDER", "ECONOMIC PURPOSE", "CLIMATE", "CAPITAL", "BIODIVERSITY"];

export type Passage = { slug: string; ref: string; context: string; text: string };

export function buildPassages(d: SheetData): { passages: Passage[]; skipped: string[] } {
  const skipped = new Set<string>();
  const passages: Passage[] = [];
  const byLand = new Map<string, LineRow[]>();
  for (const r of d.lines.rows) {
    const sheetName = String(r.Landscape);
    const slug = SHEET_TO_SLUG[sheetName];
    if (!slug) { skipped.add(sheetName); continue; }
    byLand.set(slug, [...(byLand.get(slug) ?? []), r]);
    const name = LANDSCAPES[slug]?.name ?? sheetName;
    const tags = TAGS.map((t) => (r[t] ? `${t.toLowerCase()}: ${r[t]}` : null)).filter(Boolean).join("; ");
    passages.push({
      slug,
      ref: `phase1:${slug}:${r["S. No"]}`,
      context: `${name} investment plan, cost line from the All-Landscape Phase 1 sheet: ${r["Thematic Investment"] || r.Category}, ${r.Category}.`,
      text: [
        `${r["Sub Intervention"]}.`,
        `Category: ${r.Category}. Thematic investment: ${r["Thematic Investment"] || "not given"}.`,
        `Total for the 7-year plan: ${money(r["Total Cost (Rs)"])} (government ${money(r["Total Govt (Rs)"])}, community ${money(r["Total Community (Rs)"])}, investment required ${money(r["Total Investment Required (Rs)"])}).`,
        `Phase 1: ${money(r["Phase 1 Cost (Rs)"])} (government ${money(r["Phase 1 Govt (Rs)"])}, community ${money(r["Phase 1 Community (Rs)"])}, investment required ${money(r["Phase 1 Investment Required (Rs)"])}).`,
        tags ? `Tags: ${tags}.` : "",
      ].filter(Boolean).join("\n"),
    });
  }
  // One summary passage per landscape: 7-year and Phase 1 totals, financing and top tag shares.
  for (const [slug, lines] of byLand) {
    const sheetName = String(lines[0].Landscape);
    const name = LANDSCAPES[slug]?.name ?? sheetName;
    const sum = (k: string) => lines.reduce((t, r) => t + Number(r[k] || 0), 0);
    const m = (sn: string) => (d.landscapes.rows.find((r) => r.sn === sn) as MetricRow | undefined)?.[sheetName] as number | null | undefined;
    const cats = new Map<string, number>();
    for (const r of lines) cats.set(String(r.Category || "(no category)"), (cats.get(String(r.Category || "(no category)")) ?? 0) + Number(r["Total Cost (Rs)"] || 0));
    const topCats = [...cats].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c, v]) => `${c} ${crore(v)}`).join("; ");
    const topTags = LENSES.map((lens) => {
      const best = d.landscapes.rows
        .filter((r) => String(r.section).toUpperCase().startsWith(lens) && r[sheetName] != null)
        .sort((a, b) => Number(b[sheetName]) - Number(a[sheetName]))[0];
      return best ? `${lens.toLowerCase()}: ${best.metric} ${pct(best[sheetName])}` : null;
    }).filter(Boolean).join("; ");
    const ha = m("7b");
    passages.push({
      slug,
      ref: `phase1:${slug}:summary`,
      context: `${name} investment plan: budget summary from the All-Landscape Phase 1 sheet.`,
      text: [
        `${name} budget summary.`,
        `Total for the 7-year plan: ${crore(sum("Total Cost (Rs)"))} across ${lines.length} cost lines (government ${crore(sum("Total Govt (Rs)"))}, community ${crore(sum("Total Community (Rs)"))}, investment required ${crore(sum("Total Investment Required (Rs)"))}).`,
        `Phase 1: ${crore(sum("Phase 1 Cost (Rs)"))} (government ${crore(sum("Phase 1 Govt (Rs)"))}, community ${crore(sum("Phase 1 Community (Rs)"))}, investment required ${crore(sum("Phase 1 Investment Required (Rs)"))}).`,
        `Phase 1 financing, as a share of Phase 1 cost: government convergence ${pct(m("3"))}, community contribution ${pct(m("4"))}, debt ${pct(m("5"))}, net grant and returnable grant ${pct(m("6"))}. Grant plus returnable grant required in Phase 1: ${m("2") == null ? "nil" : crore(Number(m("2")))}.`,
        `Phase 1 cost per household: ${m("7a") == null ? "not recorded" : money(m("7a"))}. Phase 1 cost per hectare of gross cropped area: ${ha == null ? "no area recorded" : money(ha)}. Share of the combined Phase 1 cost of all ten landscapes: ${pct(m("7"))}.`,
        topCats ? `Largest categories by 7-year total: ${topCats}.` : "",
        topTags ? `Largest tag shares of Phase 1 cost: ${topTags}.` : "",
      ].filter(Boolean).join("\n"),
    });
  }
  return { passages, skipped: [...skipped] };
}

/* ---------- Publish and restore ---------- */

/**
 * Make a snapshot the live one: Ask's budget passages are rebuilt from it (old
 * ones removed in the same transaction), the cached pages refresh, and the
 * change is written to the audit log.
 */
export async function publishSnapshot(id: string, actor: Actor, action: "publish" | "restore" = "publish"): Promise<{ passages: number; skipped: string[] }> {
  const snap = await getSnapshot(id);
  if (!snap) throw new Error("That snapshot doesn't exist.");
  if (snap.meta.status === "published") throw new Error("That snapshot is already live.");
  const { passages, skipped } = buildPassages(snap.data);
  const vectors = await embedDocuments(passages.map((p) => `${p.context}\n\n${p.text}`));
  const before = await loadPublished();

  await db.transaction(async (tx) => {
    await tx.execute(sql`UPDATE "cat".phase1_snapshots SET status = 'superseded' WHERE status = 'published'`);
    await tx.execute(sql`
      UPDATE "cat".phase1_snapshots SET status = 'published', published_at = now(),
             published_by = ${actor.userId && UUID.test(actor.userId) ? actor.userId : null}, published_by_email = ${actor.email}
      WHERE id = ${id}::uuid`);
    // Old budget passages go with the old figures.
    await tx.execute(sql`DELETE FROM "cat".chunks WHERE source_kind = 'intervention'`);
    for (let i = 0; i < passages.length; i += 50) {
      const values = passages.slice(i, i + 50).map((p, j) => sql`(
        'intervention', ${p.ref}, ${p.slug}, ${i + j}, 'budget', ${p.text}, ${p.context},
        ${Math.ceil(p.text.length / 4)}, true, ${toVectorLiteral(vectors[i + j])}::vector, ${EMBED_MODEL})`);
      await tx.execute(sql`
        INSERT INTO "cat".chunks (source_kind, source_ref, landscape_slug, chunk_index, kind, text, context,
                                  token_count, is_current, embedding, embedding_model)
        VALUES ${sql.join(values, sql`, `)}`);
    }
  });

  const after = summarize(snap.data);
  await writeAudit({
    actorUserId: actor.userId, actorEmail: actor.email, action: `phase1.${action}`, entityType: "phase1_snapshot", entityId: id,
    meta: {
      lines: after.lines, total_cost: after.totalCost, phase1_all: after.allPhase1, net_grant_pct: after.netGrant, passages: passages.length,
      previous: before ? { id: before.meta.id, lines: before.meta.line_count } : null, skipped_landscapes: skipped,
    },
  });
  refreshPages();
  return { passages: passages.length, skipped };
}

/** Refresh every cached page that shows these figures (no-op outside a Next.js server). */
export function refreshPages() {
  try {
    revalidateTag(PHASE1_TAG);
    revalidatePath("/landscape/[slug]", "page");
    revalidatePath("/landscape/[slug]/budget", "page");
    revalidatePath("/landscape/[slug]/insights", "page");
  } catch {
    /* scripts: the cache expires on its own within the hour */
  }
}

/* ---------- Per-landscape totals for the public pages ---------- */

export type LandscapeLineTotals = {
  lines: number;
  total: number; govt: number; community: number; investment: number;
  phase1: number;
  byCategory: { category: string; total: number; investment: number; lines: number }[];
  byTheme: { theme: string; total: number }[];
};

/** 7-year and Phase 1 totals for one Hub landscape from the published snapshot, or null if it isn't covered. */
export async function landscapeLineTotals(slug: string): Promise<LandscapeLineTotals | null> {
  const snap = await getPublishedSnapshot();
  if (!snap) return null;
  const mine = snap.data.lines.rows.filter((r) => SHEET_TO_SLUG[String(r.Landscape)] === slug);
  if (!mine.length) return null;
  const n = (r: LineRow, k: string) => Number(r[k] || 0);
  const cats = new Map<string, { category: string; total: number; investment: number; lines: number }>();
  const themes = new Map<string, number>();
  for (const r of mine) {
    const c = String(r.Category || "Uncategorised");
    const x = cats.get(c) ?? { category: c, total: 0, investment: 0, lines: 0 };
    x.total += n(r, "Total Cost (Rs)"); x.investment += n(r, "Total Investment Required (Rs)"); x.lines += 1;
    cats.set(c, x);
    const t = String(r["Thematic Investment"] || "Unassigned");
    themes.set(t, (themes.get(t) ?? 0) + n(r, "Total Cost (Rs)"));
  }
  const sum = (k: string) => mine.reduce((t, r) => t + n(r, k), 0);
  const themeNo = (t: string) => parseInt(t.replace(/^\D+/, ""), 10) || 999;
  return {
    lines: mine.length,
    total: sum("Total Cost (Rs)"), govt: sum("Total Govt (Rs)"), community: sum("Total Community (Rs)"), investment: sum("Total Investment Required (Rs)"),
    phase1: sum("Phase 1 Cost (Rs)"),
    byCategory: [...cats.values()].sort((a, b) => b.total - a.total),
    byTheme: [...themes].map(([theme, total]) => ({ theme, total })).sort((a, b) => themeNo(a.theme) - themeNo(b.theme)),
  };
}
