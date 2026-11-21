import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { embedDocuments, EMBED_MODEL, toVectorLiteral } from "@/lib/ai/embed";
import { categoryName } from "@/lib/data/categories";

/**
 * Make the PUBLISHED Solutions Atlas fact sheets searchable for the solution
 * matchmaker: one chunk per fact sheet (source_kind 'factsheet', source_ref =
 * the fact-sheet slug, no landscape), rendered as a readable passage with
 * where it works, who runs and funds it, outcomes, metrics and lessons.
 * Re-run after fact sheets are published, edited or merged; it replaces the set.
 */

const STATES: Record<string, string> = {
  AN: "Andaman and Nicobar Islands", AP: "Andhra Pradesh", AR: "Arunachal Pradesh", AS: "Assam", BR: "Bihar",
  CG: "Chhattisgarh", CH: "Chandigarh", DL: "Delhi", GA: "Goa", GJ: "Gujarat", HP: "Himachal Pradesh",
  HR: "Haryana", JH: "Jharkhand", JK: "Jammu and Kashmir", KA: "Karnataka", KL: "Kerala", LA: "Ladakh",
  MH: "Maharashtra", ML: "Meghalaya", MN: "Manipur", MP: "Madhya Pradesh", MZ: "Mizoram", NL: "Nagaland",
  OD: "Odisha", OR: "Odisha", PB: "Punjab", PY: "Puducherry", RJ: "Rajasthan", SK: "Sikkim", TN: "Tamil Nadu",
  TG: "Telangana", TS: "Telangana", TR: "Tripura", UK: "Uttarakhand", UP: "Uttar Pradesh", WB: "West Bengal",
};
const SCALE: Record<string, string> = {
  village: "village level", block: "block level", district: "district level", state: "state level",
  multi_state: "several states", national: "national",
};

type Row = {
  slug: string; title: string; one_liner: string | null; summary: string | null; state_code: string | null;
  district: string | null; themes: string[] | null; scale_band: string | null; lead_organisation: string | null;
  implementers: string[] | null; funders: string[] | null; outcomes: { claim?: string; figure?: string }[] | null;
  metrics: { label?: string; value?: string }[] | null; start_year: number | null;
  insight: { whats_working?: string | null; whats_hard?: string | null; whats_next?: string | null; why_it_matters?: string | null } | null;
};

const list = (xs: unknown) => (Array.isArray(xs) ? xs.filter((x) => typeof x === "string" && x.trim()) : []) as string[];

export function renderFactsheet(r: Row): { context: string; text: string } {
  const state = r.state_code ? STATES[r.state_code.toUpperCase()] ?? r.state_code : null;
  const where = [r.district, state].filter(Boolean).join(", ");
  const scale = r.scale_band ? SCALE[r.scale_band] ?? r.scale_band.replace(/_/g, " ") : null;
  const themes = list(r.themes).map((t) => categoryName(t)).join(", ");
  const outcomes = (r.outcomes ?? []).filter((o) => o?.claim).map((o) => `${o.claim}${o.figure ? `: ${o.figure}` : ""}`);
  const metrics = (r.metrics ?? []).filter((m) => m?.label && m?.value).map((m) => `${m.label}: ${m.value}`);
  const ins = r.insight ?? {};
  const text = [
    `${r.title}.${r.one_liner ? ` ${r.one_liner}` : ""}`,
    r.summary ?? "",
    [where && `Where: ${where}`, scale && `scale: ${scale}`, r.start_year && `since ${r.start_year}`].filter(Boolean).join("; ") + ".",
    themes ? `Themes: ${themes}.` : "",
    r.lead_organisation ? `Lead organisation: ${r.lead_organisation}.` : "",
    list(r.implementers).length ? `Implementers: ${list(r.implementers).join(", ")}.` : "",
    list(r.funders).length ? `Funders: ${list(r.funders).join(", ")}.` : "",
    outcomes.length ? `Reported outcomes: ${outcomes.join("; ")}.` : "",
    metrics.length ? `Metrics: ${metrics.join("; ")}.` : "",
    ins.whats_working ? `What's working: ${ins.whats_working}` : "",
    ins.whats_hard ? `What's hard: ${ins.whats_hard}` : "",
    ins.whats_next ? `What's next: ${ins.whats_next}` : "",
    ins.why_it_matters ? `Why it matters: ${ins.why_it_matters}` : "",
  ]
    .filter((x) => x && x !== ".")
    .join("\n")
    .slice(0, 6000);
  const context = `Solutions Atlas fact sheet: ${r.title}${where ? ` (${where})` : ""}${themes ? `, ${themes}` : ""}.`;
  return { context, text };
}

export async function indexFactsheets(): Promise<number> {
  const rs = (await db.execute(sql`
    SELECT slug, title, one_liner, summary, state_code, district, themes, scale_band, lead_organisation,
           implementers, funders, outcomes, metrics, start_year, insight
    FROM "cat".solution_factsheets WHERE status = 'published' ORDER BY slug`)) as unknown as { rows: Row[] };
  const items = rs.rows.map((r) => ({ slug: r.slug, ...renderFactsheet(r) }));
  const vectors = items.length ? await embedDocuments(items.map((i) => `${i.context}\n\n${i.text}`)) : [];

  await db.transaction(async (tx) => {
    await tx.execute(sql`DELETE FROM "cat".chunks WHERE source_kind = 'factsheet'`);
    for (let i = 0; i < items.length; i += 50) {
      const values = items.slice(i, i + 50).map((it, j) => sql`(
        'factsheet', ${it.slug}, NULL, 0, 'narrative', ${it.text}, ${it.context},
        ${Math.ceil(it.text.length / 4)}, true, ${toVectorLiteral(vectors[i + j])}::vector, ${EMBED_MODEL})`);
      await tx.execute(sql`
        INSERT INTO "cat".chunks (source_kind, source_ref, landscape_slug, chunk_index, kind, text, context,
                                  token_count, is_current, embedding, embedding_model)
        VALUES ${sql.join(values, sql`, `)}`);
    }
  });
  return items.length;
}
