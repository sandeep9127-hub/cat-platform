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
  | { type: "done"; inputTokens: number; outputTokens: number; costUsd: number; stopReason: string | null };

/**
 * Streams text deltas, then a final "done" event with usage and cost.
 * Budget is checked before the first byte, so callers can catch
 * BudgetExceededError and answer politely instead of opening the stream.
 */
export async function claudeStream(
  task: AiTask,
  opts: Omit<CallOpts, "webSearch" | "jsonSchema">,
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
    },
    { signal: opts.signal },
  );

  async function* run(): AsyncGenerator<StreamEvent, void, unknown> {
    try {
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          yield { type: "delta", text: event.delta.text };
        }
      }
      const final = await stream.finalMessage();
      const usage = final.usage as UsageLike;
      const cost = costUsd(final.model, usage);
      await logUsage({ task, pool: cfg.pool, model: final.model, usage, cost, stopReason: final.stop_reason, runId: opts.runId });
      yield { type: "done", inputTokens: usage.input_tokens, outputTokens: usage.output_tokens, costUsd: cost, stopReason: final.stop_reason };
    } catch (e) {
      await logUsage({ task, pool: cfg.pool, model: cfg.model, usage: EMPTY_USAGE, cost: 0, stopReason: null, error: (e as Error).message.slice(0, 500), runId: opts.runId });
      throw e;
    }
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
