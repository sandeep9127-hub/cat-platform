import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { authoriseCronRequest, startRun } from "@/lib/ingestion/run";
import { estimateCostUsd, getClient } from "@/lib/ai/anthropic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const DISCOVERY_MODEL = "claude-sonnet-4-6";

/**
 * Weekly discovery agent. Uses Claude with the Anthropic web search tool,
 * allowlisted to .gov.in, .org, and major news indices, to surface candidate
 * food-systems programmes that aren't yet in the library. Output lands in
 * discovery_candidates as `pending_triage` rows for the CAT editor to triage.
 */
const SYSTEM_PROMPT = `You are CAT Platform's discovery agent. Your job is to find NEW credible food-systems programmes in India that the platform has not yet documented.

You may use the web_search tool, restricted to .gov.in, .org, and major news domains.

Constraints:
- India-only.
- Programme-level work (named, geographically defined, with an identifiable lead organisation). Not individual farms, individual policies, or industry reports.
- Surface 3 to 8 candidate programmes per run. Quality over volume.
- For each candidate, propose: title, 2-3 sentence summary, primary theme slug (from the controlled list), state name + 2-letter code, lead organisation name, and 1-3 source URLs.

Output a single JSON array of candidates. Each item must have keys: title, summary, theme_slug, state_name, state_code, lead_organisation, source_urls, confidence (0-1).

Valid theme slugs: soil-land, water, seeds-biodiversity, climate-resilience, women-collectives, markets-value-chains, policy-governance, knowledge-capacity.

Refuse to invent programmes. If a search returns nothing credible, return an empty array.`;

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production" && !authoriseCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const anthropic = getClient();
  if (!anthropic) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not set; discovery agent skipped" },
      { status: 503 }
    );
  }

  const run = await startRun("discovery_agent");

  try {
    const themes = await db.select().from(schema.themes);
    const themeList = themes.map((t) => `${t.slug} (${t.name})`).join(", ");

    const userPrompt = `Search for credible food-systems programmes in India that the platform has not yet documented this edition. Vary the theme focus across runs.

Themes for context: ${themeList}.

Return only the JSON array of candidates per the instructions.`;

    const res = await anthropic.messages.create({
      model: DISCOVERY_MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [
        {
          type: "web_search_20250305" as never,
          name: "web_search",
          max_uses: 8,
          allowed_domains: [
            "gov.in",
            "nic.in",
            "icar.org.in",
            "wassan.org",
            "nabard.org",
            "ifad.org",
            "icrisat.org",
            "downtoearth.org.in",
            "thehindu.com",
            "scroll.in",
            "indianexpress.com",
            "thewire.in",
          ],
        } as never,
      ],
      messages: [{ role: "user", content: userPrompt }],
    });

    run.addCost(estimateCostUsd(res.usage.input_tokens, res.usage.output_tokens));

    const text = res.content
      .filter((b) => b.type === "text")
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n");

    // Best-effort extract a JSON array from the response.
    const match = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (!match) {
      run.addError("Discovery returned no parseable JSON array");
      const r = await run.finish("partial");
      return NextResponse.json({ ...r, raw: text.slice(0, 500) });
    }

    let candidates: unknown;
    try {
      candidates = JSON.parse(match[0]);
    } catch (e) {
      run.addError(`JSON parse error: ${(e as Error).message}`);
      const r = await run.finish("partial");
      return NextResponse.json(r);
    }

    if (!Array.isArray(candidates)) {
      const r = await run.finish("partial");
      return NextResponse.json(r);
    }

    for (const c of candidates) {
      run.incrementProcessed();
      const cand = c as Record<string, unknown>;
      try {
        await db.insert(schema.discoveryCandidates).values({
          proposedTitle: String(cand.title ?? "").slice(0, 200),
          proposedSummary: String(cand.summary ?? ""),
          proposedThemes: cand.theme_slug ? [String(cand.theme_slug)] : [],
          proposedGeographyName: cand.state_name ? String(cand.state_name) : null,
          proposedStateCode: cand.state_code ? String(cand.state_code).slice(0, 4) : null,
          proposedLeadOrganisationName: cand.lead_organisation
            ? String(cand.lead_organisation).slice(0, 200)
            : null,
          sourceUrls: Array.isArray(cand.source_urls) ? (cand.source_urls as string[]) : [],
          confidenceScore:
            typeof cand.confidence === "number" ? cand.confidence : null,
          discoveredInRunId: run.id,
        });
        run.incrementYielded();
      } catch (e) {
        run.addError(`Insert candidate failed: ${(e as Error).message}`);
      }
    }
  } catch (e) {
    run.addError(e);
    const r = await run.finish("failed");
    return NextResponse.json(r, { status: 500 });
  }

  const summary = await run.finish();
  return NextResponse.json(summary);
}

export const POST = GET;
