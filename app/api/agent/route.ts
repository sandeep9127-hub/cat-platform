import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, sql, and, gte } from "drizzle-orm";
import { AGENT_TOOLS, runTool } from "@/lib/ai/agent-tools";
import { AGENT_MODEL, estimateCostUsd, getClient } from "@/lib/ai/anthropic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TURNS = 5;
const MAX_TOOL_ITERATIONS = 6;

const SYSTEM_PROMPT = `You are the public preview of the CAT Platform agent.

CAT (Consortium for Agroecological Transformations) curates a small editorial library of credible food-systems work in India. Your job is to answer reader questions strictly from this library by calling the provided tools.

Hard rules:
- Stay scoped to the CAT library. Do not answer questions outside food-systems work in India.
- Cite specific entries when answering. Refer to them by title, not slug.
- Keep responses to 2-3 short paragraphs at most. Plain language. No em dashes.
- If the library does not have enough material to answer with confidence, say so clearly: "Not enough in the library yet to answer that with confidence." Then suggest the closest matching entries.
- Treat "what did not work" as equally important as "what worked" when summarising.
- If the question is off-topic, return the refusal politely and offer three relevant suggestions from list_themes or recent entries.
- This is a public preview labelled as such. The full agent ships later.`;

const STARTERS = [
  "What's actually working on water in semi-arid India?",
  "Show me programmes that publish what didn't work",
  "Which entries are CAT-authored versus self-submitted?",
];

type ClientMessage = { role: "user" | "assistant"; content: string };

async function dailyCostCeilingExceeded(): Promise<boolean> {
  const ceiling = Number(process.env.AGENT_DAILY_USD_CEILING ?? 5);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(cost_usd), 0)`.mapWith(Number) })
    .from(schema.agentConversations)
    .where(gte(schema.agentConversations.startedAt, since));
  return (row?.total ?? 0) >= ceiling;
}

export async function GET() {
  return NextResponse.json({
    enabled: !!process.env.ANTHROPIC_API_KEY,
    starters: STARTERS,
    maxTurns: MAX_TURNS,
  });
}

export async function POST(req: NextRequest) {
  const anthropic = getClient();
  if (!anthropic) {
    return NextResponse.json(
      { error: "Agent is not configured. Set ANTHROPIC_API_KEY to enable the preview." },
      { status: 503 }
    );
  }

  if (await dailyCostCeilingExceeded()) {
    return NextResponse.json(
      {
        refusal:
          "The agent has reached its daily cost ceiling for this preview. Browse by theme or use the search instead.",
      },
      { status: 429 }
    );
  }

  const body = (await req.json()) as {
    sessionToken: string;
    messages: ClientMessage[];
  };

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

  // Convert client message format to Anthropic format
  const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let totalInput = 0;
  let totalOutput = 0;
  const citedSlugs = new Set<string>();
  let refusalReason: string | null = null;

  // Tool loop
  let response;
  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    response = await anthropic.messages.create({
      model: AGENT_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: AGENT_TOOLS,
      messages: anthropicMessages,
    });
    totalInput += response.usage.input_tokens;
    totalOutput += response.usage.output_tokens;

    if (response.stop_reason !== "tool_use") break;

    const toolUses = response.content.filter((b) => b.type === "tool_use");
    if (toolUses.length === 0) break;

    anthropicMessages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      if (tu.type !== "tool_use") continue;
      const result = await runTool(tu.name, tu.input as Record<string, unknown>);
      if (Array.isArray(result)) {
        for (const r of result as { slug?: string }[]) {
          if (r.slug) citedSlugs.add(r.slug);
        }
      } else if (
        result &&
        typeof result === "object" &&
        "slug" in result &&
        typeof (result as { slug: unknown }).slug === "string"
      ) {
        citedSlugs.add((result as { slug: string }).slug);
      }
      toolResults.push({
        type: "tool_result",
        tool_use_id: tu.id,
        content: JSON.stringify(result),
      });
    }

    anthropicMessages.push({ role: "user", content: toolResults });
  }

  const assistantText =
    response?.content
      .filter((b) => b.type === "text")
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n") ?? "";

  const wasRefused = /not enough in the library/i.test(assistantText);
  if (wasRefused) refusalReason = "library_insufficient";

  // Log conversation
  await db.insert(schema.agentConversations).values({
    sessionToken,
    turnCount: messages.filter((m) => m.role === "user").length,
    totalInputTokens: totalInput,
    totalOutputTokens: totalOutput,
    costUsd: estimateCostUsd(totalInput, totalOutput),
    wasRefused,
    refusalReason,
    citedEntryIds: [],
  });

  return NextResponse.json({
    text: assistantText,
    citedSlugs: Array.from(citedSlugs),
    cost: estimateCostUsd(totalInput, totalOutput),
    refused: wasRefused,
  });
}
