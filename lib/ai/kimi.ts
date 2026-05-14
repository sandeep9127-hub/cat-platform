import "server-only";

/**
 * Kimi K2 (Moonshot AI) via NVIDIA NIM — OpenAI-compatible chat completions.
 * Free tier; primary LLM for the CAT Platform agent preview and draft writer.
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
 * Free tier through NVIDIA NIM — cost is effectively zero. We still record
 * token usage in agent_conversations / ingestion_runs for telemetry, but
 * billing cost is 0.
 */
export function kimiCostUsd(_input: number, _output: number): number {
  return 0;
}
