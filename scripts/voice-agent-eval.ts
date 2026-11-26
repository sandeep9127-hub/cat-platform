/**
 * Voice agent eval (docs/voice-agent-plan.md, step 7). Runs scripted spoken
 * conversations against a running Ask server with VOICE_AGENT=on and checks
 * each decision: answered or ignored, the right tool and screen action,
 * citations in range, reply language, no talk about searching, goodbyes
 * ending the call, follow-ups staying on topic. Reports pass rate and P50/P90
 * time to first words.
 *
 *   node scripts/dev-cat.mjs                      # in another terminal (VOICE_AGENT on)
 *   npx tsx scripts/voice-agent-eval.ts           # all cases
 *   npx tsx scripts/voice-agent-eval.ts --only hindi --verbose
 *   npx tsx scripts/voice-agent-eval.ts --marked   # also the turns editors marked wrong in /admin/voice
 *
 * Costs real money: about 25 cases, a few Haiku calls each, roughly $0.02 a run
 * (logged to cat.ai_usage under the daily caps). Writes conversations and
 * voice_turns rows to whichever database the server uses: locally the CAT dev
 * branch (scripts/dev-cat.mjs). Never point it at the live site. --marked reads
 * editors' marks from the live CAT database (read only).
 */

const BASE = process.env.EVAL_BASE ?? "http://localhost:3100";
if (/agroecologyindia|vercel\.app|cat-hub/i.test(BASE) && !process.env.EVAL_ALLOW_REMOTE) {
  console.error(`Refusing to run against ${BASE}: set EVAL_ALLOW_REMOTE=1 for a test copy (never production).`);
  process.exit(1);
}

type Turn = { text: string; lang?: "en" | "hi"; speaker?: "main" | "other"; afterQuestion?: boolean; confidence?: number };
type Expect = {
  ignored?: boolean;
  /** Not answered from the library: ignored, "was that for me?", or a short non-library line. */
  notAnswered?: boolean;
  endVoice?: boolean;
  action?: "open_sources" | "show_landscape";
  searched?: boolean;
  lang?: "en" | "hi";
  includesAny?: RegExp[];
  excludes?: RegExp[];
  cited?: boolean;
  question?: boolean;
  sameAsPrevious?: boolean;
};
type Case = { name: string; tags: string[]; turns: Turn[]; expect: Expect };

