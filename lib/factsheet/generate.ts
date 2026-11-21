import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { BudgetExceededError, claudeEnabled, claudeMessage } from "@/lib/ai/claude";

/**
 * Grounded fact-sheet generator for the Solutions Atlas.
 *
 * Uses Claude + the Anthropic web_search tool (open web minus a short block-list;
 * model and search cap set by the "factsheet" task in lib/ai/models.ts) to research a programme, then returns a STRUCTURED
 * fact sheet where every populated field must be supported by a cited source.
 * Fields with no support are null ("Not stated"). The confidence gate decides
 * auto-publish vs. flag-for-review, so the confident majority needs no human
 * curation while anything weak is quarantined.
 */

// Open web search for COMPREHENSIVE coverage (every programme in India), with
// trust coming from the grounding guarantees (cite-or-omit + confidence gate +
// refuse-if-unverifiable) rather than a narrow allow-list. We only BLOCK sites
// that reject Anthropic's crawler (they 400 the tool) or are low-signal.
const BLOCKED_DOMAINS = [
  "thehindu.com", "indianexpress.com", "facebook.com", "twitter.com",
  "x.com", "instagram.com", "linkedin.com", "youtube.com", "pinterest.com",
];

// State / UT centroids (approx) so a fact sheet can pin on the Atlas even when
// the source doesn't give coordinates.
const STATE_CENTROIDS: Record<string, [number, number]> = {
  AP: [15.9, 79.74], AR: [28.0, 94.7], AS: [26.2, 92.9], BR: [25.6, 85.1],
  CG: [21.3, 81.6], GA: [15.3, 74.1], GJ: [22.6, 71.5], HR: [29.2, 76.1],
  HP: [31.9, 77.2], JK: [33.8, 76.6], JH: [23.6, 85.3], KA: [15.3, 75.7],
  KL: [10.5, 76.3], MP: [23.5, 78.3], MH: [19.6, 75.7], MN: [24.7, 93.9],
  ML: [25.5, 91.4], MZ: [23.2, 92.9], NL: [26.1, 94.6], OD: [20.5, 84.4],
  PB: [31.1, 75.4], RJ: [27.0, 74.2], SK: [27.5, 88.5], TN: [11.1, 78.7],
  TG: [17.9, 79.0], TR: [23.8, 91.7], UP: [27.0, 80.9], UK: [30.1, 79.3],
  WB: [22.9, 87.9], DL: [28.6, 77.2], AN: [11.7, 92.7], PY: [11.9, 79.8],
};

// Common 2-letter state-code variants the model emits that don't match the
// census codes above (e.g. it writes CT for Chhattisgarh, TS for Telangana).
const STATE_ALIASES: Record<string, string> = {
  CT: "CG", TS: "TG", OR: "OD", UT: "UK", UA: "UK", PO: "PY", DD: "DL",
};

// Geographic centre of India — a deterministic-jitter fallback so national /
// multi-state / unknown-location programmes STILL pin on the Atlas (otherwise
// they'd be counted in the category tiles but invisible on the map).
const INDIA_CENTROID: [number, number] = [22.6, 79.2];

function geocodeState(
  stateCode: string | null,
  slug: string,
): { lat: number; lon: number } {
  const code = stateCode ? STATE_ALIASES[stateCode] ?? stateCode : null;
  const c = code ? STATE_CENTROIDS[code] : undefined;
  if (c) return { lat: c[0], lon: c[1] };
  // National / unknown → cluster gently around the centre of India, spread by a
  // deterministic per-slug offset so multiple national schemes don't stack.
  const h = [...slug].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  return {
    lat: INDIA_CENTROID[0] + (((h % 9) - 4) * 0.7),
    lon: INDIA_CENTROID[1] + ((((h >> 3) % 9) - 4) * 0.7),
  };
}

export type FactSheet = {
  slug: string;
  title: string;
  one_liner: string | null;
  summary: string | null;
  state_code: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  themes: string[];
  scale_band: string | null;
  lead_organisation: string | null;
  implementers: string[];
  funders: string[];
  principle_alignment: string[];
  start_year: number | null;
  // Headline metric stat-blocks (cited). value is a short display string e.g. "6L+".
  metrics: { label: string; value: string; source_url: string }[];
  // The four-part insight frame — each grounded or null ("only the applicable parts").
  insight: {
    whats_working: string | null;
    whats_hard: string | null;
    why_it_matters: string | null;
    whats_next: string | null;
  };
  outcomes: { claim: string; figure: string | null; source_url: string }[];
  citations: { url: string; passage: string }[];
  source_name: string | null;
  source_url: string | null;
  confidence: number;
};

