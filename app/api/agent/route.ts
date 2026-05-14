import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { gte, sql } from "drizzle-orm";
import { searchEntries } from "@/lib/db/search";
import { kimiChat, kimiEnabled, kimiCostUsd, type ChatMessage } from "@/lib/ai/kimi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TURNS = 5;
const MAX_CONTEXT_HITS = 6;

const SYSTEM_PROMPT = `You are the public preview of the CAT Platform agent.

CAT (Consortium for Agroecological Transformations) curates a small editorial library of credible food-systems work in India. You answer reader questions ONLY from the library passages provided in the context block of each turn.

Hard rules:
- Stay scoped to the CAT library. Refuse off-topic questions politely.
- Cite entries by their title (not slug). When you cite, wrap the title in square brackets: e.g. [Andhra Pradesh Community Natural Farming].
- Keep responses to 2 short paragraphs. Plain language. No em dashes.
- If the context block is empty or weak, say: "Not enough in the library yet to answer that with confidence." Suggest 2-3 themes or related entries from the library if any matched.
- Treat "what did not work" as equally important as "what worked" when summarising.
- This is a public preview labelled as such. The full agent ships later.`;

type ClientMessage = { role: "user" | "assistant"; content: string };

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

/**
 * Retrieve a compact context block from the library based on the user's
 * latest message. We use the existing Postgres FTS, then format each hit
 * as a short bullet for the prompt. This is the "tool use" of the preview;
 * NIM doesn't expose Anthropic-style tools, so we do retrieval ourselves.
 */
async function buildContextBlock(query: string): Promise<{
  block: string;
  citedSlugs: string[];
}> {
  if (!query.trim()) return { block: "", citedSlugs: [] };
  const hits = await searchEntries({ q: query }, MAX_CONTEXT_HITS);
  if (hits.length === 0) return { block: "(no matching entries found in the library)", citedSlugs: [] };

  const lines = hits.map((h, i) => {
    const yearRange = h.endYear ? `${h.startYear}-${h.endYear}` : `${h.startYear}-ongoing`;
    return `[${i + 1}] ${h.title} — ${h.stateName} · ${h.scaleBand.replace("_", " ")} · ${yearRange} · theme: ${h.themeName} · endorsement: ${h.catEndorsement.replace("cat_", "")}
    Tagline: ${h.tagline}
    ${h.highlight ? `Excerpt: ${h.highlight.replace(/<\/?mark>/g, "").slice(0, 280)}` : ""}`.trim();
  });
  return {
    block: `LIBRARY CONTEXT (the only material you may draw from):\n\n${lines.join("\n\n")}`,
    citedSlugs: hits.map((h) => h.slug),
  };
}

export async function POST(req: NextRequest) {
  if (!kimiEnabled()) {
    return NextResponse.json(
      { error: "Agent is not configured. Set NVIDIA_API_KEY to enable the Kimi-backed preview." },
      { status: 503 }
    );
  }

  if (await dailyTurnCeilingExceeded()) {
    return NextResponse.json(
      {
        refusal:
          "The agent has reached its daily turn ceiling for this preview. Browse by theme or use search instead.",
      },
      { status: 429 }
    );
  }

  const body = (await req.json()) as { sessionToken?: string; messages: ClientMessage[] };
  const messages = (body.messages ?? []).slice(-MAX_TURNS * 2);
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "No user message" }, { status: 400 });
  }
  if (messages.filter((m) => m.role === "user").length > MAX_TURNS) {
    return NextResponse.json(
      {
        refusal:
          "Preview is capped at 5 turns. Start a new conversation, or browse by theme for deeper exploration.",
      },
      { status: 429 }
    );
  }

  const sessionToken = (body.sessionToken ?? "").slice(0, 64) || "anon";
  const latestUserMessage = messages[messages.length - 1].content;
  const { block: contextBlock, citedSlugs } = await buildContextBlock(latestUserMessage);

  // Construct Kimi messages: system + (history rewritten) + final user with context
  const kimiMessages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ];
  // include prior turns verbatim
  for (const m of messages.slice(0, -1)) {
    kimiMessages.push({ role: m.role, content: m.content });
  }
  // append the latest user message with the retrieved context inline
  kimiMessages.push({
    role: "user",
    content: contextBlock
      ? `${contextBlock}\n\n---\n\nReader question: ${latestUserMessage}`
      : latestUserMessage,
  });

  let assistantText = "";
  let inputTokens = 0;
  let outputTokens = 0;
  try {
    const res = await kimiChat(kimiMessages, { temperature: 0.3, maxTokens: 700 });
    assistantText = res.text;
    inputTokens = res.inputTokens;
    outputTokens = res.outputTokens;
  } catch (e) {
    return NextResponse.json(
      {
        error: "The agent service is unavailable right now.",
        detail: (e as Error).message,
      },
      { status: 502 }
    );
  }

  const wasRefused = /not enough in the library/i.test(assistantText);

  // Log
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
    citedSlugs,
    cost: 0,
    refused: wasRefused,
  });
}
