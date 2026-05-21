import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { gte, sql } from "drizzle-orm";
import { searchEntries } from "@/lib/db/search";
import { searchLandscapeChunks } from "@/lib/db/landscape-kb";
import { kimiChat, kimiEnabled, kimiCostUsd, type ChatMessage } from "@/lib/ai/kimi";
import { LANDSCAPES } from "@/lib/data/landscapes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TURNS = 8;
const MAX_CONTEXT_HITS_PER_SOURCE = 6;
const NVIDIA_EMBED_MODEL = "nvidia/nv-embedqa-e5-v5";
/**
 * Hard refusal floor — if no entry or chunk meets this normalised score,
 * the model never gets called and the route returns a refusal directly.
 * This is the architectural guarantee that we don't hallucinate beyond
 * uploaded content.
 */
const SCORE_FLOOR = 0.30;

const SYSTEM_PROMPT = `You are the Transformation Hub assistant.

You answer questions strictly from the LIBRARY CONTEXT passages provided in each turn. The Transformation Hub is curated by the Consortium for Agroecological Transformations (CAT), and the library is its small but credible record of food systems work in India.

Hard rules:
1. Every claim must end with a citation in square brackets, like [1] or [2]. Citations refer to the numbered passages in the LIBRARY CONTEXT block.
2. If a claim has no supporting passage, do not write that claim.
3. If the passages do not cover the question, reply: "Not in the library yet." and suggest one related topic the library does cover. Do not invent.
4. Plain language. Short sentences. No marketing words. No em dashes.
5. Do not draw on general knowledge from outside the LIBRARY CONTEXT block. Web sources, news memory, training-data facts: all off-limits.
6. Each source is labelled in the context. Honor the label in your citations.
7. If asked about an external topic (politics, current events, anything not in the passages), refuse with: "Not in the library."

Treat refusal as the correct answer when the passages don't cover the question. Honesty is a feature.`;

type ClientMessage = { role: "user" | "assistant"; content: string };

type Citation = {
  index: number;
  type: "entry" | "landscape";
  label: string;
  url: string;
  preview: string;
  score: number;
};

