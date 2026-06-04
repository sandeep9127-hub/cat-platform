/**
 * The 10 CAT intervention categories — the single source of truth for the
 * Solutions Atlas taxonomy. Borrowed from the 5.2 Landscape Investment Plan
 * categories so the whole platform speaks one language (minus "Common services
 * for value chains"; plus Energy). Landscapes are handled separately.
 *
 * Both the landing-page counters and the Atlas filter derive from
 * `solution_factsheets.themes`, so the numbers always tally.
 */
export type Category = { slug: string; name: string; short: string; colourHex: string };

export const CATEGORIES: Category[] = [
  { slug: "agri-horti-agroforestry", name: "Agriculture, Horticulture & Agroforestry", short: "Agri & Agroforestry", colourHex: "#8C7A5C" },
  { slug: "forestry-ntfp", name: "Forestry & NTFP", short: "Forestry & NTFP", colourHex: "#5C8C2E" },
  { slug: "livestock", name: "Livestock Management", short: "Livestock", colourHex: "#C68C2E" },
  { slug: "fisheries", name: "Fisheries", short: "Fisheries", colourHex: "#2C7BD0" },
  { slug: "nrm", name: "Natural Resource Management", short: "NRM", colourHex: "#2E7573" },
  { slug: "biodiversity", name: "Biodiversity", short: "Biodiversity", colourHex: "#2EA37A" },
  { slug: "nutrition", name: "Nutrition", short: "Nutrition", colourHex: "#C24A2E" },
  { slug: "market", name: "Market", short: "Market", colourHex: "#5C6796" },
  { slug: "energy", name: "Energy", short: "Energy", colourHex: "#D9A655" },
  { slug: "technical-assistance", name: "Technical Assistance", short: "Technical Assistance", colourHex: "#929CC5" },
];

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug);
export const CATEGORY_BY_SLUG: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, c])
);

export function categoryName(slug: string): string {
  return CATEGORY_BY_SLUG[slug]?.name ?? slug;
}
