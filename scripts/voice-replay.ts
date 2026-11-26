/**
 * Replay voice turn cases through the turn engine (lib/voice/turns.ts) and
 * check each decision. No audio, no network, no cost.
 *
 *   npx tsx scripts/voice-replay.ts            # all cases
 *   npx tsx scripts/voice-replay.ts --verbose  # print every action
 *
 * A case is a list of events (Soniox-like tokens, endpoints, the Hub's mode,
 * clock ticks) and the actions expected, in order (only the listed types are
 * compared; "submit" also checks speaker and language when given). Recorded
 * staff sessions (token JSON, no audio) are added here as they come in.
 */

import { replayTurns, type Tok, type TurnAction, type TurnEvent } from "@/lib/voice/turns";

type Expect = { type: TurnAction["type"]; speaker?: "main" | "other"; lang?: string; text?: string };
type Case = { name: string; events: TurnEvent[]; expect: Expect[] };

/** Words as Soniox-like tokens: each word a token with a leading space. */
function said(text: string, o: { speaker?: string; lang?: string; final?: boolean; conf?: number } = {}): Tok[] {
  return text.split(" ").map((w, i) => ({
    text: i === 0 ? w : ` ${w}`,
    isFinal: o.final ?? true,
    speaker: o.speaker ?? "1",
    language: o.lang ?? "en",
    confidence: o.conf ?? 0.95,
  }));
}

const tokens = (now: number, toks: Tok[]): TurnEvent => ({ type: "tokens", tokens: toks, now });
const endpoint = (now: number): TurnEvent => ({ type: "endpoint", now });
const hub = (now: number, mode: "idle" | "thinking" | "speaking", askedQuestion?: boolean): TurnEvent => ({ type: "hub", mode, now, askedQuestion });
const tick = (now: number): TurnEvent => ({ type: "tick", now });

/** The Hub is speaking from t=0; it started long enough ago that the early-correction window has passed. */
const speakingSince = (t: number): TurnEvent[] => [hub(t, "thinking"), hub(t + 10, "speaking")];

