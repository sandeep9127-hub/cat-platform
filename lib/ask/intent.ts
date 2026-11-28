import { BudgetExceededError, claudeMessage, safeJsonParse, type StreamTurn } from "@/lib/ai/claude";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { judgeExamples } from "@/lib/ask/judge-examples";

/**
 * One cheap Haiku call per question: a standalone search query (follow-ups
 * resolved from the conversation) and which Ask mode should answer it.
 *   answer  – plain cited answer from the landscape plans (default)
 *   compare – contrasts two or more landscapes on some aspect
 *   match   – describes a problem or need and asks which programmes could help
 */

export type Intent = {
  intent: "answer" | "compare" | "match" | "note" | "visual" | "chat";
  query: string;
  topic: string;
  landscapes: string[];
  /** Voice agent only: was the turn meant for the assistant (docs/voice-agent-plan.md, step 2b)? */
  addressed?: "question" | "side_talk" | "command";
  command?: "none" | "repeat" | "end" | "shorter" | "show_sources";
  /** The judge is confident about `addressed`. */
  sure?: boolean;
};

/** What the browser's turn engine knew about a spoken turn. */
export type TurnSignals = { speaker: "main" | "other"; confidence: number; afterQuestion: boolean };

const SCHEMA = {
  type: "object",
  properties: {
    intent: { type: "string", enum: ["answer", "compare", "match", "note", "visual", "chat"] },
    query: { type: "string" },
    topic: { type: "string" },
    landscapes: { type: "array", items: { type: "string" } },
  },
  required: ["intent", "query", "topic", "landscapes"],
  additionalProperties: false,
};

function prompt(): string {
  const roster = Object.values(LANDSCAPES)
    .map((l) => `${l.slug} = ${l.name.replace(/ landscape$/i, "")}`)
    .join("; ");
  return `You route questions for the CAT Transformation Hub, which holds landscape investment plans (LIPs) for these landscapes: ${roster}; and a Solutions Atlas of agroecology programmes across India.

Return:
- intent: "compare" when the reader asks to compare, contrast or set side by side two or more of the landscapes above on some aspect. "match" when the reader describes a problem, situation or need and asks which programmes, solutions or approaches could help, or who has done something similar elsewhere. "note" when the reader asks for a note, summary, brief or one-pager on a topic. "visual" when the reader asks for a chart, graph, breakdown, diagram or flow. "chat" when the turn is only conversation with no question in it (thanks, a greeting, goodbye, an acknowledgement, or asking to stop), in any language. Otherwise "answer", including any question about a single landscape.
- query: the latest question rewritten as one standalone search query. Resolve follow-ups ("and in Vempalli?", "what about cost?") from the conversation, and keep names, numbers and key terms. Always write it in English, translating a question asked in Hindi or another language, because the library is in English.
- topic: for "compare", the aspect being compared in a few words (e.g. "water budgets"); for "note" and "visual", the subject in a few words. Otherwise "".
- landscapes: slugs from the list above that the question names or clearly refers to, including through the conversation. Otherwise [].`;
}

const AGENT_SCHEMA = {
  ...SCHEMA,
  properties: {
    ...SCHEMA.properties,
    addressed: { type: "string", enum: ["question", "side_talk", "command"] },
    command: { type: "string", enum: ["none", "repeat", "end", "shorter", "show_sources"] },
    sure: { type: "boolean" },
  },
  required: [...SCHEMA.required, "addressed", "command", "sure"],
};

const AGENT_NOTE = `
You are also the turn judge for a voice conversation. The microphone hears everything in the room, so decide whether the latest turn was meant for the assistant:
- addressed: "question" when it asks or tells the assistant something about the landscapes, programmes or this conversation (including follow-ups like "and Mau?" and answers to the assistant's own question). "command" only when the whole turn is a command: repeat, stop or end the conversation, be shorter, or show the sources. A turn that asks a question and also asks to show something ("what does Rajnagar plan for water? show me the sources") is a "question". "side_talk" when it is meant for someone else in the room or on the phone, thinking aloud, or talk that has nothing to do with the assistant or the library (e.g. "did you send the invoice", "chai lao", "one minute, I'm on a call").
- command: for "command", which one; otherwise "none".
- sure: false when you can't tell whether it was meant for the assistant.
Signals help: a turn from a second speaker is more likely side talk; a turn right after the assistant asked a question is more likely an answer; low recognition confidence means the words may be wrong.`;

const COMPARE_CUES = /\b(compare|comparison|contrast|versus|vs\.?|differ|difference|side by side|both|between)\b/i;
const MATCH_CUES =
  /\b(programmes?|programs?|solutions?|solved|who has|anyone|elsewhere|examples?|what works|worked|approach(es)?|could help|help us|help with|we (work|have|are)|our (district|block|village|farmers|area|landscape|region))\b/i;

