import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { forgetJudgeExamples, TEACH_CALL } from "@/lib/ask/judge-examples";

/**
 * Admin view of the voice agent decision log (cat.voice_turns). Editors mark
 * wrong calls; marked turns become eval cases (docs/voice-agent-plan.md,
 * step 7, the weekly training loop). Side-talk turns have no words stored, so
 * they show as "(not kept)".
 */

export const VOICE_DECISIONS = [
  "answered",
  "refused",
  "ignored_side_talk",
  "asked_was_that_for_me",
  "command_repeat",
  "command_end",
  "command_shorter",
  "command_show_sources",
  "small_talk",
  "identity",
  "error",
] as const;
export type VoiceDecisionName = (typeof VOICE_DECISIONS)[number];

export const DECISION_LABEL: Record<VoiceDecisionName, string> = {
  answered: "Answered",
  refused: "Not in library",
  ignored_side_talk: "Ignored (side talk)",
  asked_was_that_for_me: "Asked “was that for me?”",
  command_repeat: "Repeat",
  command_end: "Ended call",
  command_shorter: "Shorter",
  command_show_sources: "Show sources",
  small_talk: "Small talk",
  identity: "Who are you",
  error: "Error",
};

/** What the editor says the agent should have done. */
export const SHOULD_HAVE = ["answered", "stayed_quiet", "asked_first", "ended", "searched_again", "other"] as const;
export type ShouldHave = (typeof SHOULD_HAVE)[number];
export const SHOULD_HAVE_LABEL: Record<ShouldHave, string> = {
  answered: "Should have answered",
  stayed_quiet: "Should have stayed quiet",
  asked_first: "Should have asked first",
  ended: "Should have ended the call",
  searched_again: "Should have searched again",
  other: "Other",
};

export type VoiceTurnRow = {
  id: string;
  created_at: string;
  conversation_id: string | null;
  transcript: string | null;
  speaker: "main" | "other";
  confidence: number | null;
  after_question: boolean;
  lang: string;
  decision: VoiceDecisionName;
  reason: string | null;
  tools: string[];
  latency_ms: number | null;
  cost_usd: string | null;
  marked_wrong: boolean | null;
  marked_note: string | null;
  /** An editor ticked "Teach the agent": this turn is a worked example for the turn judge. */
  teach: boolean;
};

export type TurnFilter = "all" | "unreviewed" | "wrong" | "side_talk" | "answered";
const FILTERS: TurnFilter[] = ["all", "unreviewed", "wrong", "side_talk", "answered"];
export const isFilter = (v: unknown): v is TurnFilter => typeof v === "string" && (FILTERS as string[]).includes(v);

const rows = <T,>(r: unknown) => (r as { rows: T[] }).rows;
const PAGE = 50;

export async function listVoiceTurns(o: { filter: TurnFilter; days: number; page: number }) {
  const days = Math.min(90, Math.max(1, Math.floor(o.days)));
  const page = Math.max(0, Math.floor(o.page));
  const where = sql`created_at >= now() - make_interval(days => ${days})
    ${o.filter === "unreviewed" ? sql`AND marked_wrong IS NULL` : sql``}
    ${o.filter === "wrong" ? sql`AND marked_wrong = true` : sql``}
    ${o.filter === "side_talk" ? sql`AND decision IN ('ignored_side_talk','asked_was_that_for_me')` : sql``}
    ${o.filter === "answered" ? sql`AND decision = 'answered'` : sql``}`;
  const list = rows<VoiceTurnRow>(
    await db.execute(sql`
      SELECT id, created_at, conversation_id, transcript, speaker, confidence, after_question, lang, decision,
             reason, tools, latency_ms, cost_usd, marked_wrong, marked_note, teach
      FROM "cat".voice_turns WHERE ${where}
      ORDER BY created_at DESC LIMIT ${PAGE + 1} OFFSET ${page * PAGE}`),
  );
  return { turns: list.slice(0, PAGE), hasMore: list.length > PAGE, page, days };
}

export type VoiceStats = {
  total: number;
  answered: number;
  sideTalk: number;
  reviewed: number;
  wrong: number;
  p50: number | null;
  p90: number | null;
  costUsd: number;
  byDecision: { decision: VoiceDecisionName; n: number }[];
};

