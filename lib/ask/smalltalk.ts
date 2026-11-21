/**
 * Conversational turns ("thanks", "we can stop", "theek hai") never go to the
 * library: no search, no Claude call, no "Not in the library" card. A turn
 * counts only when every clause in it is conversational, so "thanks, and what
 * about Mau?" is still a real question.
 */

export type SmallTalk = "closing" | "thanks" | "greeting" | "ack";

const PHRASES: Record<SmallTalk, string[]> = {
  closing: [
    "stop", "we can stop", "you can stop", "let's stop", "lets stop", "please stop", "stop now", "that's all", "thats all",
    "that is all", "that's it", "thats it", "that is it", "bye", "bye bye", "goodbye", "good bye", "see you", "see you later",
    "end", "end it", "end the conversation", "end conversation", "end the chat", "no more questions", "nothing else",
    "i'm done", "im done", "i am done", "we're done", "were done", "we are done", "done for now", "enough", "enough for now",
    "bas", "bas itna hi", "bas itna", "bas karo", "bas ho gaya", "alvida", "chalo bye", "phir milte hain",
    "बस", "बस इतना ही", "बस करो", "अलविदा", "फिर मिलते हैं",
  ],
  thanks: [
    "thanks", "thank you", "thank you so much", "thanks a lot", "many thanks", "thank you very much", "thanks so much",
    "much appreciated", "appreciate it", "dhanyavaad", "dhanyavad", "dhanyawad", "dhanyawaad", "shukriya", "bahut shukriya",
    "bahut dhanyavaad", "thank u", "thx", "ty", "धन्यवाद", "शुक्रिया", "बहुत धन्यवाद", "बहुत शुक्रिया",
  ],
  greeting: [
    "hi", "hello", "hey", "hello there", "hi there", "good morning", "good afternoon", "good evening", "namaste", "namaskar",
    "pranam", "नमस्ते", "नमस्कार", "प्रणाम",
  ],
  ack: [
    "ok", "okay", "okey", "oki", "alright", "all right", "fine", "good", "great", "nice", "cool", "perfect", "wonderful",
    "excellent", "very good", "very nice", "good good", "got it", "understood", "i see", "makes sense", "sure", "yes", "yeah",
    "no", "nope", "hmm", "mm", "right", "correct", "ok great", "okay great", "all good", "noted", "theek hai", "thik hai",
    "theek", "accha", "achha", "acha", "haan", "haan ji", "ji", "ji haan", "sahi hai", "badhiya", "bahut badhiya",
    "ठीक है", "अच्छा", "हाँ", "हां", "जी", "जी हाँ", "सही है", "बढ़िया", "बहुत बढ़िया",
  ],
};

const LOOKUP = new Map<string, SmallTalk>();
for (const [kind, list] of Object.entries(PHRASES) as [SmallTalk, string[]][]) for (const p of list) LOOKUP.set(p, kind);
// Fillers that can sit inside a clause without making it a question.
const FILLER = /\b(please|so|then|now|really|very|much|ji|sir|madam|ma'am|hub|claude|for (your|the) help|for that|for this)\b/g;

function clauses(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .split(/[.!?,;:\n।|]+|\s+-\s+|\band\b|\bthen\b/)
    // \p{M} keeps Devanagari vowel signs (धन्यवाद) intact.
    .map((c) => c.replace(/[^\p{L}\p{M}\p{N}'\s]/gu, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/** Split a clause into known phrases ("ok great thanks" → ack, ack, thanks), or null if any word is left over. */
function segment(clause: string): SmallTalk[] | null {
  const words = clause.split(" ").filter(Boolean);
  if (!words.length) return null;
  const best: (SmallTalk[] | null)[] = Array(words.length + 1).fill(null);
  best[0] = [];
  for (let i = 0; i < words.length; i++) {
    if (!best[i]) continue;
    for (let n = 1; n <= 6 && i + n <= words.length; n++) {
      const kind = LOOKUP.get(words.slice(i, i + n).join(" "));
      if (kind && !best[i + n]) best[i + n] = [...best[i]!, kind];
    }
  }
  return best[words.length];
}

/** The kind of conversational turn, or null when any part of it is a real question. */
export function smallTalk(text: string): SmallTalk | null {
  if (text.length > 140) return null;
  const parts = clauses(text);
  if (!parts.length) return null;
  const kinds: SmallTalk[] = [];
  for (const raw of parts) {
    const found = segment(raw) ?? segment(raw.replace(FILLER, " ").replace(/\s+/g, " ").trim());
    if (!found) return null;
    kinds.push(...found);
  }
  // A closing anywhere wins ("Good. We can stop. Thank you." ends the conversation).
  for (const k of ["closing", "thanks", "greeting", "ack"] as const) if (kinds.includes(k)) return k;
  return null;
}

/** One short line, spoken in voice mode; never a library answer. */
export function smallTalkReply(kind: SmallTalk, opts: { voice: boolean; hindi: boolean }): string {
  if (opts.hindi) {
    return {
      closing: "मदद करके अच्छा लगा। बातचीत यहीं समाप्त करते हैं।",
      thanks: "आपका स्वागत है। योजनाओं के बारे में कुछ और पूछना हो तो पूछिए।",
      greeting: "नमस्ते। किसी भी लैंडस्केप योजना के बारे में पूछिए।",
      ack: "ठीक है। आगे क्या जानना चाहेंगे?",
    }[kind];
  }
  return {
    closing: opts.voice ? "Glad to help. Ending the conversation now." : "Glad to help. Ask again any time.",
    thanks: "You're welcome. Ask me anything else about the landscape plans.",
    greeting: "Hello. Ask me about any of the landscape plans, for example Patratu's livestock or Rajnagar's water budget.",
    ack: "Okay. What would you like to know next?",
  }[kind];
}
