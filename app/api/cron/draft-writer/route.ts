import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { authoriseCronRequest, politeFetch, startRun } from "@/lib/ingestion/run";
import { kimiChat, kimiCostUsd, kimiEnabled, safeJsonParse } from "@/lib/ai/kimi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Draft writer. Picks up promoted discovery candidates, fetches their
 * source URLs, and asks Kimi to draft an entry with citation anchors.
 * Output lands in draft_entries as `approved_for_publication_at = null`
 * for the CAT editor to review side-by-side with sources.
 *
 * Triggered by admin promotion, not on a schedule.
 */
const SYSTEM_PROMPT = `You are CAT Platform's draft writer. You read public source content about a food-systems programme in India and produce a draft Entry for the CAT editor to review.

You must respond with valid JSON only — no markdown, no preamble.

Required JSON object with these keys:
  title (string, max 120 chars)
  tagline (string, max 200 chars, plain language, no marketing)
  primary_theme_slug (one of: soil-land, water, seeds-biodiversity, climate-resilience, women-collectives, markets-value-chains, policy-governance, knowledge-capacity)
  primary_geography_name (state name)
  primary_state_code (2-letter code: AP, OD, MH, etc.)
  scale_band (one of: pilot, block, district, multi_district, state, multi_state, national)
  start_year (integer)
  end_year (integer or null)
  lead_organisation_name (string)
  context (100-500 words)
  what_was_attempted (100-300 words)
  what_was_achieved (150-500 words)
  what_worked (150-500 words)
  what_did_not_work (50-300 words; required; if sources don't say, write "Sources do not document limitations honestly; CAT editor to revise.")
  draft_confidence (0-1)
  source_passages (array of {source_url, passage, position_anchor})

Hard rules:
- Plain language. No em dashes. No marketing words ("leverage", "stakeholder", "ecosystem", "transformative", "synergy").
- The word "agroecology" never appears in user-facing fields.
- Programme level, never individual farms or single events.
- Every claim in achievements must be defensible from source_passages.
- If sources don't support a programme-level entry, return {"refused": true, "reason": "..."}.`;

type DraftBody = { candidateId?: string };

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production" && !authoriseCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!kimiEnabled()) {
    return NextResponse.json(
      { error: "NVIDIA_API_KEY not set" },
      { status: 503 }
    );
  }

  const body = ((await req.json().catch(() => ({}))) as DraftBody) ?? {};
  if (!body.candidateId) {
    return NextResponse.json({ error: "candidateId required" }, { status: 400 });
  }

  const [cand] = await db
    .select()
    .from(schema.discoveryCandidates)
    .where(eq(schema.discoveryCandidates.id, body.candidateId))
    .limit(1);
  if (!cand) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

  const run = await startRun("draft_writer", "manual");
  try {
    const sourceTexts: string[] = [];
    for (const url of cand.sourceUrls ?? []) {
      try {
        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), 25_000);
        const text = await politeFetch(url, ctrl.signal);
        clearTimeout(timeout);
        const stripped = text
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 30_000);
        sourceTexts.push(`SOURCE: ${url}\n\n${stripped}`);
        run.incrementProcessed();
      } catch (e) {
        run.addError(`${url}: ${(e as Error).message}`);
      }
    }

    if (sourceTexts.length === 0) {
      run.addError("No source content could be fetched");
      const r = await run.finish("failed");
      return NextResponse.json(r, { status: 500 });
    }

    const userPrompt = `Discovery proposed this programme:
TITLE: ${cand.proposedTitle}
SUMMARY: ${cand.proposedSummary}
STATE: ${cand.proposedGeographyName} (${cand.proposedStateCode})
ORG: ${cand.proposedLeadOrganisationName}

SOURCE PASSAGES TO DRAW FROM (use these and only these for citations):

${sourceTexts.join("\n\n---\n\n")}

Draft the Entry as a single JSON object per the schema. Respond with JSON only.`;

    const { text, inputTokens, outputTokens } = await kimiChat(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.2, maxTokens: 4000, jsonMode: true }
    );
    run.addCost(kimiCostUsd(inputTokens, outputTokens));

    const obj = safeJsonParse<Record<string, unknown>>(text);
    if (!obj) {
      run.addError("No JSON object in response");
      const r = await run.finish("partial");
      return NextResponse.json({ ...r, raw: text.slice(0, 400) }, { status: 500 });
    }

    if (obj.refused) {
      run.addError(`Refused: ${obj.reason}`);
      const r = await run.finish("partial");
      return NextResponse.json({ ...r, refused: true, reason: obj.reason });
    }

    const [draft] = await db
      .insert(schema.draftEntries)
      .values({
        title: String(obj.title ?? "").slice(0, 120),
        tagline: obj.tagline ? String(obj.tagline).slice(0, 240) : null,
        primaryThemeSlug: obj.primary_theme_slug ? String(obj.primary_theme_slug) : null,
        primaryGeographyName: obj.primary_geography_name
          ? String(obj.primary_geography_name)
          : null,
        primaryStateCode: obj.primary_state_code ? String(obj.primary_state_code).slice(0, 4) : null,
        scaleBand: (obj.scale_band as schema.Entry["scaleBand"]) ?? null,
        startYear: typeof obj.start_year === "number" ? obj.start_year : null,
        endYear: typeof obj.end_year === "number" ? obj.end_year : null,
        context: obj.context ? String(obj.context) : null,
        whatWasAttempted: obj.what_was_attempted ? String(obj.what_was_attempted) : null,
        whatWasAchieved: obj.what_was_achieved ? String(obj.what_was_achieved) : null,
        whatWorked: obj.what_worked ? String(obj.what_worked) : null,
        whatDidNotWork: obj.what_did_not_work ? String(obj.what_did_not_work) : null,
        leadOrganisationName: obj.lead_organisation_name
          ? String(obj.lead_organisation_name).slice(0, 200)
          : null,
        sourcePassages: Array.isArray(obj.source_passages)
          ? (obj.source_passages as never)
          : [],
        draftConfidence:
          typeof obj.draft_confidence === "number" ? obj.draft_confidence : null,
        draftedInRunId: run.id,
        promotedFromCandidateId: cand.id,
      })
      .returning();

    await db
      .update(schema.discoveryCandidates)
      .set({ status: "promoted_to_draft" })
      .where(eq(schema.discoveryCandidates.id, cand.id));

    run.incrementYielded();
    const summary = await run.finish();
    return NextResponse.json({ ...summary, draftId: draft.id });
  } catch (e) {
    run.addError(e);
    const r = await run.finish("failed");
    return NextResponse.json(r, { status: 500 });
  }
}
