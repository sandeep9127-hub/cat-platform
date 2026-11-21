/**
 * Task → model routing for every Claude call in the Hub.
 *
 * One place decides which model each job runs on, how hard it thinks (effort),
 * how long it may answer, and which daily budget pool it draws from. Public,
 * high-volume reads run on Haiku; research and writing that touches the web or
 * produces publishable records run on Sonnet. Nothing defaults to Opus.
 *
 * Any task's model can be overridden without a code change by setting
 * AI_MODEL_<TASK> (e.g. AI_MODEL_FACTSHEET=claude-opus-5-5) in Vercel.
 *
 * Embeddings are NOT routed here: Anthropic has no embeddings API, so retrieval
 * uses Voyage (lib/ai/embed.ts).
 */

export const MODELS = {
  haiku: "claude-haiku-5-5",
  sonnet: "claude-sonnet-5-5",
  opus: "claude-opus-5-5",
} as const;

export type ModelId = (typeof MODELS)[keyof typeof MODELS] | (string & {});
export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

/**
 * Budget pools. `public` is anything an anonymous reader can trigger (Ask,
 * landscape Ask, chart helper). `ingestion` is editor/cron work that searches
 * the web or drafts records (fact sheets, discovery, draft writer).
 */
export type BudgetPool = "public" | "ingestion";

export type AiTask =
  | "ask_hub"
  | "ask_landscape"
  | "ask_v2"
  | "ask_rewrite"
  | "ask_followups"
  | "compare"
  | "matchmaker"
  | "visualize"
  | "factsheet"
  | "discovery"
  | "draft_writer"
  | "chunk_context"
  | "version_diff";

export type TaskConfig = {
  model: ModelId;
  effort: Effort;
  /** Includes thinking tokens, so leave headroom above the visible answer length. */
  maxTokens: number;
  pool: BudgetPool;
  /** Max web searches per call (server tool, billed at $10 / 1,000). 0 = no web. */
  maxWebSearches: number;
  /**
   * "off" sends thinking: disabled (Haiku 5.5 accepts it at effort high or
   * below). For grounded look-ups where time to first word matters more than
   * planning. Omitted = the model's default (adaptive).
   */
  thinking?: "off";
};

const DEFAULTS: Record<AiTask, TaskConfig> = {
  // Public reads: cheap, fast, grounded strictly in retrieved passages.
  ask_hub: { model: MODELS.haiku, effort: "low", maxTokens: 4000, pool: "public", maxWebSearches: 0 },
  ask_landscape: { model: MODELS.haiku, effort: "low", maxTokens: 3000, pool: "public", maxWebSearches: 0 },
  // Ask v2 answers over hybrid search with native citations. Thinking off:
  // the answer is a grounded read-out of the cited passages, and adaptive
  // thinking added ~4 s before the first word in testing (21 Nov 2026).
  ask_v2: { model: MODELS.haiku, effort: "low", maxTokens: 3000, pool: "public", maxWebSearches: 0, thinking: "off" },
  // Ask v2: turns a follow-up ("and in Vempalli?") into a standalone search query
  // and picks the mode (plain answer, compare, matchmaker). One call per question.
  ask_rewrite: { model: MODELS.haiku, effort: "low", maxTokens: 400, pool: "public", maxWebSearches: 0, thinking: "off" },
  // Ask v2: three "Ask next" questions after each answer, steered to sections the library holds.
  ask_followups: { model: MODELS.haiku, effort: "low", maxTokens: 400, pool: "public", maxWebSearches: 0, thinking: "off" },
  // Compare landscapes and the solution matchmaker: judgement across several
  // sources into a structured, cited table or ranked cards. Sonnet, per the v2
  // design (a Haiku executor with a Sonnet advisor is to be proven on the test set first).
  compare: { model: MODELS.sonnet, effort: "low", maxTokens: 8000, pool: "public", maxWebSearches: 0 },
  matchmaker: { model: MODELS.sonnet, effort: "low", maxTokens: 8000, pool: "public", maxWebSearches: 0 },
  visualize: { model: MODELS.haiku, effort: "low", maxTokens: 2000, pool: "public", maxWebSearches: 0 },

  // Research + writing that becomes published content.
  factsheet: { model: MODELS.sonnet, effort: "medium", maxTokens: 16000, pool: "ingestion", maxWebSearches: 8 },
  discovery: { model: MODELS.sonnet, effort: "medium", maxTokens: 16000, pool: "ingestion", maxWebSearches: 8 },
  draft_writer: { model: MODELS.sonnet, effort: "medium", maxTokens: 16000, pool: "ingestion", maxWebSearches: 0 },

  // Document ingestion.
  // One call per section: a 1–2 line "where this sits" context for each chunk
  // (contextual retrieval). Bulk and mechanical, so Haiku at low effort.
  chunk_context: { model: MODELS.haiku, effort: "low", maxTokens: 4000, pool: "ingestion", maxWebSearches: 0 },
  // "What changed" between two versions of a document, from the changed
  // passages only. Judgement matters (which changes are material), so Sonnet.
  version_diff: { model: MODELS.sonnet, effort: "medium", maxTokens: 16000, pool: "ingestion", maxWebSearches: 0 },
};

export function taskConfig(task: AiTask): TaskConfig {
  const override = process.env[`AI_MODEL_${task.toUpperCase()}`]?.trim();
  const base = DEFAULTS[task];
  return override ? { ...base, model: override } : base;
}

/** Daily USD ceiling per pool, reset at midnight IST. */
export function poolDailyCapUsd(pool: BudgetPool): number {
  const raw =
    pool === "public" ? process.env.AGENT_DAILY_USD_CEILING : process.env.INGESTION_DAILY_USD_CEILING;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : pool === "public" ? 15 : 25;
}

/** Per-run USD ceiling for multi-call ingestion runs (discovery, batch fact-sheet scripts). */
export function runCapUsd(): number {
  const n = Number(process.env.INGESTION_RUN_USD_CEILING);
  return Number.isFinite(n) && n > 0 ? n : 25;
}

/* ─── Pricing (USD per million tokens, Anthropic first-party list rates) ─── */

type Price = { input: number; output: number; cacheRead: number };

const PRICES: Record<string, Price> = {
  [MODELS.haiku]: { input: 0.1, output: 0.5, cacheRead: 0.01 },
  [MODELS.sonnet]: { input: 2, output: 10, cacheRead: 0.2 },
  [MODELS.opus]: { input: 4, output: 20, cacheRead: 0.2 },
};
// Haiku 5.5 is priced higher once a prompt exceeds 100K tokens.
const HAIKU_LONG: Price = { input: 0.5, output: 2.5, cacheRead: 0.05 };
const WEB_SEARCH_USD = 10 / 1000;

export type UsageLike = {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  server_tool_use?: { web_search_requests?: number | null } | null;
};

export function costUsd(model: ModelId, u: UsageLike): number {
  const cacheRead = u.cache_read_input_tokens ?? 0;
  const cacheWrite = u.cache_creation_input_tokens ?? 0;
  const promptTokens = u.input_tokens + cacheRead + cacheWrite;
  // Unknown (overridden) models are priced at Opus rates so caps stay conservative.
  let p = PRICES[model] ?? PRICES[MODELS.opus];
  if (model === MODELS.haiku && promptTokens > 100_000) p = HAIKU_LONG;
  const searches = u.server_tool_use?.web_search_requests ?? 0;
  return (
    (u.input_tokens * p.input +
      cacheWrite * p.input * 1.25 +
      cacheRead * p.cacheRead +
      u.output_tokens * p.output) /
      1_000_000 +
    searches * WEB_SEARCH_USD
  );
}
