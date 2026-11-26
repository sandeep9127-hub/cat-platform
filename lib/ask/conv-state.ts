import { LANDSCAPES } from "@/lib/data/landscapes";
import { isLangCode, type LangCode } from "@/lib/ask/languages";

/**
 * Voice agent conversation state (docs/voice-agent-plan.md, step 5). What the
 * conversation is about right now, so follow-ups like "and goats?" or "what
 * about the phase 2 cost?" land on the right landscape and topic. One
 * conversation only: stored on cat.conversations.voice_state, never carried
 * across visits.
 */

export type VoiceConvState = {
  /** Landscape slug being discussed, or null. */
  landscape: string | null;
  /** A few words on the topic ("livestock budget"). */
  topic: string;
  /** The last figures the agent said, e.g. "₹54.28 lakh". */
  figures: string[];
  lang: LangCode;
};

const FIGURE_RE = /(?:₹|Rs\.?\s?)\s?[\d,]+(?:\.\d+)?\s?(?:crore|cr|lakh|l|lakhs|crores)?\b|[\d,]+(?:\.\d+)?\s?(?:crore|lakh|hectares|households|villages|%)/gi;

/** Validate a stored state (it comes back from the database as untyped JSON). */
export function readVoiceState(raw: unknown): VoiceConvState | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const landscape = typeof r.landscape === "string" && LANDSCAPES[r.landscape] ? r.landscape : null;
  const topic = typeof r.topic === "string" ? r.topic.slice(0, 120) : "";
  const figures = Array.isArray(r.figures) ? r.figures.filter((f): f is string => typeof f === "string").slice(0, 4).map((f) => f.slice(0, 40)) : [];
  return { landscape, topic, figures, lang: isLangCode(r.lang) ? r.lang : "en" };
}

/**
 * The state after an answer. The landscape comes from the router when it named
 * exactly one, else from the sources the answer actually cited (when they agree),
 * else it carries over.
 */
export function nextVoiceState(
  prev: VoiceConvState | null,
  o: { routedLandscapes: string[]; topic: string; citedLandscapes: (string | null)[]; answer: string; lang: LangCode },
): VoiceConvState {
  let landscape = prev?.landscape ?? null;
  const routed = o.routedLandscapes.filter((s) => LANDSCAPES[s]);
  const cited = [...new Set(o.citedLandscapes.filter((s): s is string => !!s && !!LANDSCAPES[s]))];
  if (routed.length === 1) landscape = routed[0];
  else if (routed.length > 1) landscape = null; // a comparison: no single landscape
  else if (cited.length === 1) landscape = cited[0];
  const figures = [...new Set((o.answer.replace(/\[\d+\]/g, "").match(FIGURE_RE) ?? []).map((f) => f.trim()))].slice(0, 4);
  return {
    landscape,
    topic: (o.topic || prev?.topic || "").slice(0, 120),
    figures: figures.length ? figures : prev?.figures ?? [],
    lang: o.lang,
  };
}

/** One line for the agent's prompt, or "" when there is nothing yet. */
export function voiceStateLine(s: VoiceConvState | null): string {
  if (!s || (!s.landscape && !s.topic && !s.figures.length)) return "";
  const parts = [
    s.landscape ? `landscape: ${LANDSCAPES[s.landscape].name} (${s.landscape})` : "",
    s.topic ? `topic: ${s.topic}` : "",
    s.figures.length ? `figures you last gave: ${s.figures.join(", ")}` : "",
  ].filter(Boolean);
  return ` So far in this conversation, ${parts.join("; ")}. A follow-up that names no landscape or topic is about these; search that landscape if you need more.`;
}
