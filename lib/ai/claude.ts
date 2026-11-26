import Anthropic from "@anthropic-ai/sdk";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  MODELS,
  costUsd,
  poolDailyCapUsd,
  taskConfig,
  type AiTask,
  type BudgetPool,
  type ModelId,
  type UsageLike,
} from "@/lib/ai/models";

/**
 * The single Claude client for the Hub. Every model call goes through
 * claudeMessage() or claudeStream(), which:
 *   1. resolve the model / effort / token cap for the task (lib/ai/models.ts),
 *   2. refuse with BudgetExceededError once the task's daily pool is spent,
 *   3. log tokens, web searches and USD cost to cat.ai_usage.
 */

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    // Keys not scoped to a workspace must name one on every request.
    const workspace = process.env.ANTHROPIC_WORKSPACE_ID?.trim();
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      ...(workspace ? { defaultHeaders: { "anthropic-workspace-id": workspace } } : {}),
    });
  }
  return client;
}

export function claudeEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export class BudgetExceededError extends Error {
  constructor(public pool: BudgetPool, public capUsd: number) {
    super(`Daily ${pool} AI budget of $${capUsd} reached`);
    this.name = "BudgetExceededError";
  }
}

export type ChatTurn = { role: "user" | "assistant"; content: string };

type CallOpts = {
  system: string;
  messages: ChatTurn[];
  /** Server-side web search, restricted by allow- OR block-list (never both). */
  webSearch?: { allowedDomains?: string[]; blockedDomains?: string[] };
  /** JSON Schema for structured output. Not combinable with webSearch citations. */
  jsonSchema?: Record<string, unknown>;
  /** Links the usage row to an ingestion_runs row. */
  runId?: string | null;
  signal?: AbortSignal;
};

export type CallResult = {
  text: string;
  stopReason: string | null;
  inputTokens: number;
  outputTokens: number;
  webSearches: number;
  costUsd: number;
  model: string;
};

/* ─── Budget + usage log ─────────────────────────────── */

const IST_DAY_START = sql`(date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata')`;

export async function poolSpentTodayUsd(pool: BudgetPool): Promise<number> {
  const r = await db.execute(sql`
    SELECT coalesce(sum(cost_usd), 0)::float AS spent
    FROM "cat".ai_usage WHERE pool = ${pool} AND created_at >= ${IST_DAY_START}
  `);
  return Number((r as unknown as { rows: { spent: number }[] }).rows[0]?.spent ?? 0);
}

async function assertBudget(pool: BudgetPool): Promise<void> {
  const cap = poolDailyCapUsd(pool);
  if ((await poolSpentTodayUsd(pool)) >= cap) throw new BudgetExceededError(pool, cap);
}

async function logUsage(row: {
  task: AiTask;
  pool: BudgetPool;
  model: string;
  usage: UsageLike;
  cost: number;
  stopReason: string | null;
  error?: string | null;
  runId?: string | null;
}): Promise<void> {
  const u = row.usage;
  try {
    await db.execute(sql`
      INSERT INTO "cat".ai_usage
        (task, pool, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens,
         web_searches, cost_usd, stop_reason, error, run_id)
      VALUES (${row.task}, ${row.pool}, ${row.model}, ${u.input_tokens}, ${u.output_tokens},
              ${u.cache_read_input_tokens ?? 0}, ${u.cache_creation_input_tokens ?? 0},
              ${u.server_tool_use?.web_search_requests ?? 0}, ${row.cost},
              ${row.stopReason}, ${row.error ?? null}, ${row.runId ?? null})
    `);
  } catch (e) {
    // Telemetry must never break the user-facing call.
    console.error("[ai_usage] log failed:", (e as Error).message);
  }
}

function addUsage(a: UsageLike, b: UsageLike): UsageLike {
  return {
    input_tokens: a.input_tokens + b.input_tokens,
    output_tokens: a.output_tokens + b.output_tokens,
    cache_read_input_tokens: (a.cache_read_input_tokens ?? 0) + (b.cache_read_input_tokens ?? 0),
    cache_creation_input_tokens: (a.cache_creation_input_tokens ?? 0) + (b.cache_creation_input_tokens ?? 0),
    server_tool_use: {
      web_search_requests:
        (a.server_tool_use?.web_search_requests ?? 0) + (b.server_tool_use?.web_search_requests ?? 0),
    },
  };
}

const EMPTY_USAGE: UsageLike = { input_tokens: 0, output_tokens: 0 };

