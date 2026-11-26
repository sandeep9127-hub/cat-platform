/**
 * Voice turn engine (docs/voice-agent-plan.md, step 2a). Pure: events in,
 * actions out, no audio, no network, no timers. `useVoice` feeds it Soniox
 * tokens, endpoints, the Hub's speaking state and a clock tick, and carries
 * out what it returns. `scripts/voice-replay.ts` replays recorded token
 * streams through the same function, so every rule here can be tested
 * without a microphone.
 *
 * Rules:
 *  1. Main speaker: decided by majority over the turn's words (speaker labels
 *     flicker in real time). Another voice never interrupts the Hub; its turns
 *     are submitted marked "other" for the turn judge, never dropped.
 *  2. Fillers ("hmm", "haan") never interrupt.
 *  3. Stop words ("wait", "ruko") stop the Hub at once.
 *  4. Other speech from the main speaker ducks the Hub; after BARGE_WORDS
 *     words or BARGE_MS of speech it stops. No real words for RESUME_MS: the
 *     volume comes back. In the Hub's first EARLY_MS any real word stops it.
 *  5. A turn ending in a connector ("and", "aur") waits UNFINISHED_MS more.
 *  6. One stray word while idle is ignored, unless it's a stop word, a short
 *     answer (yes, no, hello) or an answer to the Hub's own question.
 */

import { LANG_CODES, LANGUAGES, dominantLanguage, type LangCode } from "@/lib/ask/languages";

export type TurnConfig = {
  bargeWords: number;
  bargeMs: number;
  resumeMs: number;
  earlyMs: number;
  unfinishedMs: number;
};

export const DEFAULT_TURN_CONFIG: TurnConfig = {
  bargeWords: 3,
  bargeMs: 700,
  resumeMs: 2000,
  earlyMs: 1000,
  unfinishedMs: 800,
};

export type Tok = {
  text: string;
  isFinal: boolean;
  speaker?: string | null;
  language?: string | null;
  startMs?: number;
  endMs?: number;
  confidence?: number;
};

export type HubMode = "idle" | "thinking" | "speaking";

export type TurnEvent =
  | { type: "tokens"; tokens: Tok[]; now: number }
  | { type: "endpoint"; now: number }
  | { type: "hub"; mode: HubMode; now: number; askedQuestion?: boolean }
  | { type: "tick"; now: number };

export type Submit = {
  type: "submit";
  text: string;
  lang: LangCode;
  /** Whether the main speaker said most of it. */
  speaker: "main" | "other";
  /** Mean token confidence, 0–1 (1 when Soniox gives none). */
  confidence: number;
  /** The Hub had just asked a question. */
  afterQuestion: boolean;
};

export type TurnAction =
  | { type: "duck" }
  | { type: "resume" }
  | { type: "stop"; reason: "stop_word" | "barge_in" | "early_correction" }
  | Submit
  | { type: "ignore"; text: string; reason: "filler" | "stray_word" | "empty" }
  | { type: "wait"; until: number };

export type TurnState = {
  hub: HubMode;
  hubSince: number;
  askedQuestion: boolean;
  /** Final tokens of the turn being spoken (idle) or of the speech over the Hub. */
  turn: Tok[];
  /** Live (non-final) tokens, replaced on every message. */
  live: Tok[];
  mainSpeaker: string | null;
  /** Ducked since (ms), or null. */
  duckedAt: number | null;
  /** Last time real (non-filler) words from the main speaker were heard. */
  lastSpeechAt: number;
  /** First real word over the Hub (ms), for BARGE_MS. */
  speechStartAt: number | null;
  /** Waiting for the rest of an unfinished sentence until (ms). */
  waitUntil: number | null;
};

export function initialTurnState(now = 0): TurnState {
  return {
    hub: "idle",
    hubSince: now,
    askedQuestion: false,
    turn: [],
    live: [],
    mainSpeaker: null,
    duckedAt: null,
    lastSpeechAt: 0,
    speechStartAt: null,
    waitUntil: null,
  };
}

