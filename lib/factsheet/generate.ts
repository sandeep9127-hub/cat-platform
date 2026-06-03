import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { getClient, estimateCostUsd } from "@/lib/ai/anthropic";

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

const ALLOWED_DOMAINS = [
  "gov.in", "nic.in", "icar.org.in", "nabard.org", "ifad.org", "icrisat.org",
  "wassan.org", "apcnf.in", "rythusadhikarasamstha.org", "fao.org", "cgiar.org",
  "azimpremjifoundation.org", "macfound.org", "rockefellerfoundation.org",
  "giz.de", "tatatrusts.org", "downtoearth.org.in",
  "scroll.in", "thewire.in",
];
// NOTE: thehindu.com and indianexpress.com block Anthropic's web-crawler user
// agent, so the web_search tool 400s if they're in allowed_domains. Keep them OUT.

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
  outcomes: { claim: string; figure: string | null; source_url: string }[];
  citations: { url: string; passage: string }[];
  source_name: string | null;
  source_url: string | null;
  confidence: number;
};

const SYSTEM = `You build a verified fact sheet for ONE Indian food-systems / agroecology programme.

Use the web_search tool (restricted to the allow-listed domains) to find authoritative sources. Then output a SINGLE JSON object — no markdown, no preamble.

HARD RULES (non-negotiable):
- Ground every field in what the sources actually say. If a field is not supported by a source, set it to null (or [] for lists). Never guess, never infer numbers.
- Every entry in "outcomes" must carry the source_url it came from, and the figure must appear in that source.
- "citations" must list the URLs you actually used, each with a short verbatim passage.
- Plain language. No marketing words. No em dashes.
- India, programme-level only (named, geographically defined, identifiable lead org).
- If you cannot verify the programme from the allow-listed sources, output {"refused": true, "reason": "..."}.

JSON keys:
  title, one_liner, summary (2-4 sentences),
  state_name, state_code (2-letter), district,
  themes (array of slugs from: soil-land, water, seeds-biodiversity, climate-resilience, women-collectives, markets-value-chains, policy-governance, knowledge-capacity),
  scale_band (one of: pilot, block, district, multi_district, state, multi_state, national),
  lead_organisation, implementers (array), funders (array),
  principle_alignment (array of short principle names this programme touches),
  outcomes (array of {claim, figure, source_url}),
  citations (array of {url, passage}),
  source_name, source_url (the single best canonical source),
  confidence (0-1: how well sources support the sheet).`;

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

type GenResult = { ok: true; sheet: FactSheet; status: string } | { ok: false; reason: string };

export async function generateFactSheet(query: string): Promise<GenResult> {
  const anthropic = getClient();
  if (!anthropic) return { ok: false, reason: "ANTHROPIC_API_KEY not set" };

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM,
    tools: [
      {
        type: "web_search_20250305" as never,
        name: "web_search",
        max_uses: 6,
        allowed_domains: ALLOWED_DOMAINS,
      } as never,
    ],
    messages: [
      { role: "user", content: `Build the fact sheet for this programme: "${query}". Search the allow-listed sources, then return the JSON object.` },
    ],
  });

  const text = res.content
    .filter((b) => b.type === "text")
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("\n");
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { ok: false, reason: "No JSON returned" };

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(match[0]);
  } catch {
    return { ok: false, reason: "Unparseable JSON" };
  }
  if (raw.refused) return { ok: false, reason: String(raw.reason || "Could not verify from sources") };

  const stateCode = raw.state_code ? String(raw.state_code).toUpperCase().slice(0, 2) : null;
  const centroid = stateCode ? STATE_CENTROIDS[stateCode] : undefined;
  const outcomes = Array.isArray(raw.outcomes) ? (raw.outcomes as FactSheet["outcomes"]) : [];
  const citations = Array.isArray(raw.citations) ? (raw.citations as FactSheet["citations"]) : [];
  const confidence = typeof raw.confidence === "number" ? raw.confidence : 0;

  const sheet: FactSheet = {
    slug: slugify(String(raw.title || query)),
    title: String(raw.title || query).slice(0, 200),
    one_liner: raw.one_liner ? String(raw.one_liner) : null,
    summary: raw.summary ? String(raw.summary) : null,
    state_code: stateCode,
    district: raw.district ? String(raw.district) : null,
    latitude: centroid ? centroid[0] : null,
    longitude: centroid ? centroid[1] : null,
    themes: Array.isArray(raw.themes) ? (raw.themes as string[]) : [],
    scale_band: raw.scale_band ? String(raw.scale_band) : null,
    lead_organisation: raw.lead_organisation ? String(raw.lead_organisation) : null,
    implementers: Array.isArray(raw.implementers) ? (raw.implementers as string[]) : [],
    funders: Array.isArray(raw.funders) ? (raw.funders as string[]) : [],
    principle_alignment: Array.isArray(raw.principle_alignment) ? (raw.principle_alignment as string[]) : [],
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
       fields, outcomes, citations, source_name, source_url, confidence, verified, status, provenance, updated_at)
    VALUES (${sheet.slug}, ${sheet.title}, ${sheet.one_liner}, ${sheet.summary},
            ${sheet.state_code}, ${sheet.district}, ${sheet.latitude}, ${sheet.longitude},
            ${JSON.stringify(sheet.themes)}::jsonb, ${sheet.scale_band}, ${sheet.lead_organisation},
            ${JSON.stringify(sheet.implementers)}::jsonb, ${JSON.stringify(sheet.funders)}::jsonb,
            ${JSON.stringify(sheet.principle_alignment)}::jsonb, '{}'::jsonb,
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
      citations=EXCLUDED.citations, source_name=EXCLUDED.source_name,
      source_url=EXCLUDED.source_url, confidence=EXCLUDED.confidence,
      verified=EXCLUDED.verified, status=EXCLUDED.status, updated_at=now()
  `);

  try {
    const u = res.usage as { input_tokens: number; output_tokens: number };
    void estimateCostUsd(u.input_tokens, u.output_tokens);
  } catch {}

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
