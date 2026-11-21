import { NextResponse, type NextRequest } from "next/server";
import { rateLimit, getClientIp } from "@/lib/security/ratelimit";
import {
  ANSWER_MAX_USD,
  ANSWERS_PER_SESSION,
  isJson,
  isLiveSession,
  mintKey,
  releaseVoice,
  reserveVoice,
  SESSION_SEC,
  voiceEnabled,
} from "@/lib/ask/voice-keys";

/**
 * POST /api/agent/voice/speech {session} → a single-use Soniox speech key for
 * one spoken answer: it opens one stream within 30 s, and Soniox caps a
 * stream at 2 minutes of audio. Only for a live voice session (started in the
 * last 10 minutes), at most 40 answers each, and each answer's worst-case cost
 * is reserved in the daily "voice" pool atomically before the key is minted.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!voiceEnabled()) return NextResponse.json({ error: "Voice is not available." }, { status: 404 });
  if (!isJson(req)) return NextResponse.json({ error: "Expected application/json" }, { status: 415 });

  let session = "";
  try {
    const body = (await req.json()) as { session?: unknown };
    session = typeof body.session === "string" ? body.session : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!(await isLiveSession(session))) return NextResponse.json({ error: "Voice session expired. Start voice again." }, { status: 403 });

  const perSession = await rateLimit({ key: "ask_voice_answer", ip: session, limit: ANSWERS_PER_SESSION, windowSec: SESSION_SEC });
  const perIp = await rateLimit({ key: "ask_voice_answer_ip", ip: getClientIp(req), limit: 30, windowSec: 60 });
  if (!perSession.ok || !perIp.ok) return NextResponse.json({ error: "Too many spoken answers. Please wait a moment." }, { status: 429 });

  const reservation = await reserveVoice("voice_answer", ANSWER_MAX_USD);
  if (!reservation) {
    return NextResponse.json({ error: "Voice has reached today's limit. The answer is shown as text." }, { status: 429 });
  }
  try {
    const tts = await mintKey("tts_rt", { expiresIn: 30, maxSession: 150 });
    return NextResponse.json({ tts }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    await releaseVoice(reservation).catch(() => {});
    console.error("[ask_voice] speech key failed:", (e as Error).message);
    return NextResponse.json({ error: "Speech is temporarily unavailable. The answer is shown as text." }, { status: 502 });
  }
}
