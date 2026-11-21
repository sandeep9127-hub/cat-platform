import { BudgetExceededError, claudeMessage, safeJsonParse, type StreamTurn } from "@/lib/ai/claude";
import { LANDSCAPES } from "@/lib/data/landscapes";

/**
 * One cheap Haiku call per question: a standalone search query (follow-ups
 * resolved from the conversation) and which Ask mode should answer it.
 *   answer  – plain cited answer from the landscape plans (default)
 *   compare – contrasts two or more landscapes on some aspect
 *   match   – describes a problem or need and asks which programmes could help
 */

export type Intent = {
  intent: "answer" | "compare" | "match" | "note" | "visual";
  query: string;
  topic: string;
  landscapes: string[];
};

const SCHEMA = {
  type: "object",
  properties: {
    intent: { type: "string", enum: ["answer", "compare", "match", "note", "visual"] },
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
- intent: "compare" when the reader asks to compare, contrast or set side by side two or more of the landscapes above on some aspect. "match" when the reader describes a problem, situation or need and asks which programmes, solutions or approaches could help, or who has done something similar elsewhere. "note" when the reader asks for a note, summary, brief or one-pager on a topic. "visual" when the reader asks for a chart, graph, breakdown, diagram or flow. Otherwise "answer", including any question about a single landscape.
- query: the latest question rewritten as one standalone search query. Resolve follow-ups ("and in Vempalli?", "what about cost?") from the conversation, and keep names, numbers and key terms.
- topic: for "compare", the aspect being compared in a few words (e.g. "water budgets"); for "note" and "visual", the subject in a few words. Otherwise "".
- landscapes: slugs from the list above that the question names or clearly refers to, including through the conversation. Otherwise [].`;
}

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

export async function classifyQuestion(question: string, history: StreamTurn[], signal: AbortSignal): Promise<Intent> {
  const fallback: Intent = { intent: "answer", query: question, topic: "", landscapes: [] };
  try {
    const transcript = history
      .slice(-6)
      .map((t) => `${t.role === "user" ? "Reader" : "Assistant"}: ${String(t.content).slice(0, 600)}`)
      .join("\n");
    const r = await claudeMessage("ask_rewrite", {
      system: prompt(),
      messages: [{ role: "user", content: `${transcript ? `${transcript}\n\n` : ""}Latest question: ${question}` }],
      jsonSchema: SCHEMA,
      signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
    });
    const p = safeJsonParse<Partial<Intent>>(r.text);
    if (!p) return fallback;
    const intent = (["compare", "match", "note", "visual"] as const).find((x) => x === p.intent) ?? "answer";
    const query = typeof p.query === "string" && p.query.trim() && p.query.length <= 400 ? p.query.trim() : question;
    const landscapes = Array.isArray(p.landscapes)
      ? [...new Set(p.landscapes.filter((s): s is string => typeof s === "string" && !!LANDSCAPES[s]))]
      : [];
    const topic = typeof p.topic === "string" ? p.topic.trim().slice(0, 120) : "";
    return { intent, query, topic, landscapes };
  } catch (e) {
    if (!(e instanceof BudgetExceededError) && !signal.aborted) console.error("[ask_v2] intent failed:", (e as Error).message);
    return fallback; // a plain answer on the raw question still works
  }
}