const SYSTEM = `You build a verified fact sheet for ONE Indian food-systems / agroecology programme.

Use the web_search tool to find authoritative sources: government portals, implementing organisations, funders, evaluations and reputable reporting. Prefer primary sources. Then output a SINGLE JSON object — no markdown, no preamble.

INCLUSION TEST: include the programme if it relates to the agroecology principles
(recycling, input reduction, soil health, animal health, biodiversity, synergy,
economic diversification, co-creation of knowledge, social values & diets, fairness,
connectivity, land & natural-resource governance, participation) OR anything remotely
close (natural / organic / regenerative farming, FPOs, watershed, seed sovereignty,
millets, agroforestry, NRM). When in doubt, include.

HARD RULES (non-negotiable):
- Ground every field in what the sources actually say. If a field is not supported by a source, set it to null (or [] for lists). Never guess, never infer numbers.
- Every "metrics" and "outcomes" entry must carry the source_url it came from, and the number/figure must appear in that source.
- "insight" fields: fill ONLY the parts the sources support; set the others to null. Two short sentences max each. No invention.
- "citations" must list the URLs you actually used, each with a short verbatim passage.
- Plain language. No marketing words. No em dashes. Never the word "agroecology" in user-facing prose.
- Use British / Indian English spelling throughout (organisation, programme, colour, centre, -ise endings).
- India, programme-level only (named, geographically defined, identifiable lead org).
- If you cannot verify the programme from credible sources, output {"refused": true, "reason": "..."}.

JSON keys:
  title, one_liner, summary (2-4 sentences),
  state_name, state_code (2-letter), district, start_year (integer or null),
  themes (array of 1-3 intervention-category slugs that best describe what this programme actually does, chosen ONLY from: agri-horti-agroforestry (crops, horticulture, agroforestry, natural/organic farming), forestry-ntfp (forests, non-timber forest produce, plantations), livestock (dairy, poultry, fodder, animal husbandry), fisheries (aquaculture, inland/marine fishing), nrm (soil, water, watershed, land & natural-resource management), biodiversity (seeds, native breeds, ecosystem & species conservation), nutrition (kitchen gardens, dietary diversity, food security), market (value chains, FPOs, processing, market linkage, price), energy (solar, biogas, energy-efficient pumps/equipment), technical-assistance (training, extension, advisory, capacity building, knowledge). Pick the categories the sources actually support — do not over-tag),
  scale_band (one of: pilot, block, district, multi_district, state, multi_state, national),
  lead_organisation, implementers (array), funders (array),
  principle_alignment (array of 1-6 agroecology-principle slugs this programme touches, chosen ONLY from: recycling, input-reduction, soil-health, animal-health, biodiversity, synergy, economic-diversification, co-creation-of-knowledge, social-values-and-diets, fairness, connectivity, land-and-resource-governance, participation),
  metrics (array of up to 4 {label, value, source_url} — headline figures; value is a short display string e.g. "6L+", "9 lakh acres", "38%", "9 yrs"),
  insight ({whats_working, whats_hard, why_it_matters, whats_next} — each a short string or null),
  outcomes (array of {claim, figure, source_url}),
  citations (array of {url, passage}),
  source_name, source_url (the single best canonical source),
  confidence (0-1: how well sources support the sheet).`;

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

type GenResult =
  | { ok: true; sheet: FactSheet; status: string; costUsd: number }
  | { ok: false; reason: string; costUsd?: number };

/**
 * Pull the fact-sheet object out of model text. With web search the reply can
 * carry short notes between searches, so a greedy first-"{"-to-last-"}" match
 * may span prose. Try the whole text, then each object that starts with a
 * fact-sheet key, last one first.
 */
