/**
 * Ask languages: one row per language (Sandeep, 21 Nov: "when someone speaks
 * Hindi, the Hub should reply in Hindi automatically"). Shared by the browser
 * (speech-to-text hints, speech voice language, the picker) and the server
 * (which language Claude answers in). Adding Telugu, Bengali, Marathi or
 * Tamil is one row each: the script range, the STT hint, the TTS language (if
 * Soniox speaks it), the picker label and the reply instruction.
 */

export type LangCode = "en" | "hi";

export type Language = {
  code: LangCode;
  /** Picker label, in the language itself. */
  label: string;
  /** English name, for prompts. */
  name: string;
  /** Soniox stt-rt language hint. */
  sttHint: string;
  /** Soniox tts-rt language, or null when the Hub can't speak it (text only). */
  tts: string | null;
  /** The language's own script, for detecting typed text. Null for Latin-script English. */
  script: RegExp | null;
  /** Common romanised words ("kitna", "hai"), so typed Hinglish counts as this language. */
  romanised?: Set<string>;
  /** Added to Claude's answer instruction (null for English: no instruction). */
  answerIn: string | null;
  /** "Not in the library" text. */
  refusal: string;
  /** One-line replies to conversational turns (lib/ask/smalltalk.ts). */
  smallTalk: { closing: string; closingVoice: string; thanks: string; greeting: string; ack: string };
};

const HINDI_ROMAN = new Set(
  (
    "hai hain tha thi hoga hogi kya kyu kyun kyon kaise kaisa kaisi kitna kitni kitne kab kahan kaha kaun kis kisne kisko " +
    "mein mai hum ham aap tum ko ka ki ke se pe tak liye lie bhi nahi nahin aur ya lekin magar agar to toh " +
    "kar karo karna karte karta karti kiya kiye gaya gayi raha rahe rahi wala wale wali yeh ye woh wo iska uska inka unka " +
    "batao bataiye bataye boliye bane bana bani banaya hua hue hui diya liya lagta hota hoti hote sakte sakta sakti karenge milega milenge gaye samjhao chahiye chahte milta milti milega paisa paise kharcha kheti kisan pani jameen zameen " +
    "gaon gaanv sabse zyada jyada kam bahut kuch sab koi jo jab tab abhi phir fir accha theek thik haan ji naam"
  ).split(" "),
);

export const LANGUAGES: Record<LangCode, Language> = {
  en: {
    code: "en",
    label: "English",
    name: "English",
    sttHint: "en",
    tts: "en",
    script: null,
    answerIn: null,
    refusal:
      "The library doesn't have this yet. It holds the CAT landscape investment plans and their intervention budgets. Try asking about a landscape's water, soil, livestock, livelihoods or funding plans.",
    smallTalk: {
      closing: "Glad to help. Ask again any time.",
      closingVoice: "Glad to help. Ending the conversation now.",
      thanks: "You're welcome. Ask me anything else about the landscape plans.",
      greeting: "Hello. Ask me about any of the landscape plans, for example Patratu's livestock or Rajnagar's water budget.",
      ack: "Okay. What would you like to know next?",
    },
  },
  hi: {
    code: "hi",
    label: "हिन्दी",
    name: "Hindi",
    sttHint: "hi",
    tts: "hi",
    script: /[ऀ-ॿ]/u,
    romanised: HINDI_ROMAN,
    answerIn:
      "The reader asked in Hindi: write the whole answer in Hindi, in Devanagari script. The search results are in English; translate what they say, and never copy an English sentence or clause into the answer. Only these stay as the results write them: landscape names, scheme and programme names, and every ₹, Rs, crore, lakh and percentage figure. Keep the citation markers.",
    refusal:
      "यह जानकारी अभी लाइब्रेरी में नहीं है। लाइब्रेरी में CAT लैंडस्केप निवेश योजनाएँ और उनके बजट हैं। किसी लैंडस्केप के पानी, मिट्टी, पशुधन, आजीविका या फंडिंग के बारे में पूछिए।",
    smallTalk: {
      closing: "मदद करके अच्छा लगा। कभी भी फिर पूछिए।",
      closingVoice: "धन्यवाद, बातचीत समाप्त कर रहा हूँ।",
      thanks: "आपका स्वागत है। लैंडस्केप योजनाओं के बारे में कुछ और पूछना हो तो पूछिए।",
      greeting: "नमस्ते। किसी भी लैंडस्केप योजना के बारे में पूछिए, जैसे पतरातू का पशुधन या राजनगर का पानी का बजट।",
      ack: "ठीक है। आगे क्या जानना चाहेंगे?",
    },
  },
};

