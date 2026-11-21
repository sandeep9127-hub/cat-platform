import Anthropic from "@anthropic-ai/sdk";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { embedQuery, EMBED_MODEL, rerank, RERANK_MODEL } from "@/lib/ai/embed";
import { taskConfig, type AiTask } from "@/lib/ai/models";

/**
 * Daily check that every external AI service the Hub depends on still answers,
 * so a retired model or a revoked key shows up before readers notice.
 * Costs nothing or next to nothing:
 *   - Claude: the free token-count endpoint for each model the tasks use
 *   - Voyage: one short embedding and one 2-document rerank
 *   - Soniox: speech-to-text model list, and the voice list for the text-to-speech model
 * Results go to cat.model_health.
 */

const TASKS: AiTask[] = [
  "ask_hub", "ask_landscape", "ask_v2", "ask_rewrite", "visualize",
  "factsheet", "discovery", "draft_writer", "chunk_context", "version_diff",
];
const SONIOX_STT = "stt-rt-v6";
const SONIOX_TTS = "tts-rt-v2";

export type HealthResult = { provider: string; model: string; ok: boolean; latency_ms: number; status_code: number | null; error: string | null };

async function timed(provider: string, model: string, fn: () => Promise<void>): Promise<HealthResult> {
  const t0 = Date.now();
  try {
    await fn();
    return { provider, model, ok: true, latency_ms: Date.now() - t0, status_code: 200, error: null };
  } catch (e) {
    const err = e as { status?: number; message?: string };
    return {
      provider, model, ok: false, latency_ms: Date.now() - t0,
      status_code: typeof err.status === "number" ? err.status : null,
      // Never store anything that could echo a key back.
      error: (err.message ?? String(e)).replace(/(sk-|pa-|Bearer\s+)[\w.-]+/g, "$1…").slice(0, 300),
    };
  }
}

export async function runHealthChecks(opts: { record?: boolean } = {}): Promise<HealthResult[]> {
  const results: HealthResult[] = [];

  const workspace = process.env.ANTHROPIC_WORKSPACE_ID?.trim();
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    ...(workspace ? { defaultHeaders: { "anthropic-workspace-id": workspace } } : {}),
  });
  const models = [...new Set(TASKS.map((t) => taskConfig(t).model))];
  for (const model of models) {
    results.push(await timed("anthropic", model, async () => {
      await anthropic.messages.countTokens({ model, messages: [{ role: "user", content: "health check" }] });
    }));
  }

  results.push(await timed("voyage", EMBED_MODEL, async () => {
    const v = await embedQuery("health check");
    if (!Array.isArray(v) || v.length === 0) throw new Error("empty embedding");
  }));
  results.push(await timed("voyage", RERANK_MODEL, async () => {
    const r = await rerank("millets", ["millet seed system", "solar cold storage"], 1);
    if (!r.length) throw new Error("empty rerank");
  }));

  if (process.env.SONIOX_API_KEY) {
    const soniox = async (path: string) => {
      const res = await fetch(`https://api.soniox.com${path}`, {
        // Soniox's edge rejects requests without a User-Agent.
        headers: { Authorization: `Bearer ${process.env.SONIOX_API_KEY}`, "User-Agent": "cat-hub-health/1.0" },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
      return res.text();
    };
    results.push(await timed("soniox", SONIOX_STT, async () => {
      const body = await soniox("/v1/models");
      if (!body.includes(`"${SONIOX_STT}"`)) throw new Error(`${SONIOX_STT} is no longer listed`);
    }));
    results.push(await timed("soniox", SONIOX_TTS, async () => {
      const body = JSON.parse(await soniox(`/v1/shared-voices?model=${SONIOX_TTS}&limit=1`)) as { voices?: unknown[] };
      if (!body.voices?.length) throw new Error(`no voices for ${SONIOX_TTS}`);
    }));
  }

  if (opts.record !== false) {
    for (const r of results) {
      await db.execute(sql`
        INSERT INTO "cat".model_health (provider, model, ok, latency_ms, status_code, error)
        VALUES (${r.provider}, ${r.model}, ${r.ok}, ${r.latency_ms}, ${r.status_code}, ${r.error})`);
    }
  }
  return results;
}