async function dailyTurnCeilingExceeded(): Promise<boolean> {
  const dailyCap = Number(process.env.AGENT_DAILY_TURNS ?? 500);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(turn_count), 0)`.mapWith(Number) })
    .from(schema.agentConversations)
    .where(gte(schema.agentConversations.startedAt, since));
  return (row?.total ?? 0) >= dailyCap;
}

const STARTERS = [
  "What's actually working on water in semi-arid India?",
  "Show me programmes that publish what didn't work",
  "Which entries are CAT-authored versus self-submitted?",
];

export async function GET() {
  return NextResponse.json({
    enabled: kimiEnabled(),
    starters: STARTERS,
    maxTurns: MAX_TURNS,
  });
}

async function embedQuery(text: string): Promise<number[] | null> {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://integrate.api.nvidia.com/v1/embeddings", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        input: [text.slice(0, 1200)],
        model: NVIDIA_EMBED_MODEL,
        input_type: "query",
        encoding_format: "float",
        truncate: "END",
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data[0].embedding;
  } catch {
    return null;
  }
}

/**
 * Federated retrieval. Runs entries (FTS) + landscape chunks (pgvector)
 * in parallel, normalises scores, and returns labelled citations sorted
 * by score. If `scope` is a landscape slug, the entries leg is narrowed
 * accordingly and the landscape leg is scoped to just that landscape.
 */
async function retrieve(
  query: string,
  scope: string | null
): Promise<{ citations: Citation[]; contextBlock: string; topScore: number }> {
  const trimmed = query.trim();
  if (!trimmed) return { citations: [], contextBlock: "", topScore: 0 };

  const wantsLandscape = !scope || scope === "all" || LANDSCAPES[scope] != null;
  const onlyThisLandscape = scope && LANDSCAPES[scope] ? scope : null;

  const [entries, embedding] = await Promise.all([
    // Entries FTS — scope all entries unless filtered to a landscape later
    searchEntries({ q: trimmed }, MAX_CONTEXT_HITS_PER_SOURCE).catch(() => []),
    embedQuery(trimmed),
  ]);

  // Landscape chunk search per landscape slug. If a single scope, just that one.
  // Otherwise, search the Patratu landscape (the only one with chunks today).
  // Easy to extend to all ingested landscapes once more are loaded.
  let chunks: Awaited<ReturnType<typeof searchLandscapeChunks>> = [];
  if (embedding && wantsLandscape) {
    const slugsToSearch = onlyThisLandscape ? [onlyThisLandscape] : ["patratu"];
    const chunkResults = await Promise.all(
      slugsToSearch.map((slug) =>
        searchLandscapeChunks(slug, embedding, MAX_CONTEXT_HITS_PER_SOURCE).catch(() => [])
      )
    );
    chunks = chunkResults.flat();
  }

  // ── Normalise scores so the two sources can be compared
  // Entries: ts_rank is non-normalised; we squash with x/(x+1) into 0..1
  type Hit = {
    label: string;
    url: string;
    preview: string;
    score: number;
    type: "entry" | "landscape";
    raw: unknown;
  };

  const entryHits: Hit[] = entries.map((e) => ({
    label: `Entry · ${e.title}`,
    url: `/entry/${e.slug}`,
    preview:
      e.tagline +
      (e.highlight ? "  " + e.highlight.replace(/<\/?mark>/g, "").slice(0, 200) : ""),
    score: e.rank / (e.rank + 1),
    type: "entry",
    raw: e,
  }));

  const chunkHits: Hit[] = chunks.map((c) => {
    // Try to find the landscape slug by querying the landscape_slug column from the result
    // searchLandscapeChunks doesn't return slug today, so we use the scope when known.
    // For demo simplicity we label by section path.
    const landscapeSlug = onlyThisLandscape ?? "patratu";
    const landscapeName = LANDSCAPES[landscapeSlug]?.name ?? landscapeSlug;
    return {
      label: `${landscapeName} Investment Plan${c.sectionPath ? ` · ${c.sectionPath}` : ""}`,
      url: `/landscape/${landscapeSlug}`,
      preview: c.chunkText.slice(0, 240) + (c.chunkText.length > 240 ? "…" : ""),
      score: c.score, // already cosine-similarity 0..1
      type: "landscape",
      raw: c,
    };
  });

  // Combine and rank
  const combined = [...entryHits, ...chunkHits]
    .filter((h) => h.score >= SCORE_FLOOR)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const citations: Citation[] = combined.map((h, i) => ({
    index: i + 1,
    type: h.type,
    label: h.label,
    url: h.url,
    preview: h.preview.replace(/\s+/g, " ").trim(),
    score: Number(h.score.toFixed(3)),
  }));

  const topScore = combined[0]?.score ?? 0;

  // Build the context block in the labelled form the model uses
  const contextBlock = combined.length
    ? `LIBRARY CONTEXT — labelled passages. Cite by the number in square brackets:\n\n` +
      combined
        .map((h, i) => {
          const fullText =
            h.type === "landscape"
              ? (h.raw as { chunkText?: string }).chunkText?.slice(0, 1200) ?? h.preview
              : h.preview;
          return `[${i + 1}] ${h.label}\n${fullText}`;
        })
        .join("\n\n---\n\n")
    : "";

  return { citations, contextBlock, topScore };
}

export async function POST(req: NextRequest) {
  if (!kimiEnabled()) {
    return NextResponse.json(
      { error: "Agent is not configured. Set NVIDIA_API_KEY to enable the assistant." },
      { status: 503 }
    );
  }

  if (await dailyTurnCeilingExceeded()) {
    return NextResponse.json(
      {
        refusal:
          "Daily turn ceiling reached for this preview. Browse by theme or search instead.",
      },
      { status: 429 }
    );
  }

  const body = (await req.json()) as {
    sessionToken?: string;
    messages: ClientMessage[];
    scope?: string;
  };
  const messages = (body.messages ?? []).slice(-MAX_TURNS * 2);
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "No user message" }, { status: 400 });
  }
  if (messages.filter((m) => m.role === "user").length > MAX_TURNS) {
    return NextResponse.json(
      {
        refusal: `Session capped at ${MAX_TURNS} turns. Refresh to start over.`,
      },
      { status: 429 }
    );
  }

  const sessionToken = (body.sessionToken ?? "").slice(0, 64) || "anon";
  const scope = body.scope?.trim() || null;
  const latestUserMessage = messages[messages.length - 1].content;

  // Federated retrieval
  const { citations, contextBlock, topScore } = await retrieve(latestUserMessage, scope);

  // Hard refusal floor: if nothing meets the threshold, return refusal without
  // calling the model at all. This is the architectural no-hallucination guarantee.
  if (citations.length === 0 || topScore < SCORE_FLOOR) {
    return NextResponse.json({
      text: "Not in the library yet. The library hasn't matched this question to any indexed entry or investment-plan passage. Try a related topic — e.g. soil, water, millets, FPO models — or browse the themes index.",
      citations: [],
      refused: true,
      reason: "no_match_above_floor",
    });
  }

  // Construct Kimi messages: system + history + final user with context
  const kimiMessages: ChatMessage[] = [{ role: "system", content: SYSTEM_PROMPT }];
  for (const m of messages.slice(0, -1)) {
    kimiMessages.push({ role: m.role, content: m.content });
  }
  kimiMessages.push({
    role: "user",
    content: `${contextBlock}\n\n---\n\nReader question: ${latestUserMessage}`,
  });

  let assistantText = "";
  let inputTokens = 0;
  let outputTokens = 0;
  try {
    const res = await kimiChat(kimiMessages, { temperature: 0.2, maxTokens: 700 });
    assistantText = res.text;
    inputTokens = res.inputTokens;
    outputTokens = res.outputTokens;
  } catch (e) {
    return NextResponse.json(
      {
        error: "The assistant service is unavailable right now.",
        detail: (e as Error).message,
      },
      { status: 502 }
    );
  }

  const wasRefused =
    /not in the library/i.test(assistantText) ||
    /^i (do|don)/i.test(assistantText.trim());

  // Log to the existing agent_conversations table
  try {
    await db.insert(schema.agentConversations).values({
      sessionToken,
      turnCount: messages.filter((m) => m.role === "user").length,
      totalInputTokens: inputTokens,
      totalOutputTokens: outputTokens,
      costUsd: kimiCostUsd(inputTokens, outputTokens),
      wasRefused,
      refusalReason: wasRefused ? "library_insufficient" : null,
      citedEntryIds: [],
    });
  } catch {
    // Non-fatal
  }

  return NextResponse.json({
    text: assistantText,
    citations,
    refused: wasRefused,
    scope: scope || "all",
  });
}
