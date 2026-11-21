import { NextResponse, type NextRequest } from "next/server";
import { rateLimit, getClientIp } from "@/lib/security/ratelimit";
import { isJson, mintKey, releaseVoice, reserveVoice, SESSION_MAX_USD, SESSION_SEC, voiceEnabled } from "@/lib/ask/voice-keys";
import { sttContext, voicePlaceNames } from "@/lib/ask/voice-context";

/**
 * POST /api/agent/voice → start a voice session (docs/hub-v2-design.md §6.1).
 * Returns a single-use Soniox listening key (opens one stream within 60 s,
 * cut at 10 minutes) and a session id. Each spoken answer then gets its own
 * single-use speech key from /api/agent/voice/speech, tied to this session.
 * The real SONIOX_API_KEY never leaves the server. The session's listening
 * cost is reserved in the daily "voice" pool atomically, before any key is
 * minted. Off unless ASK_V2=on and ASK_VOICE=on.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!voiceEnabled()) return NextResponse.json({ error: "Voice is not available." }, { status: 404 });
  // JSON only: a cross-site form can't send it without a CORS preflight.
  if (!isJson(req)) return NextResponse.json({ error: "Expected application/json" }, { status: 415 });
  const limited = await rateLimit({ key: "ask_voice", ip: getClientIp(req), limit: 4, windowSec: 60 });
  if (!limited.ok) return NextResponse.json({ error: "Too many voice sessions. Please wait a minute." }, { status: 429 });

  const session = await reserveVoice("voice_session", SESSION_MAX_USD);
  if (!session) {
    return NextResponse.json({ error: "Voice has reached today's limit. You can still type your question." }, { status: 429 });
  }
  try {
    const stt = await mintKey("transcribe_websocket", { expiresIn: 60, maxSession: SESSION_SEC });
    // The browser passes `context` to speech-to-text (landscape names, places,
    // scheme names) and snaps near-miss spellings to `places`.
    return NextResponse.json(
      { stt, session, maxSeconds: SESSION_SEC, context: sttContext(), places: voicePlaceNames() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    await releaseVoice(session).catch(() => {});
    console.error("[ask_voice] session key failed:", (e as Error).message);
    return NextResponse.json({ error: "Voice is temporarily unavailable. You can still type your question." }, { status: 502 });
  }
}
