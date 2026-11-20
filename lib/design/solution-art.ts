/**
 * Field-guide art for Solutions Atlas fact sheets: one line-and-wash drawing
 * per Atlas theme, plus four small pathway drawings for the "at a glance"
 * frame. Shared by the web page and the PDF so every fact sheet, including
 * ones curated later, gets its drawing automatically from its themes; no
 * per-sheet step. Sources and re-render steps:
 * docs/illustrations/solution-heroes/README.md.
 *
 * Adding a new theme: add its slug here and render <slug>.webp (web) and
 * pdf/<slug>.png (PDF) into public/illustrations/solutions/.
 */
export const SOLUTION_ART_THEMES = [
  "agri-horti-agroforestry", "forestry-ntfp", "livestock", "fisheries", "nrm",
  "biodiversity", "nutrition", "market", "energy", "technical-assistance",
] as const;

const FALLBACK = "agri-horti-agroforestry";
const HAS_ART = new Set<string>(SOLUTION_ART_THEMES);

/** The theme whose drawing leads the sheet: its first theme that has art. */
export function solutionArtTheme(themes: string[] | null | undefined): string {
  return (themes ?? []).find((t) => HAS_ART.has(t)) ?? FALLBACK;
}

export const solutionHeroWeb = (themes: string[] | null | undefined) =>
  `/illustrations/solutions/${solutionArtTheme(themes)}.webp`;
export const solutionHeroPdf = (themes: string[] | null | undefined) =>
  `/illustrations/solutions/pdf/${solutionArtTheme(themes)}.png`;

/** Pathway drawing used beside each part of the four-part insight frame. */
export const GLANCE_ART = {
  "What's working": "research",
  "What's hard": "markets",
  "Why it matters": "nutrition",
  "What's next": "landscape",
} as const;
export type GlanceKey = keyof typeof GLANCE_ART;

export const glanceIconWeb = (k: GlanceKey) => `/illustrations/solutions/icons/${GLANCE_ART[k]}.webp`;
export const glanceIconPdf = (k: GlanceKey) => `/illustrations/solutions/pdf/icon-${GLANCE_ART[k]}.png`;