const CASES: Case[] = [
  // ── turns while idle ──
  { name: "plain question", events: [tokens(0, said("What is the livestock budget in Patratu?")), endpoint(900)], expect: [{ type: "submit", speaker: "main", lang: "en" }] },
  { name: "Hindi question", events: [tokens(0, said("पतरातू में पशुधन का बजट कितना है?", { lang: "hi" })), endpoint(900)], expect: [{ type: "submit", lang: "hi" }] },
  { name: "Hinglish question", events: [tokens(0, said("Patratu mein livestock ka budget kitna hai", { lang: "en" })), endpoint(900)], expect: [{ type: "submit", lang: "hi" }] },
  { name: "filler alone is ignored", events: [tokens(0, said("hmm")), endpoint(400)], expect: [{ type: "ignore" }] },
  { name: "Hindi filler alone is ignored", events: [tokens(0, said("haan ji", { lang: "hi" })), endpoint(400)], expect: [{ type: "ignore" }] },
  { name: "stray word is ignored", events: [tokens(0, said("water")), endpoint(400)], expect: [{ type: "ignore" }] },
  { name: "yes after the Hub's question counts", events: [hub(0, "thinking"), hub(10, "speaking"), hub(3000, "idle", true), tokens(3500, said("yes")), endpoint(3900)], expect: [{ type: "submit" }] },
  { name: "haan after the Hub's question counts", events: [hub(0, "thinking"), hub(10, "speaking"), hub(3000, "idle", true), tokens(3500, said("haan", { lang: "hi" })), endpoint(3900)], expect: [{ type: "submit" }] },
  { name: "yes alone, with no question asked, is ignored", events: [tokens(0, said("yes")), endpoint(400)], expect: [{ type: "ignore" }] },
  { name: "greeting counts", events: [tokens(0, said("hello")), endpoint(400)], expect: [{ type: "submit" }] },
  {
    name: "unfinished sentence waits, then joins",
    events: [tokens(0, said("What about Patratu and")), endpoint(900), tick(1200), tokens(1300, said(" Mau livestock")), endpoint(2000)],
    expect: [{ type: "wait" }, { type: "submit", text: "What about Patratu and Mau livestock" }],
  },
  { name: "unfinished sentence submits after the wait", events: [tokens(0, said("Tell me about Rajnagar and")), endpoint(900), tick(1500), tick(1800)], expect: [{ type: "wait" }, { type: "submit" }] },
  { name: "Hindi connector waits", events: [tokens(0, said("पतरातू में पानी और", { lang: "hi" })), endpoint(900), tick(1800)], expect: [{ type: "wait" }, { type: "submit", lang: "hi" }] },
  {
    name: "first speaker locks; second voice is marked other",
    events: [
      tokens(0, said("What is the budget for Mau?", { speaker: "1" })),
      endpoint(900),
      hub(1000, "thinking"),
      hub(1500, "speaking"),
      hub(4000, "idle"),
      tokens(5000, said("Did you send the invoice yesterday?", { speaker: "2" })),
      endpoint(6000),
    ],
    expect: [{ type: "submit", speaker: "main" }, { type: "submit", speaker: "other" }],
  },

  // ── speech over the Hub ──
  { name: "filler over the Hub doesn't interrupt", events: [...speakingSince(0), tokens(2000, said("hmm okay")), endpoint(2500), tick(3000)], expect: [] },
  { name: "Hindi filler over the Hub doesn't interrupt", events: [...speakingSince(0), tokens(2000, said("haan theek hai", { lang: "hi" })), endpoint(2500)], expect: [] },
  { name: "stop word stops at once", events: [...speakingSince(0), tokens(2000, said("wait"))], expect: [{ type: "stop" }] },
  { name: "Hindi stop word stops at once", events: [...speakingSince(0), tokens(2000, said("ruko", { lang: "hi" }))], expect: [{ type: "stop" }] },
  {
    name: "real barge-in: duck, then stop after three words, then the question",
    events: [...speakingSince(0), tokens(2000, said("no I", { final: false })), tokens(2200, said("no I meant goats", { final: true })), endpoint(2800)],
    expect: [{ type: "duck" }, { type: "stop" }, { type: "submit", text: "no I meant goats" }],
  },
  { name: "duck then resume when it was nothing", events: [...speakingSince(0), tokens(2000, said("so", { final: false })), tick(2500), tick(4100)], expect: [{ type: "duck" }, { type: "resume" }] },
  { name: "long speech stops after 700 ms even with few words", events: [...speakingSince(0), tokens(2000, said("actually", { final: false })), tokens(2800, said("actually", { final: false }))], expect: [{ type: "duck" }, { type: "stop" }] },
  { name: "early correction in the first second", events: [hub(0, "thinking"), hub(10, "speaking"), tokens(500, said("Mau", { final: false }))], expect: [{ type: "stop" }] },
  { name: "another voice never interrupts", events: [tokens(0, said("Budget for Mau?", { speaker: "1" })), endpoint(500), ...speakingSince(1000), tokens(3000, said("can you pass the water please", { speaker: "2" })), tick(3500)], expect: [{ type: "submit" }] },
  { name: "two real words while thinking cancel the answer", events: [hub(0, "thinking"), tokens(400, said("sorry Rajnagar", { final: false }))], expect: [{ type: "stop" }] },
  { name: "bare stop word is not a question", events: [...speakingSince(0), tokens(2000, said("stop")), endpoint(2400)], expect: [{ type: "stop" }] },
];

const verbose = process.argv.includes("--verbose");
let failed = 0;
for (const c of CASES) {
  const { actions } = replayTurns(c.events);
  const got = actions.map((a) => a.action).filter((a) => c.expect.length === 0 || ["duck", "resume", "stop", "submit", "ignore", "wait"].includes(a.type));
  const relevant = got;
  let ok = relevant.length === c.expect.length;
  if (ok) {
    for (let i = 0; i < c.expect.length; i++) {
      const e = c.expect[i];
      const a = relevant[i];
      if (a.type !== e.type) ok = false;
      else if (a.type === "submit") {
        if (e.speaker && a.speaker !== e.speaker) ok = false;
        if (e.lang && a.lang !== e.lang) ok = false;
        if (e.text && a.text !== e.text) ok = false;
      }
    }
  }
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${c.name}`);
  if (!ok || verbose) {
    console.log(`     expected: ${c.expect.map((e) => e.type).join(", ") || "(nothing)"}`);
    console.log(`     got:      ${relevant.map((a) => (a.type === "submit" ? `submit[${a.speaker},${a.lang}] "${a.text}"` : a.type === "stop" ? `stop(${a.reason})` : a.type === "ignore" ? `ignore(${a.reason})` : a.type)).join(", ") || "(nothing)"}`);
  }
}
console.log(`\n${CASES.length - failed}/${CASES.length} cases pass`);
process.exit(failed ? 1 : 0);