const MAKE_CUES =
  /\b(note|notes|summary|summari[sz]e|brief|one-pager|chart|graph|plot|visuali[sz]e|diagram|flow ?chart|breakdown|break down|pie|bar)\b/i;

/**
 * Cheap pre-check for a first question: only questions that name two or more
 * landscapes, or use comparison or problem/solution wording, need the router.
 * Everything else is a plain answer, so it doesn't wait on a model call.
 */
export function mightNeedRouting(question: string): boolean {
  const q = question.toLowerCase();
  const named = Object.values(LANDSCAPES).filter((l) => {
    const name = l.name.replace(/ landscape$/i, "").toLowerCase();
    return q.includes(name) || q.includes(l.slug.replace(/-/g, " "));
  }).length;
  return named >= 2 || (COMPARE_CUES.test(question) && named >= 1) || MATCH_CUES.test(question) || MAKE_CUES.test(question);
}

/** Does the text name a landscape exactly (either part of a hyphenated name counts)? */
export function namesLandscape(text: string): boolean {
  const q = text.toLowerCase();
  return Object.values(LANDSCAPES).some((l) =>
    l.name
      .toLowerCase()
      .split(/[–-]/)
      .some((part) => part.trim().length >= 3 && new RegExp(`\\b${part.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(q)),
  );
}

const VOICE_NOTE = `
This question was spoken and transcribed by speech recognition, which often mishears the landscape names above: as spelled-out letters ("P-A-T-T-R-A-T-U"), or as near-sounding words ("Patriarchal", "Patrato", "Patra two" for Patratu; "Vempali", "When Pally" for Vempalli; "Chitra Konda" for Chitrakonda). When a word or phrase sounds like a landscape name and reads as a place in the question, use the correct landscape name in query and landscapes. Leave words alone that make sense as they are.`;

export async function classifyQuestion(
  question: string,
  history: StreamTurn[],
  signal: AbortSignal,
  opts?: { voice?: boolean; agent?: TurnSignals | true },
): Promise<Intent> {
  const fallback: Intent = { intent: "answer", query: question, topic: "", landscapes: [] };
  try {
    const transcript = history
      .slice(-6)
      .map((t) => `${t.role === "user" ? "Reader" : "Assistant"}: ${String(t.content).slice(0, 600)}`)
      .join("\n");
    const agent = opts?.agent;
    const signals =
      agent && agent !== true
        ? `\nSignals: speaker=${agent.speaker === "main" ? "the main speaker" : "a second speaker"}; recognition confidence=${agent.confidence.toFixed(2)}; ${agent.afterQuestion ? "the assistant had just asked a question" : "the assistant had not just asked a question"}.`
        : "";
    // Voice agent: admin-approved worked examples from /admin/voice (cached 30 s; "" when none).
    const examples = agent ? await judgeExamples() : "";
    const r = await claudeMessage("ask_rewrite", {
      // Examples hold visitor words, so they ride in the user message (data), never the system prompt.
      system: prompt() + (opts?.voice ? VOICE_NOTE : "") + (agent ? AGENT_NOTE : ""),
      messages: [{ role: "user", content: `${examples ? `${examples.trim()}\n\n` : ""}${transcript ? `${transcript}\n\n` : ""}Latest question: ${question}${signals}` }],
      jsonSchema: agent ? AGENT_SCHEMA : SCHEMA,
      signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
    });
    const p = safeJsonParse<Partial<Intent>>(r.text);
    if (!p) return fallback;
    const intent = (["compare", "match", "note", "visual", "chat"] as const).find((x) => x === p.intent) ?? "answer";
    const query = typeof p.query === "string" && p.query.trim() && p.query.length <= 400 ? p.query.trim() : question;
    const landscapes = Array.isArray(p.landscapes)
      ? [...new Set(p.landscapes.filter((s): s is string => typeof s === "string" && !!LANDSCAPES[s]))]
      : [];
    const topic = typeof p.topic === "string" ? p.topic.trim().slice(0, 120) : "";
    if (!agent) return { intent, query, topic, landscapes };
    const addressed = (["side_talk", "command"] as const).find((x) => x === p.addressed) ?? "question";
    const command = (["repeat", "end", "shorter", "show_sources"] as const).find((x) => x === p.command) ?? "none";
    return { intent, query, topic, landscapes, addressed, command, sure: p.sure !== false };
  } catch (e) {
    if (!(e instanceof BudgetExceededError) && !signal.aborted) console.error("[ask_v2] intent failed:", (e as Error).message);
    return fallback; // a plain answer on the raw question still works
  }
}