/* ─── Request building ───────────────────────────────── */

/** Haiku has no server-side refusal fallback; Sonnet/Opus opt in. */
function supportsFallback(model: ModelId): boolean {
  return model !== MODELS.haiku;
}

function webSearchTool(model: ModelId, maxUses: number, ws: NonNullable<CallOpts["webSearch"]>) {
  // Dynamic-filtering search is Sonnet/Opus only; Haiku keeps the basic variant.
  const type = model === MODELS.haiku ? "web_search_20250305" : "web_search_20260209";
  return {
    type,
    name: "web_search",
    max_uses: maxUses,
    ...(ws.allowedDomains?.length
      ? { allowed_domains: ws.allowedDomains }
      : ws.blockedDomains?.length
        ? { blocked_domains: ws.blockedDomains }
        : {}),
  } as Anthropic.Beta.BetaToolUnion;
}

function textOf(content: Anthropic.Beta.BetaContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

/* ─── Non-streaming call ─────────────────────────────── */

const MAX_CONTINUATIONS = 4;

export async function claudeMessage(task: AiTask, opts: CallOpts): Promise<CallResult> {
  const cfg = taskConfig(task);
  await assertBudget(cfg.pool);

  const tools =
    opts.webSearch && cfg.maxWebSearches > 0
      ? [webSearchTool(cfg.model, cfg.maxWebSearches, opts.webSearch)]
      : undefined;

  const messages: Anthropic.Beta.BetaMessageParam[] = opts.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let usage = EMPTY_USAGE;
  let text = "";
  let stopReason: string | null = null;
  let modelServed: string = cfg.model;

  try {
    // Web search runs a server-side loop that can pause; resume it by
    // re-sending the paused assistant turn (no extra user message).
    for (let i = 0; i <= MAX_CONTINUATIONS; i++) {
      const res = await getClient().beta.messages.create(
        {
          model: cfg.model,
          max_tokens: cfg.maxTokens,
          system: opts.system,
          messages,
          output_config: {
            effort: cfg.effort,
            ...(opts.jsonSchema ? { format: { type: "json_schema", schema: opts.jsonSchema } } : {}),
          },
          ...(tools ? { tools } : {}),
          ...(cfg.thinking === "off" ? { thinking: { type: "disabled" } } : {}),
          ...(supportsFallback(cfg.model)
            ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
            : {}),
        } as Anthropic.Beta.MessageCreateParamsNonStreaming,
        { signal: opts.signal },
      );
      usage = addUsage(usage, res.usage as UsageLike);
      text += textOf(res.content);
      stopReason = res.stop_reason;
      modelServed = res.model;
      if (res.stop_reason !== "pause_turn") break;
      messages.push({ role: "assistant", content: res.content as Anthropic.Beta.BetaContentBlockParam[] });
    }
  } catch (e) {
    const cost = costUsd(cfg.model, usage);
    await logUsage({ task, pool: cfg.pool, model: cfg.model, usage, cost, stopReason, error: (e as Error).message.slice(0, 500), runId: opts.runId });
    throw e;
  }

  const cost = costUsd(modelServed, usage);
  await logUsage({ task, pool: cfg.pool, model: modelServed, usage, cost, stopReason, runId: opts.runId });

  return {
    text,
    stopReason,
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    webSearches: usage.server_tool_use?.web_search_requests ?? 0,
    costUsd: cost,
    model: modelServed,
  };
}

/* ─── Streaming call (public Ask) ────────────────────── */

export type StreamEvent =
  | { type: "delta"; text: string }
  /** A native citation on the current text block (search_result sources only). */
  | { type: "citation"; searchResultIndex: number; citedText: string }
  /** End of a content block; cited claims end here, so callers place markers on it. */
  | { type: "block_end" }
  | { type: "done"; inputTokens: number; outputTokens: number; costUsd: number; stopReason: string | null; model: string };

/** A chat turn whose content may carry content blocks (e.g. search_result sources). */
export type StreamTurn = ChatTurn | { role: "user" | "assistant"; content: Anthropic.ContentBlockParam[] };

/**
 * Streams text deltas, then a final "done" event with usage and cost.
 * Budget is checked before the first byte, so callers can catch
 * BudgetExceededError and answer politely instead of opening the stream.
 */
export async function claudeStream(
  task: AiTask,
  opts: Omit<CallOpts, "webSearch" | "jsonSchema" | "messages"> & { messages: StreamTurn[] },
): Promise<AsyncGenerator<StreamEvent, void, unknown>> {
  const cfg = taskConfig(task);
  await assertBudget(cfg.pool);

  const stream = getClient().messages.stream(
    {
      model: cfg.model,
      max_tokens: cfg.maxTokens,
      system: opts.system,
      messages: opts.messages.map((m) => ({ role: m.role, content: m.content })),
      output_config: { effort: cfg.effort },
      ...(cfg.thinking === "off" ? { thinking: { type: "disabled" as const } } : {}),
    },
    { signal: opts.signal },
  );

  async function* run(): AsyncGenerator<StreamEvent, void, unknown> {
    // Track usage from stream events so a stream that is cancelled (reader
    // disconnects) or fails part-way is still logged and counts toward the
    // daily budget.
    let usage: UsageLike = { ...EMPTY_USAGE };
    let model: string = cfg.model;
    let stopReason: string | null = null;
    let error: string | null = null;
    let finished = false;
    try {
      for await (const event of stream) {
        if (event.type === "message_start") {
          usage = { ...(event.message.usage as UsageLike) };
          model = event.message.model;
        } else if (event.type === "message_delta") {
          usage = { ...usage, output_tokens: event.usage.output_tokens };
          stopReason = event.delta.stop_reason ?? stopReason;
        } else if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          yield { type: "delta", text: event.delta.text };
        } else if (
          event.type === "content_block_delta" &&
          event.delta.type === "citations_delta" &&
          event.delta.citation.type === "search_result_location"
        ) {
          yield {
            type: "citation",
            searchResultIndex: event.delta.citation.search_result_index,
            citedText: event.delta.citation.cited_text,
          };
        } else if (event.type === "content_block_stop") {
          yield { type: "block_end" };
        }
      }
      const final = await stream.finalMessage();
      usage = final.usage as UsageLike;
      model = final.model;
      stopReason = final.stop_reason;
      finished = true;
      const cost = costUsd(model, usage);
      yield { type: "done", inputTokens: usage.input_tokens, outputTokens: usage.output_tokens, costUsd: cost, stopReason, model };
    } catch (e) {
      error = (e as Error).message.slice(0, 500);
      throw e;
    } finally {
      if (!finished) stream.abort(); // stop generating (and billing) once nobody is reading
      await logUsage({
        task, pool: cfg.pool, model, usage, cost: costUsd(model, usage),
        stopReason: finished ? stopReason : stopReason ?? "cancelled",
        error, runId: opts.runId,
      });
    }
  }
  return run();
}