const NARRATION = [/\b(search(ing)? (the )?(library|results)|search results|passages? (above|provided)|I('ll| will) (look|search|check)|let me (look|search))\b/i, /खोज परिणाम|खोज की आवश्यकता/];

const CASES: Case[] = [
  { name: "plain question", tags: ["answer"], turns: [{ text: "What is the livestock budget in Patratu?" }], expect: { cited: true, lang: "en", excludes: NARRATION, includesAny: [/crore|lakh|cr\b|₹|Rs/i] } },
  { name: "water plan", tags: ["answer"], turns: [{ text: "What does Rajnagar plan for water harvesting?" }], expect: { cited: true, includesAny: [/pond|water/i], excludes: NARRATION } },
  { name: "side talk from a second speaker", tags: ["side"], turns: [{ text: "Did you send the invoice to Ramesh yesterday?", speaker: "other" }], expect: { ignored: true } },
  { name: "side talk: chai", tags: ["side"], turns: [{ text: "Arre chai lao, ek minute", lang: "hi" }], expect: { notAnswered: true } },
  { name: "side talk: phone call", tags: ["side"], turns: [{ text: "Haan bhai, main meeting mein hoon, baad mein call karta hoon", lang: "hi" }], expect: { notAnswered: true } },
  { name: "side talk: office chatter", tags: ["side"], turns: [{ text: "Can someone close the window, it's getting cold in here" }], expect: { notAnswered: true } },
  { name: "Hindi question", tags: ["hindi"], turns: [{ text: "राजनगर में पानी के लिए क्या योजना है?", lang: "hi" }], expect: { lang: "hi", cited: true, excludes: NARRATION } },
  { name: "Hinglish question", tags: ["hindi"], turns: [{ text: "Patratu mein livestock ka budget kitna hai", lang: "hi" }], expect: { lang: "hi", cited: true } },
  {
    name: "follow-up stays on the landscape",
    tags: ["state"],
    turns: [{ text: "What is the livestock budget in Patratu?" }, { text: "And how much for goats?" }],
    expect: { includesAny: [/goat|ruminant/i], excludes: [/\bMau\b|Vempalli|Rajnagar/] },
  },
  { name: "comparison searches again", tags: ["tools"], turns: [{ text: "How does the livestock budget in Patratu compare with Mau?" }], expect: { searched: true, includesAny: [/Mau/], excludes: NARRATION } },
  { name: "show the sources", tags: ["tools"], turns: [{ text: "What does Rajnagar plan for water harvesting? Show me the sources." }], expect: { action: "open_sources", cited: true } },
  { name: "show a landscape page", tags: ["tools"], turns: [{ text: "Tell me about the Vempalli plan and show me its page" }], expect: { action: "show_landscape" } },
  { name: "goodbye ends the call", tags: ["end"], turns: [{ text: "Thanks, that is all for today, you can stop now" }], expect: { endVoice: true } },
  { name: "Hindi goodbye ends the call", tags: ["end", "hindi"], turns: [{ text: "ठीक है, हम बात यहीं खत्म करते हैं, धन्यवाद", lang: "hi" }], expect: { endVoice: true, lang: "hi" } },
  { name: "repeat", tags: ["command"], turns: [{ text: "What is the livestock budget in Patratu?" }, { text: "Sorry, can you repeat that?" }], expect: { sameAsPrevious: true } },
  { name: "who are you", tags: ["identity"], turns: [{ text: "Who are you?" }], expect: { includesAny: [/Agents of Change/] } },
  { name: "who are you in Hindi", tags: ["identity", "hindi"], turns: [{ text: "आप कौन हैं?", lang: "hi" }], expect: { includesAny: [/Agents of Change/], lang: "hi" } },
  { name: "off-topic question is not invented", tags: ["refuse"], turns: [{ text: "What will the weather be in Delhi tomorrow?" }], expect: { excludes: [/°|degrees|rain(y)? tomorrow|sunny/i] } },
  {
    name: "short answer to the agent's question counts",
    tags: ["state"],
    turns: [{ text: "How much is Patratu spending on goats?" }, { text: "The supply line", afterQuestion: true }],
    expect: { includesAny: [/supply|lakh|₹/i] },
  },
  { name: "low-confidence noise is not answered", tags: ["side"], turns: [{ text: "uh the the okay so", confidence: 0.4 }], expect: { notAnswered: true } },
];

type Result = { timing?: Record<string, number>; status: number; ignored: boolean; text: string; citations: number; markers: number[]; actions: string[]; searched: boolean; endVoice: boolean; firstMs: number | null; totalMs: number; mode: string | null };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let lastRequestAt = 0;

async function askTurn(t: Turn, conversationId: string | null, cookie: string): Promise<{ r: Result; conversationId: string | null; cookie: string }> {
  // The Ask route allows 10 questions a minute per address: keep under it.
  const wait = lastRequestAt + 6500 - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
  const started = Date.now();
  const res = await fetch(`${BASE}/api/agent`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}), referer: `${BASE}/agent` },
    body: JSON.stringify({
      voice: true,
      language: t.lang ?? "en",
      turn: { speaker: t.speaker ?? "main", confidence: t.confidence ?? 0.95, afterQuestion: t.afterQuestion ?? false },
      ...(conversationId ? { conversationId } : {}),
      messages: [{ role: "user", content: t.text }],
    }),
  });
  const set = res.headers.get("set-cookie");
  if (set) cookie = set.split(";")[0];
  const r: Result = { status: res.status, ignored: false, text: "", citations: 0, markers: [], actions: [], searched: false, endVoice: false, firstMs: null, totalMs: 0, mode: null };
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("text/event-stream")) {
    const j = (await res.json().catch(() => ({}))) as { ignored?: boolean; text?: string };
    r.ignored = !!j.ignored;
    r.text = j.text ?? "";
    r.totalMs = Date.now() - started;
    return { r, conversationId, cookie };
  }
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 2);
      if (!line.startsWith("data:")) continue;
      const e = JSON.parse(line.slice(5));
      if (e.type === "meta") {
        conversationId = e.conversationId ?? conversationId;
        r.citations = (e.citations ?? []).length;
        r.mode = e.mode ?? null;
      } else if (e.type === "sources") {
        r.citations = e.citations.length;
        r.searched = true;
      } else if (e.type === "action") r.actions.push(e.action?.type);
      else if (e.type === "delta") {
        if (r.firstMs === null) r.firstMs = Date.now() - started;
        r.text += e.text;
      } else if (e.type === "done") {
        r.endVoice = !!e.endVoice;
        if (e.timing) r.timing = e.timing;
      }
    }
  }
  r.markers = [...new Set([...r.text.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])))];
  r.totalMs = Date.now() - started;
  return { r, conversationId, cookie };
}

