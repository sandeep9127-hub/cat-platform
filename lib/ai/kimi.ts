import "server-only";

/**
 * Kimi K2 (Moonshot AI) via NVIDIA's hosted API — OpenAI-compatible chat completions.
 * Free tier; primary LLM for the Transformation Hub agent preview and draft writer.
 *
 * Auth: NVIDIA_API_KEY (nvapi-...) from https://build.nvidia.com.
 */

const NVIDIA_BASE = "https://integrate.api.nvidia.com/v1";
export const KIMI_MODEL = "moonshotai/kimi-k2.6";

export function kimiEnabled(): boolean {
  return !!process.env.NVIDIA_API_KEY;
}

type Role = "system" | "user" | "assistant";
export type ChatMessage = { role: Role; content: string };

type KimiResponse = {
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
};

export type ChatOptions = {
  temperature?: number;
  maxTokens?: number;
  /** When true, sets response_format json_object so the model returns parseable JSON. */
  jsonMode?: boolean;
  signal?: AbortSignal;
};

/**
 * Low-level chat completion. Throws on transport/API errors so callers can
 * surface them or fall back. Token usage is returned alongside the text.
 */
export async function kimiChat(
  messages: ChatMessage[],
  opts: ChatOptions = {}
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) throw new Error("NVIDIA_API_KEY missing");

  const body: Record<string, unknown> = {
    model: KIMI_MODEL,
    messages,
    temperature: opts.temperature ?? 0.3,
    max_tokens: opts.maxTokens ?? 1024,
  };
  if (opts.jsonMode) body.response_format = { type: "json_object" };

  const res = await fetch(`${NVIDIA_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: opts.signal,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Kimi error ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = (await res.json()) as KimiResponse;
  const text = data.choices?.[0]?.message?.content?.trim() ?? "";
  return {
    text,
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.completion_tokens ?? 0,
  };
}

/**
 * Streaming chat completion. Yields token deltas as they arrive from
 * NVIDIA's hosted Kimi endpoint, then a final "done" event with usage
 * totals. The route handler can `for await` over this and forward each
 * delta to the browser as a Server-Sent Event.
 *
 * This is the high-leverage perf improvement: same total inference time
 * as kimiChat, but the user sees the first token in ~600ms instead of
 * waiting 3–8 seconds for the whole completion.
 */
export type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "done"; inputTokens: number; outputTokens: number };

export async function* kimiChatStream(
  messages: ChatMessage[],
  opts: ChatOptions = {}
): AsyncGenerator<StreamEvent, void, unknown> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) throw new Error("NVIDIA_API_KEY missing");

  const body: Record<string, unknown> = {
    model: KIMI_MODEL,
    messages,
    temperature: opts.temperature ?? 0.3,
    max_tokens: opts.maxTokens ?? 1024,
    stream: true,
    // NVIDIA's OpenAI-compatible endpoint supports stream_options.include_usage
    // so we get the final token counts in the last chunk.
    stream_options: { include_usage: true },
  };
  if (opts.jsonMode) body.response_format = { type: "json_object" };

  const res = await fetch(`${NVIDIA_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
      accept: "text/event-stream",
    },
    body: JSON.stringify(body),
    signal: opts.signal,
  });

  if (!res.ok || !res.body) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Kimi error ${res.status}: ${txt.slice(0, 300)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let inputTokens = 0;
  let outputTokens = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // SSE protocol: each event is a sequence of `data: ...` lines terminated
    // by a blank line. We split on \n and keep the trailing incomplete line.
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trimStart();
      if (payload === "[DONE]") continue;
      try {
        const obj = JSON.parse(payload) as {
          choices?: { delta?: { content?: string } }[];
          usage?: { prompt_tokens?: number; completion_tokens?: number };
        };
        const delta = obj.choices?.[0]?.delta?.content;
        if (delta) yield { type: "delta", text: delta };
        if (obj.usage) {
          inputTokens = obj.usage.prompt_tokens ?? inputTokens;
          outputTokens = obj.usage.completion_tokens ?? outputTokens;
        }
      } catch {
        // Malformed SSE line — skip and continue
      }
    }
  }

  yield { type: "done", inputTokens, outputTokens };
}

/** Parse JSON safely from a model that occasionally wraps in fences. */
export function safeJsonParse<T>(raw: string): T | null {
  const stripped = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(stripped) as T;
  } catch {
    // Try to find the first {...} or [...] block
    const m = stripped.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (!m) return null;
    try {
      return JSON.parse(m[1]) as T;
    } catch {
      return null;
    }
  }
}

/**
 * Free tier through NVIDIA's hosted API — cost is effectively zero. We still record
 * token usage in agent_conversations / ingestion_runs for telemetry, but
 * billing cost is 0.
 */
export function kimiCostUsd(_input: number, _output: number): number {
  return 0;
}
