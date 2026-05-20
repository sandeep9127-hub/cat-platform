import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { sql } from "drizzle-orm";
import { kimiChat, kimiEnabled, kimiCostUsd, type ChatMessage } from "@/lib/ai/kimi";
import { searchLandscapeChunks } from "@/lib/db/landscape-kb";
import { LANDSCAPES } from "@/lib/data/landscapes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TURNS = 8;
const MAX_CONTEXT_HITS = 8;

const NVIDIA_EMBED_MODEL = "nvidia/nv-embedqa-e5-v5";

async function embedQuery(text: string): Promise<number[]> {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) throw new Error("NVIDIA_API_KEY missing");
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
  if (!res.ok) throw new Error(`Embed ${res.status}`);
  const data = await res.json();
  return data.data[0].embedding;
}

type ClientMessage = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const profile = LANDSCAPES[slug];
  if (!profile) {
    return NextResponse.json({ error: "Landscape not found" }, { status: 404 });
  }
  if (!kimiEnabled()) {
    return NextResponse.json(
      { error: "Ask is not configured. Set NVIDIA_API_KEY." },
      { status: 503 }
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
    // Continue — Kimi will degrade gracefully with no context
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

You answer questions strictly from the LIP passages provided in each turn. Rules:
- Cite the passage you used by its [number] in square brackets.
- Keep answers to 2-3 short paragraphs. Plain language. No em dashes.
- For budget questions, prefer numbers from passages tagged "budget_summary" and quote them.
- If the passages don't cover the question, say "Not in the {profile.name} LIP yet" and suggest a related section the reader could explore.
- Refuse off-topic questions. This agent only knows about ${profile.name}.
- Do not invent budget figures or interventions not present in the context.`;

  const kimiMessages: ChatMessage[] = [{ role: "system", content: systemPrompt }];
  for (const m of messages.slice(0, -1)) {
    kimiMessages.push({ role: m.role, content: m.content });
  }
  kimiMessages.push({
    role: "user",
    content: `${contextBlock}\n\n---\n\nReader question: ${lastUserMessage}`,
  });

  let text = "";
  let inputTokens = 0;
  let outputTokens = 0;
  try {
    const res = await kimiChat(kimiMessages, { temperature: 0.25, maxTokens: 700 });
    text = res.text;
    inputTokens = res.inputTokens;
    outputTokens = res.outputTokens;
  } catch (e) {
    return NextResponse.json(
      { error: "The agent service is unavailable right now.", detail: (e as Error).message },
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
                  ${inputTokens}, ${outputTokens}, ${kimiCostUsd(inputTokens, outputTokens)},
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