const devanagariShare = (t: string) => {
  const letters = t.replace(/\[\d+\]/g, "").match(/\p{L}/gu) ?? [];
  return letters.length ? letters.filter((c) => /[ऀ-ॿ]/.test(c)).length / letters.length : 0;
};

function check(e: Expect, r: Result, prev: Result | null): string[] {
  const fail: string[] = [];
  const answeredFromLibrary = !r.ignored && r.mode !== "chat" && r.citations > 0;
  if (r.status !== 200) fail.push(`HTTP ${r.status}`);
  if (e.ignored !== undefined && r.ignored !== e.ignored) fail.push(e.ignored ? "was answered, expected silence" : "was ignored");
  if (e.notAnswered && answeredFromLibrary) fail.push("answered from the library, expected no answer");
  if (e.notAnswered === false && (r.ignored || r.mode === "chat")) fail.push("not answered, expected an answer");
  if (e.endVoice !== undefined && r.endVoice !== e.endVoice) fail.push(e.endVoice ? "didn't end the call" : "ended the call");
  if (e.action && !r.actions.includes(e.action)) fail.push(`no ${e.action} action`);
  if (e.searched && !r.searched) fail.push("didn't search again");
  if (e.cited && !r.markers.length) fail.push("no citations");
  if (r.markers.some((m) => m < 1 || m > r.citations)) fail.push(`citation out of range (${r.markers.join(",")} of ${r.citations})`);
  if (e.lang === "hi" && devanagariShare(r.text) < 0.6) fail.push(`not Hindi enough (${Math.round(devanagariShare(r.text) * 100)}% Devanagari)`);
  if (e.lang === "en" && devanagariShare(r.text) > 0.2) fail.push("not English");
  for (const re of e.includesAny ? [e.includesAny] : []) if (!re.some((x) => x.test(r.text))) fail.push(`missing ${re.map(String).join(" or ")}`);
  for (const re of e.excludes ?? []) if (re.test(r.text)) fail.push(`contains ${re}`);
  if (e.question && !/[?？]\s*$/.test(r.text.trim())) fail.push("didn't ask a question");
  const plain = (x: string) => x.replace(/\[\d+\]/g, "").replace(/\s+/g, " ").trim();
  if (e.sameAsPrevious && prev && plain(r.text) !== plain(prev.text)) fail.push("repeat didn't match the previous answer");
  return fail;
}

const pct = (xs: number[], p: number) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};