export const LANG_CODES = Object.keys(LANGUAGES) as LangCode[];

/** Shown in the picker but not spoken: Soniox TTS doesn't list them. */
export const TEXT_ONLY_LANGUAGES: { code: string; label: string; name: string }[] = [{ code: "or", label: "ଓଡ଼ିଆ", name: "Odia" }];

/** The instruction to append to a prompt so Claude writes its prose in the reader's language ("" for English). */
export function replyInstruction(lang: LangCode | undefined): string {
  const a = lang ? LANGUAGES[lang].answerIn : null;
  return a ? ` ${a}` : "";
}

export function isLangCode(v: unknown): v is LangCode {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(LANGUAGES, v);
}

/** Every STT hint, English first (the stt-rt language_hints list). */
export function sttHints(): string[] {
  return LANG_CODES.map((c) => LANGUAGES[c].sttHint);
}

/** Map a Soniox token language tag ("hi", "en", "hi-IN") to a supported language, or null. */
export function fromTag(tag: string | undefined | null): LangCode | null {
  if (!tag) return null;
  const base = tag.toLowerCase().split(/[-_]/)[0];
  return LANG_CODES.find((c) => LANGUAGES[c].sttHint === base) ?? null;
}

/**
 * Which language one word belongs to: its script, then a speech tag, then the
 * romanised word list. Capitalised Latin words (place and scheme names) and
 * numbers count for no language. English is what's left.
 */
function wordLanguage(word: string, tag?: LangCode | null): LangCode | null {
  for (const c of LANG_CODES) if (LANGUAGES[c].script?.test(word)) return c;
  const w = word.toLowerCase().replace(/[^a-z']/g, "");
  if (!w) return null;
  for (const c of LANG_CODES) if (LANGUAGES[c].romanised?.has(w)) return c;
  if (tag && tag !== "en") return tag;
  if (/^[A-Z]/.test(word)) return null;
  return "en";
}

/**
 * Most words decide: Hinglish counts as Hindi when most of its words are
 * Hindi. One word in another script is enough on its own ("धन्यवाद"); romanised
 * text needs at least two of that language's words.
 */
function decide(words: { lang: LangCode | null; script: boolean }[]): LangCode {
  const count: Partial<Record<LangCode, number>> = {};
  const scripted = new Set<LangCode>();
  for (const w of words) {
    if (!w.lang) continue;
    count[w.lang] = (count[w.lang] ?? 0) + 1;
    if (w.script) scripted.add(w.lang);
  }
  const en = count.en ?? 0;
  let best: LangCode = "en";
  let bestN = 0;
  for (const c of LANG_CODES) {
    if (c === "en") continue;
    const n = count[c] ?? 0;
    const wins = scripted.has(c) ? n > en || (n > 0 && en === 0) : n >= 2 && n >= en;
    if (wins && n > bestN) {
      best = c;
      bestN = n;
    }
  }
  return best;
}

const isScript = (w: string) => LANG_CODES.some((c) => LANGUAGES[c].script?.test(w));

/** The language of typed text (English when unsure). */
export function detectLanguage(text: string): LangCode {
  const words = text.split(/[\s.,!?;:()"।|]+/).filter(Boolean);
  return decide(words.map((w) => ({ lang: wordLanguage(w), script: isScript(w) })));
}

/**
 * The dominant language of one spoken turn from Soniox's tokens. Tokens are
 * word pieces: a piece starting with a space starts a new word, which takes
 * the language tag of its first piece.
 */
export function dominantLanguage(tokens: { text: string; language?: string | null }[]): LangCode {
  const words: { text: string; tag: LangCode | null }[] = [];
  for (const t of tokens) {
    const startsWord = !words.length || /^\s/.test(t.text);
    const piece = t.text.trim();
    if (!piece) continue;
    if (startsWord) words.push({ text: piece, tag: fromTag(t.language) });
    else words[words.length - 1].text += piece;
  }
  return decide(
    words.flatMap((w) => w.text.split(/[.,!?;:()"।|]+/).filter(Boolean).map((part) => ({ lang: wordLanguage(part, w.tag), script: isScript(part) }))),
  );
}
