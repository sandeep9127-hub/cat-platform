import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { gte, sql } from "drizzle-orm";
import { searchEntries } from "@/lib/db/search";
import { searchLandscapeChunks, getIngestedLandscapeSlugs } from "@/lib/db/landscape-kb";
import {
  kimiChatStream,
  kimiEnabled,
  kimiCostUsd,
  type ChatMessage,
} from "@/lib/ai/kimi";
import { LANDSCAPES } from "@/lib/data/landscapes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Pin the agent lambda to Vercel's Mumbai region. Supabase Postgres
// sits in ap-south-1 too, so every retrieval query is now an in-region
// hop (~5-15ms RTT) instead of a transatlantic round-trip from iad1
// (~150-250ms each way). With FTS + pgvector running in parallel that
// shaves ~300-500ms off TTFB before the LLM even starts streaming.
export const preferredRegion = "bom1";

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

/**
 * Section paths and chunk text ingested from the investment plan DOCX
 * carry raw HTML anchors (e.g. `<a id="_heading=h.gycv42fvbl6c"></a>`)
 * and markdown escape characters (e.g. `5\.13\.1`, `post\-programme\.`).
 * Both render as visual junk in the citation tray. These helpers strip
 * the artefacts so the labels and previews read as plain prose.
 */
function sanitizeSectionPath(s: string): string {
  return s
    .replace(/<a\b[^>]*><\/a>/gi, "") // empty <a id="..."></a>
    .replace(/<[^>]+>/g, "") // any other HTML tag
    .replace(/\\([.\-_()])/g, "$1") // markdown escape: `\.`  -> `.`
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeChunkText(s: string): string {
  return s
    .replace(/<a\b[^>]*><\/a>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\\([.\-_()*])/g, "$1")
    .replace(/_{2,}/g, "") // markdown bold underscores left over
    .replace(/\s+/g, " ")
    .trim();
}

const SYSTEM_PROMPT = `You are the Transformation Hub assistant — an analytical reader of the Consortium for Agroecological Transformations' curated India food-systems library.

How you answer:
- Start your answer with the subject of the question itself, not a meta-comment about where the answer comes from. NEVER begin a sentence with the phrases "Based on", "According to the passages", "From the passages", "From the documents", "From the library", "The passages show", "Looking at the passages", or any equivalent. These phrases are forbidden anywhere in your reply — the reader can see your citations and already knows where the answer came from. Saying it again is dead weight.
- Don't use markdown formatting. No ** for bold, no _ for italic, no # for headings, no - or * for bullet lists. Write in continuous plain prose. The renderer does not interpret markdown and the asterisks show as literal characters to the reader.
- You may synthesise, compare, infer the implication of a finding, and connect two passages where they relate. Analytical reasoning is welcome — as long as every factual claim is grounded in the passages.
- Cite with bracketed numbers like [1], [2] immediately after the sentence that uses that source. One sentence can carry more than one citation if it draws on more than one passage. Group citations at the end of the relevant sentence, not the end of the paragraph.
- Plain, direct language. Short sentences are usually right. No marketing words. No em dashes.

What you must not do:
- Do not state a fact that is not in the passages. If you are inferring beyond what's written, mark it as your reading ("My read of this is…", "The implication seems to be…") — don't dress inference as fact.
- Do not pull in outside knowledge: news memory, web content, training-data facts. Even if you "know" something is true, if it isn't in the passages, leave it out.
- If the passages don't cover the question, say so plainly — "The library doesn't have this yet" — and point to one adjacent topic it does cover. Refusal is honest, not a failure.

Two grounding rails:
- The numbered passages below are the only source material for this turn.
- A reader will see your citations rendered as links to the actual source documents (publisher PDFs, gazettes, partner programme pages). Cite the passage that genuinely supports the claim.`;

type ClientMessage = { role: "user" | "assistant"; content: string };

type Citation = {
  index: number;
  type: "entry" | "landscape" | "factsheet";
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

  // Landscape chunk search per landscape slug. A single scope searches just
  // that landscape; "all" searches every ingested landscape (from the DB).
  // Each result is tagged with the slug it came from so citations can be
  // labelled correctly when more than one knowledge base is searched.
  let chunks: (Awaited<ReturnType<typeof searchLandscapeChunks>>[number] & {
    _slug: string;
  })[] = [];
  if (embedding && wantsLandscape) {
    // A specific landscape scope searches only that landscape. The general
    // ("all") scope searches EVERY ingested landscape plus the HLPE Report 14
    // knowledge base — driven by the DB, so newly uploaded landscape plans are
    // searched automatically with no code change here.
    let slugsToSearch: string[];
    if (onlyThisLandscape) {
      slugsToSearch = [onlyThisLandscape];
    } else {
      const ingested = await getIngestedLandscapeSlugs().catch(() => []);
      // Always include the principles ("hlpe") knowledge base under "all".
      slugsToSearch = Array.from(new Set([...ingested, "hlpe"]));
    }
    const chunkResults = await Promise.all(
      slugsToSearch.map(async (slug) => {
        const r = await searchLandscapeChunks(
          slug,
          embedding,
          MAX_CONTEXT_HITS_PER_SOURCE
        ).catch(() => []);
        return r.map((c) => ({ ...c, _slug: slug }));
      })
    );
    chunks = chunkResults.flat();
  }

  // Fact-sheet chunks — the Solutions Atlas knowledge. Searched under the
  // general ("all") scope, not when a single landscape tab is selected.
  type FsHit = { slug: string; title: string; chunkText: string; score: number };
  let fsResults: FsHit[] = [];
  if (embedding && !onlyThisLandscape) {
    try {
      const { searchFactsheetChunks } = await import("@/lib/factsheet/rag");
      fsResults = await searchFactsheetChunks(embedding, MAX_CONTEXT_HITS_PER_SOURCE);
    } catch {}
  }

  // ── Normalise scores so the two sources can be compared
  // Entries: ts_rank is non-normalised; we squash with x/(x+1) into 0..1
  type Hit = {
    label: string;
    url: string;
    preview: string;
    score: number;
    type: "entry" | "landscape" | "factsheet";
    raw: unknown;
  };

  const entryHits: Hit[] = entries.map((e) => ({
    // Entry citations point to the internal Hub entry page. The DB
    // `entries` table doesn't carry a publisher source_url field today
    // (that lives on news_items + the discovered-records seed). If we
    // add it later, this is where it would resolve.
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
    const slug = c._slug;
    // Section paths from the ingested investment plan were leaking raw HTML
    // anchors like `<a id="_heading=h.xxxxx"></a>` and markdown escapes like
    // `5\.13\.1`. Both surface as ugly junk in the citation tray. Strip
    // tags, undo markdown escapes, and collapse whitespace before display.
    const cleanSection = sanitizeSectionPath(c.sectionPath ?? "");
    const cleanPreview = sanitizeChunkText(c.chunkText);

    // Non-landscape knowledge bases (e.g. the HLPE principles report) get
    // their own label + outbound source link. Landscapes link to their
    // internal investment-plan page.
    let label: string;
    let url: string;
    if (slug === "hlpe") {
      label = `HLPE Report 14${cleanSection ? ` · ${cleanSection}` : ""}`;
      url = "https://www.fao.org/3/ca5602en/ca5602en.pdf";
    } else {
      const landscapeName = LANDSCAPES[slug]?.name ?? slug;
      label = `${landscapeName} Investment Plan${cleanSection ? ` · ${cleanSection}` : ""}`;
      url = `/landscape/${slug}`;
    }

    return {
      label,
      url,
      preview: cleanPreview.slice(0, 240) + (cleanPreview.length > 240 ? "…" : ""),
      score: c.score, // already cosine-similarity 0..1
      type: "landscape",
      raw: c,
    };
  });

  const factsheetHits: Hit[] = fsResults.map((f) => ({
    label: f.title,
    url: `/factsheet/${f.slug}`,
    preview: f.chunkText.slice(0, 240) + (f.chunkText.length > 240 ? "…" : ""),
    score: f.score, // cosine 0..1
    type: "factsheet",
    raw: f,
  }));

  // Combine and rank
  const combined = [...entryHits, ...chunkHits, ...factsheetHits]
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
            h.type === "landscape" || h.type === "factsheet"
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

  // Stream the response. The client subscribes via fetch + getReader and
  // updates the assistant message text as deltas arrive. Each SSE event is
  // a single line `data: <json>\n\n` for easy parsing in the browser.
  //
  // Event types:
  //   { type: "meta", citations, scope }   — first event, before any tokens
  //   { type: "delta", text }              — many of these, one per token batch
  //   { type: "done", refused }            — last event, after the stream ends
  //   { type: "error", message }           — on transport/API failure
  const turnCount = messages.filter((m) => m.role === "user").length;
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(obj: unknown) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      }
      // Meta first so the citation tray can render immediately, even before
      // the first token arrives.
      send({ type: "meta", citations, scope: scope || "all" });

      // Forbidden openers — the system prompt bans these but the model
      // occasionally leaks them anyway. Belt-and-braces: scrub them off
      // the first 80 characters server-side before they reach the
      // browser. We buffer the opening then flush a single delta with
      // the cleaned text; subsequent deltas stream through untouched.
      const PREAMBLE_RE =
        /^(?:Based on (?:the |my |these )?(?:passages|library context|documents|context|sources|provided (?:passages|content))[,:.\s]*|According to (?:the )?(?:passages|library|documents|sources)[,:.\s]*|From (?:the )?(?:passages|library|documents|sources)[,:.\s]*|Looking at (?:the )?(?:passages|library)[,:.\s]*|The (?:passages|library) (?:show|indicate|suggest)s?[,:.\s]*)/i;

      let assistantText = "";
      let buffer = "";
      let bufferingDone = false;
      let inputTokens = 0;
      let outputTokens = 0;

      function flushBuffer() {
        if (bufferingDone) return;
        const cleaned = buffer
          .replace(PREAMBLE_RE, "")
          .replace(/^([a-z])/, (m) => m.toUpperCase());
        assistantText = cleaned;
        send({ type: "delta", text: cleaned });
        buffer = "";
        bufferingDone = true;
      }

      try {
        for await (const evt of kimiChatStream(kimiMessages, {
          temperature: 0.2,
          // 1200 tokens ≈ 900 words. Was 700 which truncated longer
          // analyses mid-sentence on broad questions.
          maxTokens: 1200,
        })) {
          if (evt.type === "delta") {
            if (!bufferingDone) {
              buffer += evt.text;
              if (buffer.length >= 80) flushBuffer();
            } else {
              assistantText += evt.text;
              send({ type: "delta", text: evt.text });
            }
          } else if (evt.type === "done") {
            inputTokens = evt.inputTokens;
            outputTokens = evt.outputTokens;
            // If the whole response was shorter than 80 chars, flush now
            if (!bufferingDone) flushBuffer();
          }
        }
      } catch (e) {
        send({
          type: "error",
          message: "The assistant service is unavailable right now.",
          detail: (e as Error).message,
        });
        controller.close();
        return;
      }

      const wasRefused =
        /not in the library/i.test(assistantText) ||
        /^i (do|don)/i.test(assistantText.trim());

      // Telemetry — non-fatal if it fails
      try {
        await db.insert(schema.agentConversations).values({
          sessionToken,
          turnCount,
          totalInputTokens: inputTokens,
          totalOutputTokens: outputTokens,
          costUsd: kimiCostUsd(inputTokens, outputTokens),
          wasRefused,
          refusalReason: wasRefused ? "library_insufficient" : null,
          citedEntryIds: [],
        });
      } catch {
        // ignore
      }

      send({ type: "done", refused: wasRefused });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      // Hint to disable buffering on proxies that respect it
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}