function extractSheetJson(text: string): Record<string, unknown> | null {
  const tryParse = (s: string) => {
    try {
      const v = JSON.parse(s);
      return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  };
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const whole = tryParse(trimmed);
  if (whole) return whole;
  const end = trimmed.lastIndexOf("}");
  if (end < 0) return null;
  const starts = [...trimmed.matchAll(/\{\s*"(?:title|refused)"/g)].map((m) => m.index!).reverse();
  for (const start of starts) {
    const obj = tryParse(trimmed.slice(start, end + 1));
    if (obj) return obj;
  }
  return null;
}

/** A model-supplied link, accepted only as an absolute http(s) URL with a real host. */
function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2000) return null;
  try {
    const u = new URL(value.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (!u.hostname.includes(".") || u.username || u.password) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** Claude + web search → raw model text (expected to be one JSON object). */
async function searchAndExtract(
  query: string,
  runId?: string | null,
): Promise<{ text: string; costUsd: number; stopReason: string | null }> {
  const userPrompt = `Build the fact sheet for this programme: "${query}". Search the web for authoritative sources, then return ONLY the JSON object.`;
  const res = await claudeMessage("factsheet", {
    system: SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
    webSearch: { blockedDomains: BLOCKED_DOMAINS },
    runId,
  });
  return { text: res.text, costUsd: res.costUsd, stopReason: res.stopReason };
}

export async function generateFactSheet(
  query: string,
  opts: { runId?: string | null } = {},
): Promise<GenResult> {
  if (!claudeEnabled()) return { ok: false, reason: "ANTHROPIC_API_KEY not set" };

  let text: string;
  let callCost = 0;
  try {
    const r = await searchAndExtract(query, opts.runId);
    text = r.text;
    callCost = r.costUsd;
    if (r.stopReason === "refusal") return { ok: false, reason: "Model declined this request", costUsd: callCost };
    if (r.stopReason === "max_tokens") return { ok: false, reason: "Answer was cut off (token limit)", costUsd: callCost };
  } catch (e) {
    if (e instanceof BudgetExceededError) return { ok: false, reason: e.message };
    return { ok: false, reason: (e as Error).message.slice(0, 180) };
  }

  const raw = extractSheetJson(text);
  if (!raw) {
    console.error("[factsheet] unparseable output for", query, "—", text.slice(0, 300));
    return { ok: false, reason: "Unparseable JSON", costUsd: callCost };
  }
  if (raw.refused) {
    return { ok: false, reason: String(raw.reason || "Could not verify from sources"), costUsd: callCost };
  }

  const rawStateCode = raw.state_code ? String(raw.state_code).toUpperCase().slice(0, 2) : null;
  // Normalise common code variants so the centroid lookup (and the Atlas state
  // label) line up with the census codes.
  const stateCode = rawStateCode ? STATE_ALIASES[rawStateCode] ?? rawStateCode : null;
  const geo = geocodeState(stateCode, slugify(String(raw.title || query)));
  // Every URL here came from the model, which read untrusted web pages: keep
  // only well-formed http(s) links and drop any entry whose link fails.
  const rawOutcomes = Array.isArray(raw.outcomes) ? (raw.outcomes as FactSheet["outcomes"]) : [];
  const rawCitations = Array.isArray(raw.citations) ? (raw.citations as FactSheet["citations"]) : [];
  const rawMetrics = Array.isArray(raw.metrics) ? (raw.metrics as FactSheet["metrics"]) : [];
  const outcomes = rawOutcomes
    .flatMap((o) => {
      const url = safeHttpUrl(o?.source_url);
      return o && o.claim && url ? [{ claim: String(o.claim), figure: o.figure ? String(o.figure) : null, source_url: url }] : [];
    });
  const citations = rawCitations
    .flatMap((c) => {
      const url = safeHttpUrl(c?.url);
      return url ? [{ url, passage: String(c.passage ?? "").slice(0, 600) }] : [];
    });
  const confidence = typeof raw.confidence === "number" ? raw.confidence : 0;
  const metricsAll = rawMetrics.flatMap((m) => {
      const url = safeHttpUrl(m?.source_url);
      return m && m.value && m.label && url
        ? [{ label: String(m.label), value: String(m.value), source_url: url }]
        : [];
    });
  const metrics = metricsAll.slice(0, 4);
  // Any entry dropped for a bad link means the model produced something we
  // couldn't verify: never auto-publish that sheet.
  const droppedLinks =
    rawOutcomes.length - outcomes.length +
    rawCitations.length - citations.length +
    rawMetrics.length - metricsAll.length;
  const rawInsight = (raw.insight ?? {}) as Record<string, unknown>;
  const insight = {
    whats_working: rawInsight.whats_working ? String(rawInsight.whats_working) : null,
    whats_hard: rawInsight.whats_hard ? String(rawInsight.whats_hard) : null,
    why_it_matters: rawInsight.why_it_matters ? String(rawInsight.why_it_matters) : null,
    whats_next: rawInsight.whats_next ? String(rawInsight.whats_next) : null,
  };

  const sheet: FactSheet = {
    slug: slugify(String(raw.title || query)),
    title: String(raw.title || query).slice(0, 200),
    one_liner: raw.one_liner ? String(raw.one_liner) : null,
    summary: raw.summary ? String(raw.summary) : null,
    state_code: stateCode,
    district: raw.district ? String(raw.district) : null,
    latitude: geo.lat,
    longitude: geo.lon,
    themes: Array.isArray(raw.themes) ? (raw.themes as string[]) : [],
    scale_band: raw.scale_band ? String(raw.scale_band) : null,
    lead_organisation: raw.lead_organisation ? String(raw.lead_organisation) : null,
    implementers: Array.isArray(raw.implementers) ? (raw.implementers as string[]) : [],
    funders: Array.isArray(raw.funders) ? (raw.funders as string[]) : [],
    principle_alignment: Array.isArray(raw.principle_alignment) ? (raw.principle_alignment as string[]) : [],
    start_year: typeof raw.start_year === "number" ? raw.start_year : null,
    metrics,
    insight,
    outcomes,
    citations,
    source_name: raw.source_name ? String(raw.source_name) : null,
    source_url: safeHttpUrl(raw.source_url),
    confidence,
  };

  // Confidence gate: auto-publish only when well-sourced; otherwise flag.
  const wellSourced =
    confidence >= 0.7 && !!sheet.source_url && citations.length >= 1 && droppedLinks === 0;
  const status = wellSourced ? "published" : "flagged";

  const written = await db.execute(sql`
    INSERT INTO "cat".solution_factsheets
      (slug, title, one_liner, summary, state_code, district, latitude, longitude,
       themes, scale_band, lead_organisation, implementers, funders, principle_alignment,
       start_year, metrics, insight,
       fields, outcomes, citations, source_name, source_url, confidence, verified, status, provenance, updated_at)
    VALUES (${sheet.slug}, ${sheet.title}, ${sheet.one_liner}, ${sheet.summary},
            ${sheet.state_code}, ${sheet.district}, ${sheet.latitude}, ${sheet.longitude},
            ${JSON.stringify(sheet.themes)}::jsonb, ${sheet.scale_band}, ${sheet.lead_organisation},
            ${JSON.stringify(sheet.implementers)}::jsonb, ${JSON.stringify(sheet.funders)}::jsonb,
            ${JSON.stringify(sheet.principle_alignment)}::jsonb,
            ${sheet.start_year}, ${JSON.stringify(sheet.metrics)}::jsonb, ${JSON.stringify(sheet.insight)}::jsonb,
            '{}'::jsonb,
            ${JSON.stringify(sheet.outcomes)}::jsonb, ${JSON.stringify(sheet.citations)}::jsonb,
            ${sheet.source_name}, ${sheet.source_url}, ${sheet.confidence},
            ${wellSourced}, ${status}, 'auto_discovered', now())
    ON CONFLICT (slug) DO UPDATE SET
      title=EXCLUDED.title, one_liner=EXCLUDED.one_liner, summary=EXCLUDED.summary,
      state_code=EXCLUDED.state_code, district=EXCLUDED.district,
      latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude, themes=EXCLUDED.themes,
      scale_band=EXCLUDED.scale_band, lead_organisation=EXCLUDED.lead_organisation,
      implementers=EXCLUDED.implementers, funders=EXCLUDED.funders,
      principle_alignment=EXCLUDED.principle_alignment, outcomes=EXCLUDED.outcomes,
      start_year=EXCLUDED.start_year, metrics=EXCLUDED.metrics, insight=EXCLUDED.insight,
      citations=EXCLUDED.citations, source_name=EXCLUDED.source_name,
      source_url=EXCLUDED.source_url, confidence=EXCLUDED.confidence,
      verified=EXCLUDED.verified, status=EXCLUDED.status, updated_at=now()
    WHERE "cat".solution_factsheets.status <> 'merged' -- a merged duplicate stays merged
    RETURNING slug
  `);
  if (!(written as unknown as { rows: unknown[] }).rows.length) {
    return { ok: false, reason: "This programme was merged into another fact sheet; it was not regenerated.", costUsd: callCost };
  }

  // Embed into the RAG so Ask can answer from it under "All sources".
  // Best-effort: a failed embed must not fail generation.
  if (status === "published") {
    try {
      const { embedFactSheetIntoRag } = await import("@/lib/factsheet/rag");
      await embedFactSheetIntoRag(sheet);
    } catch (e) {
      console.error("[factsheet] RAG embed failed for", sheet.slug, (e as Error).message);
    }
  }

  // Keep the matchmaker's search index current (best-effort; also rebuilt nightly).
  if (status === "published") {
    const { reindexFactsheets } = await import("@/lib/factsheet/reindex");
    await reindexFactsheets(`generated ${sheet.slug}`);
  }

  return { ok: true, sheet, status, costUsd: callCost };
}

export type FactSheetRow = FactSheet & {
  status: string;
  verified: boolean;
  updated_at: string;
  edited_by_human?: boolean;
  last_edited_at?: string | null;
  last_edited_by?: string | null;
};

export async function listFactSheets(): Promise<FactSheetRow[]> {
  const r = await db.execute(sql`SELECT * FROM "cat".solution_factsheets ORDER BY updated_at DESC`);
  return (r as unknown as { rows: FactSheetRow[] }).rows;
}

/**
 * Slug of the published sheet a merged duplicate now points to, or null.
 * Tolerates databases without the merged_into column (it exists only in the
 * CAT database, from drizzle/sql/2026-11-21_factsheet_merges.sql).
 */
export async function getMergedFactSheetTarget(slug: string): Promise<string | null> {
  try {
    const r = await db.execute(sql`
      SELECT t.slug FROM "cat".solution_factsheets m
      JOIN "cat".solution_factsheets t ON t.slug = m.merged_into AND t.status = 'published'
      WHERE m.slug = ${slug} AND m.status = 'merged' LIMIT 1`);
    return (r as unknown as { rows: { slug: string }[] }).rows[0]?.slug ?? null;
  } catch {
    return null;
  }
}

export async function getFactSheet(
  slug: string,
  opts?: { includeUnpublished?: boolean },
): Promise<FactSheetRow | null> {
  // Public callers get published sheets only. Sheets that failed the confidence
  // gate (status 'flagged') must NOT be reachable by guessing a slug — they may
  // contain unverified claims about real organisations. Admin/generation callers
  // opt in to unpublished access via { includeUnpublished: true }.
  const statusFilter = opts?.includeUnpublished ? sql`` : sql`AND status = 'published'`;
  const r = await db.execute(
    sql`SELECT * FROM "cat".solution_factsheets WHERE slug = ${slug} ${statusFilter} LIMIT 1`,
  );
  return (r as unknown as { rows: FactSheetRow[] }).rows[0] ?? null;
}

export type PrincipleSolution = { slug: string; title: string; state: string | null };

/**
 * Map each agroecology-principle slug → the published solutions that advance it,
 * by unnesting principle_alignment. Powers the "solutions for this principle"
 * list on the /principles page.
 */
export async function solutionsByPrinciple(): Promise<Record<string, PrincipleSolution[]>> {
  const r = await db.execute(sql`
    SELECT slug, title, state_code, principle_alignment
    FROM "cat".solution_factsheets WHERE status = 'published'
    ORDER BY title
  `);
  const rows = (r as unknown as {
    rows: { slug: string; title: string; state_code: string | null; principle_alignment: unknown }[];
  }).rows;
  const out: Record<string, PrincipleSolution[]> = {};
  for (const row of rows) {
    const ps = Array.isArray(row.principle_alignment) ? (row.principle_alignment as string[]) : [];
    for (const p of ps) {
      (out[p] ??= []).push({ slug: row.slug, title: row.title, state: row.state_code });
    }
  }
  return out;
}

/**
 * Count published fact sheets per intervention-category slug, by unnesting the
 * `themes` array. This is what powers the landing-page category tiles AND the
 * Atlas category filter, so the two always tally with the live Atlas.
 */
export async function getCategoryCounts(): Promise<Record<string, number>> {
  const r = await db.execute(sql`
    SELECT theme, COUNT(*)::int AS n
    FROM "cat".solution_factsheets, jsonb_array_elements_text(themes) AS theme
    WHERE status = 'published'
    GROUP BY theme
  `);
  const rows = (r as unknown as { rows: { theme: string; n: number }[] }).rows;
  const out: Record<string, number> = {};
  for (const row of rows) out[row.theme] = Number(row.n);
  return out;
}

/**
 * Count published fact sheets per agroecology-principle slug (the second Atlas
 * axis), by unnesting the canonicalised `principle_alignment` array.
 */
export async function getPrincipleCounts(): Promise<Record<string, number>> {
  const r = await db.execute(sql`
    SELECT p, COUNT(*)::int AS n
    FROM "cat".solution_factsheets, jsonb_array_elements_text(principle_alignment) AS p
    WHERE status = 'published'
    GROUP BY p
  `);
  const rows = (r as unknown as { rows: { p: string; n: number }[] }).rows;
  const out: Record<string, number> = {};
  for (const row of rows) out[row.p] = Number(row.n);
  return out;
}
