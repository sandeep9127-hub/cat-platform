import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { poolDailyCapUsd } from "@/lib/ai/models";

/**
 * Soniox temporary keys for Ask voice. The real SONIOX_API_KEY never leaves
 * the server. Spend is reserved in cat.ai_usage (pool "voice") atomically,
 * with the daily cap in the same statement, before any key is minted.
 */

export const SESSION_SEC = 600;
/** Answers per voice session; each gets its own single-use speech key. */
export const ANSWERS_PER_SESSION = 40;
// Soniox list prices: real-time STT ≈ $0.12/h, TTS ≈ $0.70/h of speech.
export const SESSION_MAX_USD = (SESSION_SEC / 3600) * 0.12;
/** One spoken answer is capped at 2 minutes of audio by Soniox. */
export const ANSWER_MAX_USD = (120 / 3600) * 0.7;

const IST_DAY_START = sql`(date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata')`;

/**
 * Reserve `cost` in the voice pool only if today's total stays within the cap,
 * in one statement, so parallel requests can't all slip past the check.
 * Returns the reservation id, or null when the cap would be exceeded.
 */
export async function reserveVoice(task: "voice_session" | "voice_answer", cost: number): Promise<string | null> {
  const cap = poolDailyCapUsd("voice");
  return db.transaction(async (tx) => {
    // Serialise reservations; the INSERT below runs as a new statement after the
    // lock, so its snapshot includes every reservation committed before it.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('cat.voice_budget'))`);
    const r = (await tx.execute(sql`
      INSERT INTO "cat".ai_usage (task, pool, model, cost_usd, stop_reason)
      SELECT ${task}, 'voice', ${task === "voice_session" ? "soniox stt-rt-v6" : "soniox tts-rt-v2"}, ${cost}, 'reserved'
      WHERE (SELECT coalesce(sum(cost_usd), 0) FROM "cat".ai_usage
             WHERE pool = 'voice' AND created_at >= ${IST_DAY_START}) + ${cost} <= ${cap}
      RETURNING id`)) as unknown as { rows: { id: string }[] };
    return r.rows[0]?.id ?? null;
  });
}

/** Undo a reservation when minting the key failed. */
export async function releaseVoice(id: string): Promise<void> {
  await db.execute(sql`DELETE FROM "cat".ai_usage WHERE id = ${id}::uuid AND pool = 'voice' AND stop_reason = 'reserved'`);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Is this a voice session reserved within the last 10 minutes? */
export async function isLiveSession(sessionId: string): Promise<boolean> {
  if (!UUID_RE.test(sessionId)) return false;
  const r = (await db.execute(sql`
    SELECT 1 FROM "cat".ai_usage
    WHERE id = ${sessionId}::uuid AND task = 'voice_session' AND pool = 'voice'
      AND created_at > now() - make_interval(secs => ${SESSION_SEC})`)) as unknown as { rows: unknown[] };
  return r.rows.length > 0;
}

export async function mintKey(
  usage: "transcribe_websocket" | "tts_rt",
  opts: { expiresIn: number; maxSession: number },
): Promise<string> {
  const res = await fetch("https://api.soniox.com/v1/auth/temporary-api-key", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SONIOX_API_KEY}`,
      "Content-Type": "application/json",
      // Soniox sits behind Cloudflare, which refuses requests without a User-Agent.
      "User-Agent": "cat-hub/1.0",
    },
    body: JSON.stringify({
      usage_type: usage,
      expires_in_seconds: opts.expiresIn,
      single_use: true,
      max_session_duration_seconds: opts.maxSession,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Soniox temporary key failed (${res.status})`);
  const j = (await res.json()) as { api_key?: string };
  if (!j.api_key) throw new Error("Soniox returned no key");
  return j.api_key;
}

export function voiceEnabled(): boolean {
  return process.env.ASK_V2 === "on" && process.env.ASK_VOICE === "on" && !!process.env.SONIOX_API_KEY;
}

export function isJson(req: Request): boolean {
  return (req.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase() === "application/json";
}
