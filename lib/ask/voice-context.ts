import { LANDSCAPES } from "@/lib/data/landscapes";

/**
 * Speech-to-text vocabulary for Ask voice (Soniox `context`, stt-rt-v6).
 * Unusual names benefit most: without them "Patratu" was heard as
 * "P-A-T-T-R-A-T-U" and "Patriarchal". Built from the landscape data so new
 * landscapes are included automatically. Sent to the browser with the
 * session key; the browser passes it in the STT start message.
 */

const DOMAIN_TERMS = [
  "agroecology", "agroecological", "landscape investment plan", "LIP", "CAT", "HLPE", "Solutions Atlas",
  "Krishi Sakhi", "Pashu Sakhi", "Gram Panchayat", "Gram Sabha", "FPO", "FPC", "SHG", "CBO", "CSO", "NTFP", "WADI",
  "MGNREGA", "PMKSY", "PM-KUSUM", "NRLM", "JSLPS", "NABARD", "Jal Jeevan Mission", "crore", "lakh", "kharif", "rabi",
  "millets", "mahua", "farm pond", "check dam", "vermicompost", "bio-input", "seed bank", "Adivasi",
];

/** Place-name parts worth teaching: "Dang district" → "Dang"; "Bundelkhand, Uttar Pradesh" → both. */
function placeTerms(): string[] {
  const out = new Set<string>();
  for (const l of Object.values(LANDSCAPES)) {
    out.add(l.name);
    for (const part of l.name.split(/[–-]/)) if (part.trim()) out.add(part.trim());
    for (const piece of [l.district, l.region]) {
      for (const p of piece.split(/[,()]/)) {
        const clean = p.replace(/\b(district|subdivision|formerly|plateau|delta)\b/gi, "").replace(/\s+/g, " ").trim();
        if (clean.length >= 3) out.add(clean);
      }
    }
  }
  return [...out];
}

/** Landscape names the browser snaps near-misses to (both parts of hyphenated names). */
export function voicePlaceNames(): string[] {
  const out = new Set<string>();
  for (const l of Object.values(LANDSCAPES)) {
    for (const part of l.name.split(/[–-]/)) if (part.trim().length >= 3) out.add(part.trim());
  }
  return [...out];
}

export function sttContext() {
  const names = Object.values(LANDSCAPES).map((l) => l.name);
  return {
    general: [
      { key: "domain", value: "Agroecology and landscape investment plans in India" },
      { key: "topic", value: "Questions about CAT landscapes, their budgets, interventions and funding" },
    ],
    text: `People ask the CAT Transformation Hub about rural landscapes in India: ${names.join(", ")}. They ask about farming, water, livestock, forests, women's groups, budgets in crore and lakh, and government schemes, in Indian English or Hindi.`,
    terms: [...new Set([...placeTerms(), ...DOMAIN_TERMS])],
  };
}