/* ─── Streaming tool loop (voice agent) ───────────────── */

/** One client tool: its definition and the function that runs it. */
export type LoopTool = {
  def: Anthropic.Tool;
  /** Returns tool_result content (text and/or search_result blocks). Throwing becomes an is_error result. */
  run: (input: Record<string, unknown>) => Promise<Anthropic.ToolResultBlockParam["content"]>;
};

export type LoopEvent = StreamEvent | { type: "tool"; name: string; input: Record<string, unknown> };

/**
 * Claude with tools, streamed (docs/voice-agent-plan.md, step 3). Each round
 * streams text and citations; when Claude asks for tools, they run (in
 * parallel), their results go back in one user turn, and the next round
 * streams. Stops after `maxToolRounds` rounds of tool calls: the last round
 * gets no tools, so it must answer. Every round checks the budget first and
 * is logged to cat.ai_usage like any other call. Citation indexes count
 * every search_result block in the request in order (initial turns first,
 * then each tool result as returned), so callers number sources the same way.
 */
export async function claudeToolStream(
  task: AiTask,
  opts: Omit<CallOpts, "webSearch" | "jsonSchema" | "messages"> & {
    messages: StreamTurn[];
    tools: LoopTool[];
    maxToolRounds?: number;
  },
): Promise<AsyncGenerator<LoopEvent, void, unknown>> {
  const cfg = taskConfig(task);
  await assertBudget(cfg.pool);
  const byName = new Map(opts.tools.map((t) => [t.def.name, t]));
  const maxRounds = opts.maxToolRounds ?? 3;

  async function* run(): AsyncGenerator<LoopEvent, void, unknown> {
    const messages: Anthropic.MessageParam[] = opts.messages.map((m) => ({ role: m.role, content: m.content }));
    let total: UsageLike = { ...EMPTY_USAGE };
    let cost = 0;
    let model: string = cfg.model;
    let stopReason: string | null = null;

    for (let round = 0; ; round++) {
      if (round > 0) await assertBudget(cfg.pool);
      const toolsThisRound = round < maxRounds ? opts.tools.map((t) => t.def) : [];
      // The tool list stays in every round's request (changing it would break caching and
      // confuse the model); the last round just says no more tools.
      const stream = getClient().messages.stream(
        {
          model: cfg.model,
          max_tokens: cfg.maxTokens,
          system: opts.system,
          messages,
          tools: opts.tools.map((t) => t.def),
          ...(toolsThisRound.length ? {} : { tool_choice: { type: "none" as const } }),
          output_config: { effort: cfg.effort },
          ...(cfg.thinking === "off" ? { thinking: { type: "disabled" as const } } : {}),
        },
        { signal: opts.signal },
      );
      let usage: UsageLike = { ...EMPTY_USAGE };
      let finished = false;
      let error: string | null = null;
      let final: Anthropic.Message | null = null;
      // A finished text block is held until we see what follows it: if a tool call comes next,
      // the text was narration ("I'll search for Mau…") and is dropped; otherwise it is released.
      let held: StreamEvent[] = [];
      let current: StreamEvent[] = [];
      try {
        for await (const event of stream) {
          if (event.type === "message_start") {
            usage = { ...(event.message.usage as UsageLike) };
            model = event.message.model;
          } else if (event.type === "message_delta") {
            usage = { ...usage, output_tokens: event.usage.output_tokens };
            for (const e of held.splice(0)) yield e;
          } else if (event.type === "content_block_start") {
            if (event.content_block.type === "tool_use") held = [];
            else for (const e of held.splice(0)) yield e;
          } else if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            current.push({ type: "delta", text: event.delta.text });
          } else if (
            event.type === "content_block_delta" &&
            event.delta.type === "citations_delta" &&
            event.delta.citation.type === "search_result_location"
          ) {
            current.push({ type: "citation", searchResultIndex: event.delta.citation.search_result_index, citedText: event.delta.citation.cited_text });
          } else if (event.type === "content_block_stop") {
            if (current.length) held.push(...current, { type: "block_end" });
            current = [];
          }
        }
        for (const e of held.splice(0)) yield e;
        final = await stream.finalMessage();
        usage = final.usage as UsageLike;
        model = final.model;
        stopReason = final.stop_reason;
        finished = true;
      } catch (e) {
        error = (e as Error).message.slice(0, 500);
        throw e;
      } finally {
        if (!finished) stream.abort();
        const c = costUsd(model, usage);
        cost += c;
        total = addUsage(total, usage);
        await logUsage({ task, pool: cfg.pool, model, usage, cost: c, stopReason: finished ? stopReason : "cancelled", error, runId: opts.runId });
      }

      if (!final || final.stop_reason !== "tool_use") break;
      const calls = final.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
      if (!calls.length) break;
      messages.push({ role: "assistant", content: final.content });
      // Run every call of this round in parallel; all results go back in one user turn, in call order.
      const results = await Promise.all(
        calls.map(async (call): Promise<Anthropic.ToolResultBlockParam> => {
          const tool = byName.get(call.name);
          const input = call.input && typeof call.input === "object" ? (call.input as Record<string, unknown>) : {};
          if (!tool) return { type: "tool_result", tool_use_id: call.id, content: `Unknown tool ${call.name}.`, is_error: true };
          try {
            return { type: "tool_result", tool_use_id: call.id, content: await tool.run(input) };
          } catch (e) {
            // Internal error details stay in the server log, never in what the model can repeat aloud.
            console.error(`[tool_loop] ${call.name} failed:`, (e as Error).message);
            return { type: "tool_result", tool_use_id: call.id, content: "The tool failed. Answer from what you have, or say you couldn't check.", is_error: true };
          }
        }),
      );
      for (const call of calls) yield { type: "tool", name: call.name, input: (call.input ?? {}) as Record<string, unknown> };
      messages.push({ role: "user", content: results });
    }
    yield { type: "done", inputTokens: total.input_tokens, outputTokens: total.output_tokens, costUsd: cost, stopReason, model };
  }
  return run();
}

/** Parse JSON from model text that may be wrapped in fences or prose. */
export function safeJsonParse<T>(raw: string): T | null {
  const stripped = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(stripped) as T;
  } catch {
    const m = stripped.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (!m) return null;
    try {
      return JSON.parse(m[1]) as T;
    } catch {
      return null;
    }
  }
}
