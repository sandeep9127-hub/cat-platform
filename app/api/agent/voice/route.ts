import { NextResponse, type NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { poolSpentTodayUsd } from "@/lib/ai/claude";
import { poolDailyCapUsd } from "@/lib/ai/models";
import { rateLimit, getClientIp } from "@/lib/security/ratelimit";

/**
 * POST /api/agent/voice → short-lived Soniox keys for one voice session
 * (docs/hub-v2-design.md §6.1). The real SONIOX_API_KEY never leaves the server.
 *
 * The listening key opens one stream within 60 s. The speaking key opens one
 * stream per answer, so it lives for the session (10 min) instead of single use.
 * Every stream is cut at 10 minutes.
 * The session's worst-case cost (10 min of listening + speaking) is charged to
 * the daily "voice" pool up front, so the cap can't be overrun.
 * Off unless ASK_V2=on and ASK_VOICE=on.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_SEC = 600;
// Soniox list prices: real-time STT ≈ $0.12/h, TTS ≈ $0.70/h of speech.
const SESSION_MAX_USD = (SESSION_SEC / 3600) * (0.12 + 0.7);

async function tempKey(
  usage: "transcribe_websocket" | "tts_rt",
  opts: { expiresIn: number; singleUse: boolean },
): Promise<{ api_key: string; expires_at: string }> {
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
      single_use: opts.singleUse,
      max_session_duration_seconds: SESSION_SEC,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Soniox temporary key failed (${res.status})`);
  const j = (await res.json()) as { api_key?: string; expires_at?: string };
  if (!j.api_key) throw new Error("Soniox returned no key");
  return { api_key: j.api_key, expires_at: j.expires_at ?? "" };
}

export async function POST(req: NextRequest) {
  if (process.env.ASK_V2 !== "on" || process.env.ASK_VOICE !== "on" || !process.env.SONIOX_API_KEY) {
    return NextResponse.json({ error: "Voice is not available." }, { status: 404 });
  }
  // JSON only: a cross-site form can't send it without a CORS preflight.
  if ((req.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase() !== "application/json") {
    return NextResponse.json({ error: "Expected application/json" }, { status: 415 });
  }
  const limited = await rateLimit({ key: "ask_voice", ip: getClientIp(req), limit: 4, windowSec: 60 });
  if (!limited.ok) return NextResponse.json({ error: "Too many voice sessions. Please wait a minute." }, { status: 429 });

  const cap = poolDailyCapUsd("voice");
  if ((await poolSpentTodayUsd("voice")) + SESSION_MAX_USD > cap) {
    return NextResponse.json({ error: "Voice has reached today's limit. You can still type your question." }, { status: 429 });
  }

  try {
    const [stt, tts] = await Promise.all([
      tempKey("transcribe_websocket", { expiresIn: 60, singleUse: true }),
      tempKey("tts_rt", { expiresIn: SESSION_SEC, singleUse: false }),
    ]);
    await db.execute(sql`
      INSERT INTO "cat".ai_usage (task, pool, model, cost_usd, stop_reason)
      VALUES ('voice_session', 'voice', 'soniox stt-rt-v6 + tts-rt-v2', ${SESSION_MAX_USD}, 'reserved')`);
    return NextResponse.json(
      { stt: stt.api_key, tts: tts.api_key, maxSeconds: SESSION_SEC },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("[ask_voice] key failed:", (e as Error).message);
    return NextResponse.json({ error: "Voice is temporarily unavailable. You can still type your question." }, { status: 502 });
  }
}
