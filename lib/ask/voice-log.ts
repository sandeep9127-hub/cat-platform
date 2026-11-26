import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * Voice agent decision log (cat.voice_turns, docs/voice-agent-plan.md step 7).
 * One row per spoken turn the server saw. Never stores audio, and never the
 * words of a turn that may not have been meant for the Hub: anything judged
 * as side talk (ignored, or "was that for me?") and anything a second speaker
 * said. Logging must never break a turn.
 */

export type VoiceDecision =
  | "answered"
  | "refused"
  | "ignored_side_talk"
  | "asked_was_that_for_me"
  | "command_repeat"
  | "command_end"
  | "command_shorter"
  | "command_show_sources"
  | "small_talk"
  | "identity"
  | "error";

export type VoiceTurnRow = {
  conversationId: string | null;
  transcript: string;
  speaker: "main" | "other";
  confidence: number | null;
  afterQuestion: boolean;
  lang: string;
  decision: VoiceDecision;
  reason?: string | null;
  tools?: string[];
  latencyMs?: number | null;
  costUsd?: number | null;
};

/**
 * A turn that may not have been meant for the Hub: a second speaker, or words
 * recognised with low confidence. The one rule for both privacy controls: such
 * turns aren't searched before the turn judge has looked at them, and their
 * words are never logged.
 */
export function likelyBystander(t: { speaker?: "main" | "other" | null; confidence?: number | null }): boolean {
  return t.speaker === "other" || (t.confidence ?? 1) < 0.6;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function logVoiceTurn(row: VoiceTurnRow): Promise<void> {
  try {
    const bystander = row.decision === "ignored_side_talk" || row.decision === "asked_was_that_for_me" || likelyBystander(row);
    const transcript = bystander ? null : row.transcript.slice(0, 500);
    const tools = (row.tools ?? []).filter((t) => /^[a-z_]{1,40}$/.test(t)).slice(0, 10);
    await db.execute(sql`
      INSERT INTO "cat".voice_turns
        (conversation_id, transcript, speaker, confidence, after_question, lang, decision, reason, tools, latency_ms, cost_usd)
      VALUES (
        ${row.conversationId && UUID_RE.test(row.conversationId) ? row.conversationId : null}::uuid,
        ${transcript}, ${row.speaker}, ${row.confidence}, ${row.afterQuestion}, ${row.lang.slice(0, 8)},
        ${row.decision}, ${row.reason ? row.reason.slice(0, 200) : null},
        ${`{${tools.join(",")}}`}::text[],
        ${row.latencyMs ?? null}, ${row.costUsd ?? null}
      )`);
  } catch (e) {
    console.error("[voice_turns] log failed:", (e as Error).message);
  }
}
