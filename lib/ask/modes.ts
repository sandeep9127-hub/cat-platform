import type { NextRequest } from "next/server";
import { BudgetExceededError } from "@/lib/ai/claude";
import { addAssistantMessage, type StoredCitation } from "@/lib/ask/store";
import type { Hit } from "@/lib/rag/search";
import { SSE_HEADERS, sseLine, type Citation } from "@/lib/ask/shared";

/** What Compare and the matchmaker need from the request (built in v2.ts). */
export type ModeCtx = {
  req: NextRequest;
  question: string;
  scope: string | null;
  conversationId: string;
  started: number;
  setCookie: string | null;
};

export type ModeResult = {
  /** Summary prose with [n] markers (the message content). */
  summary: string;
  /** The structured block the UI renders (compare table, match cards). */
  artifact: Record<string, unknown> & { type: string };
  citedIndexes: number[];
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
};

/**
 * Streams a structured Ask answer: meta (citations, mode) at once, then, when
 * the model is done, the artifact, the summary as a delta, and done. Saves the
 * turn (interrupted if the reader stops it).
 */
export function streamMode(opts: {
  ctx: ModeCtx;
  mode: "compare" | "match" | "note" | "visual";
  citations: Citation[];
  hits: Hit[];
  extraMeta?: Record<string, unknown>;
  run: (signal: AbortSignal) => Promise<ModeResult>;
}): Response {
  const { ctx, mode, citations, hits } = opts;
  const encoder = new TextEncoder();
  let closed = false;
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(sseLine(obj)));
        } catch {
          closed = true;
        }
      };
      send({ type: "meta", citations, scope: ctx.scope ?? "all", conversationId: ctx.conversationId, mode, ...opts.extraMeta });

      let result: ModeResult | null = null;
      let errorMsg: string | null = null;
      try {
        result = await opts.run(ctx.req.signal);
      } catch (e) {
        if (!ctx.req.signal.aborted) {
          errorMsg =
            e instanceof BudgetExceededError
              ? "The assistant has reached today's usage limit. Please try again tomorrow."
              : "The assistant is temporarily unavailable.";
          if (!(e instanceof BudgetExceededError)) console.error(`[ask_v2] ${mode} failed:`, (e as Error).message);
        }
      }

      if (result) {
        send({ type: "artifact", artifact: result.artifact });
        send({ type: "delta", text: result.summary });
        send({ type: "done", refused: false });
      } else if (errorMsg) {
        send({ type: "error", message: errorMsg });
      }

      // Citations line up with hits; a chart's data source has no chunk behind it.
      const stored: StoredCitation[] = citations.map((c, i) => ({
        ...c,
        chunkId: hits[i]?.chunkId ?? null,
        documentId: hits[i]?.documentId ?? null,
        cited: !!result?.citedIndexes.includes(i + 1),
        quotes: [],
      }));
      try {
        const messageId = await addAssistantMessage({
          conversationId: ctx.conversationId,
          content: result?.summary ?? "",
          citations: stored,
          artifacts: result ? [result.artifact] : [],
          interrupted: !result && !errorMsg,
          refused: false,
          model: result?.model ?? null,
          inputTokens: result?.inputTokens ?? null,
          outputTokens: result?.outputTokens ?? null,
          costUsd: result?.costUsd ?? null,
          latencyMs: Date.now() - ctx.started,
        });
        // The note card needs it for "Download PDF".
        if (result) send({ type: "saved", messageId });
      } catch (e) {
        console.error(`[ask_v2] saving ${mode} failed:`, (e as Error).message);
      }
      if (!closed) {
        closed = true;
        try {
          controller.close();
        } catch {}
      }
    },
    cancel() {
      closed = true; // the model call is aborted through req.signal
    },
  });
  const res = new Response(stream, { headers: SSE_HEADERS });
  if (ctx.setCookie) res.headers.append("Set-Cookie", ctx.setCookie);
  return res;
}

/** A refusal in the same SSE shape as plain Ask. */
export async function refuseMode(ctx: ModeCtx, text: string, closest: { label: string; url: string } | null): Promise<Response> {
  await addAssistantMessage({
    conversationId: ctx.conversationId, content: text, citations: [], interrupted: false, refused: true,
    model: null, inputTokens: null, outputTokens: null, costUsd: null, latencyMs: Date.now() - ctx.started,
  });
  const body = [
    { type: "meta", citations: [], scope: ctx.scope ?? "all", conversationId: ctx.conversationId },
    { type: "delta", text },
    { type: "done", refused: true, closest },
  ].map(sseLine).join("");
  const res = new Response(body, { headers: SSE_HEADERS });
  if (ctx.setCookie) res.headers.append("Set-Cookie", ctx.setCookie);
  return res;
}
