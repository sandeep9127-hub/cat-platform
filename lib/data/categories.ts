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

// Case-insensitive lookup from any reasonable human spelling to the canonical
// slug: the slug itself, the display name, the short label, plus a few common
// aliases an editor might type by hand. Built once at module load.
const CATEGORY_LOOKUP: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  const put = (k: string, slug: string) => {
    m[k.trim().toLowerCase().replace(/\s+/g, " ")] = slug;
  };
  for (const c of CATEGORIES) {
    put(c.slug, c.slug);
    put(c.name, c.slug);
    put(c.short, c.slug);
  }
  const aliases: Record<string, string> = {
    fishery: "fisheries",
    fish: "fisheries",
    aquaculture: "fisheries",
    agriculture: "agri-horti-agroforestry",
    horticulture: "agri-horti-agroforestry",
    agroforestry: "agri-horti-agroforestry",
    agri: "agri-horti-agroforestry",
    forestry: "forestry-ntfp",
    ntfp: "forestry-ntfp",
    "natural resource management": "nrm",
    water: "nrm",
    soil: "nrm",
    watershed: "nrm",
    markets: "market",
    "value chain": "market",
    "value chains": "market",
    "technical assistance": "technical-assistance",
    training: "technical-assistance",
    extension: "technical-assistance",
    "capacity building": "technical-assistance",
  };
  for (const [k, v] of Object.entries(aliases)) put(k, v);
  return m;
})();

/**
 * Canonicalise hand-entered category strings to valid Atlas slugs. This is the
 * single guard that keeps a manual edit (e.g. "Fisheries" with a capital F)
 * from saving a value the Atlas filter and category counts can never match.
 * Case-insensitive, alias-aware, de-duplicated, order-preserving; anything
 * that doesn't resolve to a known category is dropped rather than polluting
 * the taxonomy.
 */
export function normalizeCategorySlugs(input: string[]): string[] {
  const out: string[] = [];
  for (const raw of input) {
    const key = String(raw ?? "").trim().toLowerCase().replace(/\s+/g, " ");
    if (!key) continue;
    const slug = CATEGORY_LOOKUP[key];
    if (slug && !out.includes(slug)) out.push(slug);
  }
  return out;
}
