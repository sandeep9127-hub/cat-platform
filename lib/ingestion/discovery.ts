import { db, schema } from "@/lib/db";
import { startRun } from "@/lib/ingestion/run";
import { estimateCostUsd, getClient } from "@/lib/ai/anthropic";

const DISCOVERY_MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are the Transformation Hub's discovery agent. Your job is to find NEW credible food-systems programmes in India that the platform has not yet documented.

You may use the web_search tool, restricted to .gov.in, .org, and major news domains.

Constraints:
- India-only.
- Programme-level work (named, geographically defined, with an identifiable lead organisation). Not individual farms, individual policies, or industry reports.
- Surface 3 to 8 candidate programmes per run. Quality over volume.
- For each candidate, propose: title, 2-3 sentence summary, primary theme slug (from the controlled list), state name + 2-letter code, lead organisation name, and 1-3 source URLs.

Output a single JSON array of candidates. Each item must have keys: title, summary, theme_slug, state_name, state_code, lead_organisation, source_urls, confidence (0-1).

Valid theme slugs: soil-land, water, seeds-biodiversity, climate-resilience, women-collectives, markets-value-chains, policy-governance, knowledge-capacity.

Refuse to invent programmes. If a search returns nothing credible, return an empty array.`;

/**
 * Run the discovery agent once: Claude + the Anthropic web-search tool surfaces
 * candidate food-systems programmes, which land in discovery_candidates as
 * `pending_triage` rows for an editor to triage. Shared by the weekly cron and
 * the manual "Run discovery now" admin button.
 */
export async function runDiscovery(
  triggeredBy: "cron" | "manual" = "cron",
): Promise<Record<string, unknown> & { skipped?: boolean; yielded?: number }> {
  const anthropic = getClient();
  if (!anthropic) {
    return { skipped: true, error: "ANTHROPIC_API_KEY not set; discovery agent skipped" };
  }

  const run = await startRun("discovery_agent", triggeredBy);

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
            "scroll.in",
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

    const match = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (!match) {
      run.addError("Discovery returned no parseable JSON array");
      return await run.finish("partial");
    }

    let candidates: unknown;
    try {
      candidates = JSON.parse(match[0]);
    } catch (e) {
      run.addError(`JSON parse error: ${(e as Error).message}`);
      return await run.finish("partial");
    }

    if (!Array.isArray(candidates)) {
      return await run.finish("partial");
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
          confidenceScore: typeof cand.confidence === "number" ? cand.confidence : null,
          discoveredInRunId: run.id,
        });
        run.incrementYielded();
      } catch (e) {
        run.addError(`Insert candidate failed: ${(e as Error).message}`);
      }
    }
  } catch (e) {
    run.addError(e);
    return await run.finish("failed");
  }

  return await run.finish();
}