/* ─── phrase helpers ─── */

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/[^\p{L}\p{M}\p{N}'\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

type PhraseKind = "fillers" | "stopWords" | "connectors" | "shortAnswers";
const PHRASES: Record<PhraseKind, Set<string>> = { fillers: new Set(), stopWords: new Set(), connectors: new Set(), shortAnswers: new Set() };
for (const c of LANG_CODES) for (const k of Object.keys(PHRASES) as PhraseKind[]) for (const p of LANGUAGES[c].turns[k]) PHRASES[k].add(norm(p));

/** Can the whole text be covered by phrases of this kind (up to 3 words each)? */
function coveredBy(text: string, kind: PhraseKind): boolean {
  const words = norm(text).split(" ").filter(Boolean);
  if (!words.length) return false;
  const ok: boolean[] = Array(words.length + 1).fill(false);
  ok[0] = true;
  for (let i = 0; i < words.length; i++) {
    if (!ok[i]) continue;
    for (let n = 1; n <= 3 && i + n <= words.length; n++) if (PHRASES[kind].has(words.slice(i, i + n).join(" "))) ok[i + n] = true;
  }
  return ok[words.length];
}

/** Does the text contain a stop phrase anywhere? */
function hasStopWord(text: string): boolean {
  const words = norm(text).split(" ").filter(Boolean);
  for (let i = 0; i < words.length; i++) for (let n = 1; n <= 3 && i + n <= words.length; n++) if (PHRASES.stopWords.has(words.slice(i, i + n).join(" "))) return true;
  return false;
}

/** Words not covered by filler phrases (up to 3 words each, longest first). */
function realWords(text: string): number {
  const words = norm(text).split(" ").filter(Boolean);
  let real = 0;
  for (let i = 0; i < words.length; ) {
    let n = 3;
    while (n > 0 && !(i + n <= words.length && PHRASES.fillers.has(words.slice(i, i + n).join(" ")))) n--;
    if (n) i += n;
    else {
      real++;
      i++;
    }
  }
  return real;
}

function endsUnfinished(text: string): boolean {
  const words = norm(text).split(" ").filter(Boolean);
  if (words.length < 2) return false;
  const last1 = words[words.length - 1];
  const last2 = words.slice(-2).join(" ");
  return PHRASES.connectors.has(last1) || PHRASES.connectors.has(last2);
}

const textOf = (toks: Tok[]) => toks.map((t) => t.text).join("").trim();

/** Majority speaker of these tokens by letters, or null when Soniox gives no labels. */
function majoritySpeaker(toks: Tok[]): string | null {
  const count = new Map<string, number>();
  for (const t of toks) {
    if (!t.speaker) continue;
    const n = (t.text.match(/\p{L}/gu) ?? []).length;
    count.set(t.speaker, (count.get(t.speaker) ?? 0) + n);
  }
  let best: string | null = null;
  let bestN = 0;
  for (const [s, n] of count) if (n > bestN) [best, bestN] = [s, n];
  return best;
}

/** Tokens from the main speaker only (all tokens when there's no lock or no labels). */
function fromMain(toks: Tok[], main: string | null): Tok[] {
  if (!main) return toks;
  return toks.filter((t) => !t.speaker || t.speaker === main);
}

/* ─── the engine ─── */

export function stepTurn(prev: TurnState, ev: TurnEvent, cfg: TurnConfig = DEFAULT_TURN_CONFIG): { state: TurnState; actions: TurnAction[] } {
  const s: TurnState = { ...prev, turn: prev.turn.slice(), live: prev.live.slice() };
  const actions: TurnAction[] = [];

  const resetSpeech = () => {
    s.turn = [];
    s.live = [];
    s.speechStartAt = null;
    s.waitUntil = null;
  };

  const submitTurn = () => {
    const toks = s.turn;
    const text = textOf(toks);
    resetSpeech();
    if (!text || !/[\p{L}\p{N}]/u.test(text)) {
      if (text) actions.push({ type: "ignore", text, reason: "empty" });
      return;
    }
    const words = norm(text).split(" ").filter(Boolean);
    // Rule 6: a stray word or a filler on its own is not a turn, unless it answers the Hub's question.
    if (!s.askedQuestion) {
      if (coveredBy(text, "fillers")) {
        actions.push({ type: "ignore", text, reason: "filler" });
        return;
      }
      if (words.length === 1 && !coveredBy(text, "shortAnswers") && !hasStopWord(text)) {
        actions.push({ type: "ignore", text, reason: "stray_word" });
        return;
      }
    }
    const speaker = majoritySpeaker(toks);
    if (!s.mainSpeaker && speaker) s.mainSpeaker = speaker; // rule 1: the first real turn locks the main speaker
    const confs = toks.map((t) => t.confidence).filter((c): c is number => typeof c === "number");
    actions.push({
      type: "submit",
      text,
      lang: dominantLanguage(toks),
      speaker: !speaker || !s.mainSpeaker || speaker === s.mainSpeaker ? "main" : "other",
      confidence: confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : 1,
      afterQuestion: s.askedQuestion,
    });
    s.askedQuestion = false;
  };

  switch (ev.type) {
    case "hub": {
      // Already in this mode (e.g. the engine itself stopped the Hub): only the question flag changes.
      if (ev.mode === s.hub) {
        if (ev.mode === "idle" && ev.askedQuestion !== undefined) s.askedQuestion = ev.askedQuestion;
        break;
      }
      s.hub = ev.mode;
      s.hubSince = ev.now;
      if (ev.mode === "idle") {
        s.askedQuestion = !!ev.askedQuestion;
        if (s.duckedAt !== null) {
          s.duckedAt = null;
          actions.push({ type: "resume" });
        }
        // Words said over the Hub that didn't stop it are dropped (fillers, other voices).
        resetSpeech();
      } else {
        s.askedQuestion = false;
        // A new answer starts: whatever was half-said is no longer pending.
        s.waitUntil = null;
      }
      break;
    }

    case "tokens": {
      for (const t of ev.tokens) if (t.isFinal && t.text !== "<end>") s.turn.push(t);
      s.live = ev.tokens.filter((t) => !t.isFinal && t.text !== "<end>");
      const heard = [...s.turn, ...s.live];

      if (s.hub === "idle") {
        // New words while waiting for the rest of a sentence: keep waiting for the next endpoint.
        if (s.waitUntil !== null && ev.tokens.some((t) => /[\p{L}\p{N}]/u.test(t.text))) s.waitUntil = null;
        break;
      }

      // The Hub is thinking or speaking: only the main speaker can interrupt.
      const mine = fromMain(heard, s.mainSpeaker);
      const text = textOf(mine);
      if (!text) break;
      if (hasStopWord(text)) {
        actions.push({ type: "stop", reason: "stop_word" });
        s.duckedAt = null;
        s.turn = fromMain(s.turn, s.mainSpeaker);
        s.hub = "idle";
        s.hubSince = ev.now;
        // A bare stop word isn't a question: drop it.
        if (coveredBy(textOf(s.turn), "stopWords")) resetSpeech();
        break;
      }
      const real = realWords(text);
      if (!real) break; // rule 2: fillers only
      s.lastSpeechAt = ev.now;
      if (s.speechStartAt === null) s.speechStartAt = ev.now;

      const early = s.hub === "speaking" && ev.now - s.hubSince < cfg.earlyMs;
      const enough = real >= cfg.bargeWords || ev.now - s.speechStartAt >= cfg.bargeMs;
      // While thinking there is no sound to duck: two real words cancel the answer.
      const thinkingCut = s.hub === "thinking" && real >= 2;
      if (early || enough || thinkingCut) {
        actions.push({ type: "stop", reason: early ? "early_correction" : "barge_in" });
        s.duckedAt = null;
        s.hub = "idle";
        s.hubSince = ev.now;
        s.turn = fromMain(s.turn, s.mainSpeaker); // the interrupting words start the next turn
        s.speechStartAt = null;
        break;
      }
      if (s.hub === "speaking" && s.duckedAt === null) {
        s.duckedAt = ev.now;
        actions.push({ type: "duck" });
      }
      break;
    }

    case "endpoint": {
      if (s.hub !== "idle") {
        // An endpoint over the Hub that didn't stop it: those words were fillers or another voice.
        s.turn = [];
        s.live = [];
        break;
      }
      const text = textOf(s.turn);
      if (text && s.waitUntil === null && endsUnfinished(text)) {
        s.waitUntil = ev.now + cfg.unfinishedMs;
        actions.push({ type: "wait", until: s.waitUntil });
        break;
      }
      submitTurn();
      break;
    }

    case "tick": {
      if (s.hub === "idle" && s.waitUntil !== null && ev.now >= s.waitUntil) submitTurn();
      if (s.duckedAt !== null && ev.now - Math.max(s.lastSpeechAt, s.duckedAt) >= cfg.resumeMs) {
        // False alarm: no real words for a while. Bring the volume back and drop what was heard.
        s.duckedAt = null;
        s.turn = [];
        s.live = [];
        s.speechStartAt = null;
        actions.push({ type: "resume" });
      }
      break;
    }
  }
  return { state: s, actions };
}

/** Run a whole event list (for replay and tests). */
export function replayTurns(events: TurnEvent[], cfg: TurnConfig = DEFAULT_TURN_CONFIG) {
  let state = initialTurnState(events[0]?.now ?? 0);
  const out: { at: number; action: TurnAction }[] = [];
  for (const ev of events) {
    const r = stepTurn(state, ev, cfg);
    state = r.state;
    for (const a of r.actions) out.push({ at: ev.now, action: a });
  }
  return { state, actions: out };
}