/**
 * Turns an editor marked wrong in /admin/voice (cat.voice_turns, CAT database),
 * as cases: the expectation comes from what they said it should have done.
 * Only turns that kept their words (never side talk or a second speaker).
 */
async function markedCases(): Promise<Case[]> {
  const { config } = await import("dotenv");
  config({ path: ".env.local", quiet: true });
  if (!process.env.DATABASE_URL_CAT) throw new Error("DATABASE_URL_CAT is not set in .env.local");
  const postgres = (await import("postgres")).default;
  const sql = postgres(process.env.DATABASE_URL_CAT, { max: 1 });
  try {
    const rows = await sql<{ transcript: string; lang: string; speaker: "main" | "other"; after_question: boolean; confidence: number | null; marked_note: string | null; created_at: Date }[]>`
      SELECT transcript, lang, speaker, after_question, confidence, marked_note, created_at FROM cat.voice_turns
      WHERE marked_wrong = true AND transcript IS NOT NULL ORDER BY created_at DESC LIMIT 100`;
    return rows.flatMap((r): Case[] => {
      const note = r.marked_note ?? "";
      const expect: Expect | null = /answered/i.test(note)
        ? { notAnswered: false, ignored: false }
        : /quiet/i.test(note)
          ? { notAnswered: true }
          : /ended/i.test(note)
            ? { endVoice: true }
            : /searched again/i.test(note)
              ? { searched: true }
              : /asked first/i.test(note)
                ? { question: true }
                : null;
      if (!expect) return [];
      const lang = r.lang === "hi" ? "hi" : "en";
      return [{
        name: `marked ${r.created_at.toISOString().slice(0, 10)}: ${r.transcript.slice(0, 32)}`,
        tags: ["marked"],
        turns: [{ text: r.transcript, lang, speaker: r.speaker, afterQuestion: r.after_question, confidence: r.confidence ?? 0.95 }],
        expect,
      }];
    });
  } finally {
    await sql.end();
  }
}

async function main() {
  const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;
  const verbose = process.argv.includes("--verbose");
  const info = (await fetch(`${BASE}/api/agent`).then((r) => r.json()).catch(() => ({}))) as { voiceAgent?: boolean };
  if (!info.voiceAgent) {
    console.error(`${BASE} doesn't have the voice agent on (VOICE_AGENT=on). Start it with: node scripts/dev-cat.mjs`);
    process.exit(1);
  }
  const all = process.argv.includes("--marked") ? [...CASES, ...(await markedCases())] : CASES;
  const cases = all.filter((c) => !only || c.tags.includes(only) || c.name.includes(only));
  const first: number[] = [];
  let passed = 0;
  for (const c of cases) {
    let cookie = "";
    let conversationId: string | null = null;
    let prev: Result | null = null;
    let last: Result | null = null;
    for (const t of c.turns) {
      const out = await askTurn(t, conversationId, cookie);
      cookie = out.cookie;
      conversationId = out.conversationId;
      prev = last;
      last = out.r;
      if (out.r.firstMs !== null && out.r.citations > 0) first.push(out.r.firstMs);
    }
    const fails = check(c.expect, last!, prev);
    if (!fails.length) passed++;
    console.log(`${fails.length ? "FAIL" : "ok  "} ${c.name.padEnd(44)} ${String(last!.firstMs ?? "-").padStart(5)} ms${fails.length ? `  ${fails.join("; ")}` : ""}`);
    if (last!.timing && process.argv.includes("--timing")) console.log(`       timing ${JSON.stringify(last!.timing)}`);
    if (verbose || fails.length) console.log(`       ${last!.ignored ? "(ignored)" : last!.text.slice(0, 220).replace(/\s+/g, " ")}`);
  }
  console.log(`\n${passed}/${cases.length} cases pass · first words P50 ${pct(first, 50)} ms, P90 ${pct(first, 90)} ms (answered turns)`);
  process.exit(passed === cases.length ? 0 : 1);
}

void main();
