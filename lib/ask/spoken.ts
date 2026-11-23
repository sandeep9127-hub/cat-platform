/**
 * Speech-friendly text for the voice reply. The on-screen answer keeps its
 * compact forms ("₹65.11 cr"); this turns them into words before text-to-speech,
 * which otherwise reads "₹65.11" as rupees and paise and drops "cr"
 * (Sandeep, 23 Nov: it said "65 rupaya 11 paise").
 */

type Lang = "en" | "hi";

const NUM = String.raw`\d{1,3}(?:,\d{2,3})*(?:\.\d+)?|\d+(?:\.\d+)?`;
const UNIT = String.raw`(?:crores?|cr|lakhs?|lacs?|lakh|l|k|m|bn|mn)`;
const DASH = String.raw`\s*(?:–|—|-|to)\s*`;

const WORD: Record<Lang, { crore: string; lakh: string; rupees: string; to: string; percent: string; hectares: string; households: string; fy: string }> = {
  en: { crore: "crore", lakh: "lakh", rupees: "rupees", to: "to", percent: "percent", hectares: "hectares", households: "households", fy: "financial year" },
  hi: { crore: "करोड़", lakh: "लाख", rupees: "रुपये", to: "से", percent: "प्रतिशत", hectares: "हेक्टेयर", households: "परिवार", fy: "वित्त वर्ष" },
};

function unitWord(u: string, w: (typeof WORD)["en"]): string | null {
  const x = u.toLowerCase();
  if (x.startsWith("cr")) return w.crore;
  if (x.startsWith("la") || x === "l") return w.lakh;
  if (x === "k") return "thousand";
  if (x === "m" || x === "mn") return "million";
  if (x === "bn") return "billion";
  return null;
}

/** "₹10–15 cr" → "10 to 15 crore rupees" (the unit after the second number covers both). */
export function toSpoken(text: string, lang: Lang = "en"): string {
  const w = WORD[lang] ?? WORD.en;
  let s = text;

  // Rupee range with a shared unit: ₹10–15 cr
  s = s.replace(new RegExp(String.raw`₹\s*(${NUM})${DASH}(${NUM})\s*(${UNIT})\b`, "gi"), (m, a, b, u) => {
    const uw = unitWord(u, w);
    return uw ? `${a} ${w.to} ${b} ${uw} ${w.rupees}` : m;
  });
  // Single amount with a unit: ₹65.11 cr
  s = s.replace(new RegExp(String.raw`(?:₹|Rs\.?|INR)\s*(${NUM})\s*(${UNIT})\b`, "gi"), (m, a, u) => {
    const uw = unitWord(u, w);
    return uw ? `${a} ${uw} ${w.rupees}` : m;
  });
  // Plain rupee amount: ₹1,250
  s = s.replace(new RegExp(String.raw`(?:₹|Rs\.?|INR)\s*(${NUM})`, "gi"), (_m, a) => `${a} ${w.rupees}`);
  // A bare "65.11 cr" with no sign
  s = s.replace(new RegExp(String.raw`\b(${NUM})\s*(crores?|cr|lakhs?)\b`, "gi"), (m, a, u) => {
    const uw = unitWord(u, w);
    return uw ? `${a} ${uw}` : m;
  });

  s = s.replace(/(\d)\s*%/g, `$1 ${w.percent}`);
  s = s.replace(/\b(\d[\d,.]*)\s*ha\b/gi, `$1 ${w.hectares}`);
  s = s.replace(/\bHH\b/g, w.households);
  s = s.replace(/\bFY\s?(\d{2,4})(?:[-–](\d{2,4}))?/g, (_m, a, b) => `${w.fy} ${a}${b ? ` ${w.to} ${b}` : ""}`);
  return s;
}
