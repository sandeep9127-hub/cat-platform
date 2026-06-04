import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { getClient } from "@/lib/ai/anthropic";

/**
 * Grounded fact-sheet generator for the Solutions Atlas.
 *
 * Uses Claude + the Anthropic web_search tool (allow-listed to trusted domains
 * — no SERP, no SearXNG) to research a programme, then returns a STRUCTURED
 * fact sheet where every populated field must be supported by a cited source.
 * Fields with no support are null ("Not stated"). The confidence gate decides
 * auto-publish vs. flag-for-review, so the confident majority needs no human
 * curation while anything weak is quarantined.
 */

const MODEL = "claude-sonnet-4-6";

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

Use the web_search tool (restricted to the allow-listed domains) to find authoritative sources. Then output a SINGLE JSON object — no markdown, no preamble.

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
- India, programme-level only (named, geographically defined, identifiable lead org).
- If you cannot verify the programme from the allow-listed sources, output {"refused": true, "reason": "..."}.

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

type GenResult = { ok: true; sheet: FactSheet; status: string } | { ok: false; reason: string };

/** Provider-agnostic search + extraction. Prefers OpenRouter (cheap, no rate
 *  wall) with web grounding via the :online plugin; falls back to Claude's
 *  web_search tool. SAME system prompt + JSON contract for both, so the
 *  fact-sheet format is identical regardless of provider. */
async function searchAndExtract(query: string): Promise<string | null> {
  const userPrompt = `Build the fact sheet for this programme: "${query}". Search the web for authoritative sources, then return ONLY the JSON object.`;

  if (process.env.OPENROUTER_API_KEY) {
    const model = process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash:online";
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "content-type": "application/json",
        "HTTP-Referer": "https://cat-platform-fawn.vercel.app",
        "X-Title": "Transformation Hub",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    if (!r.ok) throw new Error(`OpenRouter ${r.status}: ${(await r.text().catch(() => "")).slice(0, 200)}`);
    const data = await r.json();
    return (data.choices?.[0]?.message?.content as string) ?? "";
  }

  const anthropic = getClient();
  if (!anthropic) return null;
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM,
    tools: [
      { type: "web_search_20250305" as never, name: "web_search", max_uses: 8, blocked_domains: BLOCKED_DOMAINS } as never,
    ],
    messages: [{ role: "user", content: userPrompt }],
  });
  return res.content
    .filter((b) => b.type === "text")
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("\n");
}

export async function generateFactSheet(query: string): Promise<GenResult> {
  let text: string | null;
  try {
    text = await searchAndExtract(query);
  } catch (e) {
    return { ok: false, reason: (e as Error).message.slice(0, 180) };
  }
  if (text === null) return { ok: false, reason: "No LLM provider configured" };

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { ok: false, reason: "No JSON returned" };

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(match[0]);
  } catch {
    return { ok: false, reason: "Unparseable JSON" };
  }
  if (raw.refused) return { ok: false, reason: String(raw.reason || "Could not verify from sources") };

  const rawStateCode = raw.state_code ? String(raw.state_code).toUpperCase().slice(0, 2) : null;
  // Normalise common code variants so the centroid lookup (and the Atlas state
  // label) line up with the census codes.
  const stateCode = rawStateCode ? STATE_ALIASES[rawStateCode] ?? rawStateCode : null;
  const geo = geocodeState(stateCode, slugify(String(raw.title || query)));
  const outcomes = Array.isArray(raw.outcomes) ? (raw.outcomes as FactSheet["outcomes"]) : [];
  const citations = Array.isArray(raw.citations) ? (raw.citations as FactSheet["citations"]) : [];
  const confidence = typeof raw.confidence === "number" ? raw.confidence : 0;
  const metrics = (Array.isArray(raw.metrics) ? (raw.metrics as FactSheet["metrics"]) : [])
    .filter((m) => m && m.value && m.label)
    .slice(0, 4);
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
    source_url: raw.source_url ? String(raw.source_url) : null,
    confidence,
  };

  // Confidence gate: auto-publish only when well-sourced; otherwise flag.
  const wellSourced =
    confidence >= 0.7 && !!sheet.source_url && citations.length >= 1 &&
    outcomes.every((o) => o.source_url);
  const status = wellSourced ? "published" : "flagged";

  await db.execute(sql`
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
  `);

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

  return { ok: true, sheet, status };
}

export type FactSheetRow = FactSheet & { status: string; verified: boolean; updated_at: string };

export async function listFactSheets(): Promise<FactSheetRow[]> {
  const r = await db.execute(sql`SELECT * FROM "cat".solution_factsheets ORDER BY updated_at DESC`);
  return (r as unknown as { rows: FactSheetRow[] }).rows;
}

export async function getFactSheet(slug: string): Promise<FactSheetRow | null> {
  const r = await db.execute(sql`SELECT * FROM "cat".solution_factsheets WHERE slug = ${slug} LIMIT 1`);
  return (r as unknown as { rows: FactSheetRow[] }).rows[0] ?? null;
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
