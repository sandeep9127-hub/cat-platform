import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { sql } from "drizzle-orm";
import { BudgetExceededError, claudeEnabled, claudeMessage, type ChatTurn } from "@/lib/ai/claude";
import { embedQuery } from "@/lib/ai/embed";
import { searchLandscapeChunks } from "@/lib/db/landscape-kb";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { rateLimit, getClientIp } from "@/lib/security/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TURNS = 8;
const MAX_CONTEXT_HITS = 8;

type ClientMessage = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const profile = LANDSCAPES[slug];
  if (!profile) {
    return NextResponse.json({ error: "Landscape not found" }, { status: 404 });
  }
  if (!claudeEnabled()) {
    return NextResponse.json(
      { error: "Ask is not configured. Set ANTHROPIC_API_KEY." },
      { status: 503 }
    );
  }

  const ip = getClientIp(req);
  const limited = await rateLimit({ key: "landscape-ask", ip, limit: 10, windowSec: 60 });
  if (!limited.ok) {
    return NextResponse.json(
      { refusal: "Too many questions in a short time. Please wait a minute and try again." },
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
      { refusal: `Session capped at ${MAX_TURNS} turns. Refresh to start over.` },
      { status: 429 }
    );
  }

  const lastUserMessage = messages[messages.length - 1].content;

  // 1. Embed the question, retrieve top chunks scoped to this landscape
  let chunks: Awaited<ReturnType<typeof searchLandscapeChunks>> = [];
  try {
    const q = await embedQuery(lastUserMessage);
    chunks = await searchLandscapeChunks(slug, q, MAX_CONTEXT_HITS);
  } catch {
    // Continue — the model will degrade gracefully with no context
  }

  const contextBlock = chunks.length
    ? `LANDSCAPE CONTEXT — passages retrieved from the ${profile.name} Landscape Investment Plan:\n\n` +
      chunks
        .map(
          (c, i) =>
            `[${i + 1}] ${c.sectionPath ? `(${c.sectionPath})\n` : ""}${c.chunkText.slice(0, 1500)}`
        )
        .join("\n\n---\n\n")
    : `(no passages indexed for this landscape yet)`;

  const systemPrompt = `You are a scoped knowledge agent for the CAT Landscape: ${profile.name}, ${profile.district}, ${profile.region}.

You answer questions strictly from the investment plan passages provided in each turn. Rules:
- Cite the passage you used by its [number] in square brackets.
- Keep answers to 2-3 short paragraphs. Plain language. No em dashes.
- For budget questions, prefer numbers from passages tagged "budget_summary" and quote them.
- If the passages don't cover the question, say "Not in the ${profile.name} investment plan yet" and suggest a related section the reader could explore.
- Refuse off-topic questions. This agent only knows about ${profile.name}.
- Do not invent budget figures or interventions not present in the context.`;

  const chatTurns: ChatTurn[] = messages.slice(0, -1).map((m) => ({ role: m.role, content: m.content }));
  chatTurns.push({
    role: "user",
    content: `${contextBlock}\n\n---\n\nReader question: ${lastUserMessage}`,
  });

  let text = "";
  let inputTokens = 0;
  let outputTokens = 0;
  let callCostUsd = 0;
  try {
    const res = await claudeMessage("ask_landscape", { system: systemPrompt, messages: chatTurns });
    text = res.text;
    inputTokens = res.inputTokens;
    outputTokens = res.outputTokens;
    callCostUsd = res.costUsd;
  } catch (e) {
    if (e instanceof BudgetExceededError) {
      return NextResponse.json(
        { refusal: "Ask has reached today's usage limit. Please try again tomorrow." },
        { status: 429 }
      );
    }
    console.error("landscape/ask claude call failed:", e);
    return NextResponse.json(
      { error: "The agent service is unavailable right now." },
      { status: 502 }
    );
  }

  // Log to landscape_chat_sessions
  try {
    const sessionToken = (body.sessionToken ?? "anon").slice(0, 64);
    await db.execute(
      sql`INSERT INTO "cat".landscape_chat_sessions
            (landscape_slug, session_token, turn_count, total_input_tokens, total_output_tokens, cost_usd, cited_chunk_ids)
          VALUES (${slug}, ${sessionToken}, ${messages.filter((m) => m.role === "user").length},
                  ${inputTokens}, ${outputTokens}, ${callCostUsd},
                  ${JSON.stringify(chunks.map((c) => c.id))}::jsonb)`
    );
  } catch {
    // Non-fatal
  }

  return NextResponse.json({
    text,
    citations: chunks.map((c, i) => ({
      index: i + 1,
      section: c.sectionPath,
      kind: c.chunkKind,
      score: c.score,
      preview: c.chunkText.slice(0, 240) + (c.chunkText.length > 240 ? "…" : ""),
    })),
  });
}