export async function voiceTurnStats(days: number): Promise<VoiceStats> {
  const d = Math.min(90, Math.max(1, Math.floor(days)));
  const [s] = rows<{
    total: number; answered: number; side_talk: number; reviewed: number; wrong: number;
    p50: number | null; p90: number | null; cost: number | null;
  }>(
    await db.execute(sql`
      SELECT count(*)::int AS total,
             count(*) FILTER (WHERE decision = 'answered')::int AS answered,
             count(*) FILTER (WHERE decision IN ('ignored_side_talk','asked_was_that_for_me'))::int AS side_talk,
             count(*) FILTER (WHERE marked_wrong IS NOT NULL)::int AS reviewed,
             count(*) FILTER (WHERE marked_wrong = true)::int AS wrong,
             percentile_disc(0.5) WITHIN GROUP (ORDER BY latency_ms) FILTER (WHERE decision = 'answered') AS p50,
             percentile_disc(0.9) WITHIN GROUP (ORDER BY latency_ms) FILTER (WHERE decision = 'answered') AS p90,
             coalesce(sum(cost_usd), 0)::float AS cost
      FROM "cat".voice_turns WHERE created_at >= now() - make_interval(days => ${d})`),
  );
  const by = rows<{ decision: VoiceDecisionName; n: number }>(
    await db.execute(sql`
      SELECT decision, count(*)::int AS n FROM "cat".voice_turns
      WHERE created_at >= now() - make_interval(days => ${d}) GROUP BY decision ORDER BY n DESC`),
  );
  return {
    total: s?.total ?? 0,
    answered: s?.answered ?? 0,
    sideTalk: s?.side_talk ?? 0,
    reviewed: s?.reviewed ?? 0,
    wrong: s?.wrong ?? 0,
    p50: s?.p50 ?? null,
    p90: s?.p90 ?? null,
    costUsd: s?.cost ?? 0,
    byDecision: by,
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Mark a turn right (false), wrong (true, with what it should have done), or clear the mark (null).
 * `teach` makes a wrong turn a worked example for the turn judge (lib/ask/judge-examples.ts); it
 * only takes when the turn kept its words and the correct call is a known one.
 */
export async function markVoiceTurn(o: {
  id: string;
  wrong: boolean | null;
  shouldHave?: ShouldHave | null;
  note?: string | null;
  teach?: boolean;
}): Promise<boolean> {
  if (!UUID_RE.test(o.id)) return false;
  const wrong = o.wrong === true;
  const note = wrong
    ? [o.shouldHave ? SHOULD_HAVE_LABEL[o.shouldHave] : null, o.note?.trim() || null].filter(Boolean).join(": ").slice(0, 500) || null
    : null;
  const shouldHave = wrong ? (o.shouldHave ?? null) : null;
  const teach = wrong && !!o.teach && !!shouldHave && TEACH_CALL[shouldHave] != null;
  const r = await db.execute(sql`
    UPDATE "cat".voice_turns
    SET marked_wrong = ${o.wrong}, marked_note = ${note}, should_have = ${shouldHave},
        teach = ${teach} AND transcript IS NOT NULL
    WHERE id = ${o.id}::uuid`);
  const ok = ((r as unknown as { rowCount?: number }).rowCount ?? 0) > 0;
  if (ok) forgetJudgeExamples();
  return ok;
}

/** Marked-wrong turns that still have their words, as eval cases (scripts/voice-agent-eval.ts shape). */
export async function wrongTurnsAsEvalCases(days: number) {
  const d = Math.min(90, Math.max(1, Math.floor(days)));
  const list = rows<VoiceTurnRow>(
    await db.execute(sql`
      SELECT id, created_at, transcript, speaker, confidence, after_question, lang, decision, marked_note
      FROM "cat".voice_turns
      WHERE marked_wrong = true AND transcript IS NOT NULL AND created_at >= now() - make_interval(days => ${d})
      ORDER BY created_at DESC LIMIT 200`),
  );
  return list.map((t) => ({
    name: `marked ${t.created_at.slice(0, 10)}: ${(t.transcript ?? "").slice(0, 50)}`,
    turn: { text: t.transcript, lang: t.lang, speaker: t.speaker, afterQuestion: t.after_question, confidence: t.confidence },
    was: t.decision,
    shouldHave: t.marked_note,
  }));
}
