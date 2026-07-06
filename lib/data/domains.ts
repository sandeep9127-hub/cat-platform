/**
 * Canonical "domains of work" vocabulary for the Organisations Atlas.
 *
 * Free-text domain entry fragments fast ("Livelihood" vs "Livelihoods" vs
 * "livelihood support" all become separate filter chips). This is the single
 * source of truth: the submission form offers these as type-ahead suggestions,
 * and anything a submitter types that ISN'T here is kept as a custom value and
 * surfaced to the admin reviewer to approve or map onto a canonical term — so
 * the library grows cleanly instead of splintering.
 *
 * Seeded from the CAT Landscape Investment Plan taxonomy (5.2 categories +
 * thematic investments) and broadened with common agroecology / food-systems
 * work areas. Labels are the stored, displayed value (kept human-readable and
 * backward-compatible with existing org rows); slugs are stable keys; aliases
 * feed the resolver so reasonable spellings collapse to one canonical label.
 */
export type Domain = { slug: string; label: string; group: string; aliases?: string[] };

export const DOMAIN_GROUPS = [
  "Production systems",
  "Natural resources & climate",
  "Livelihoods & markets",
  "People & systems",
] as const;

export const DOMAINS: Domain[] = [
  // ---- Production systems ----
  { slug: "agroecology-natural-farming", label: "Agroecology & natural farming", group: "Production systems",
    aliases: ["natural farming", "zbnf", "organic farming", "agroecological practice", "regenerative agriculture", "chemical free farming", "chemical-free farming", "apnf", "sustainable agriculture"] },
  { slug: "crop-horticulture", label: "Crops & horticulture", group: "Production systems",
    aliases: ["agriculture", "horticulture", "fruits", "vegetables", "millets", "cropping", "agricultural production"] },
  { slug: "agroforestry", label: "Agroforestry", group: "Production systems",
    aliases: ["trees on farms", "silviculture", "agro forestry", "farm forestry"] },
  { slug: "seed-systems", label: "Seed systems & sovereignty", group: "Production systems",
    aliases: ["seed management", "seed bank", "seed banks", "seed conservation", "indigenous seeds", "seed sovereignty", "seed"] },
  { slug: "soil-health", label: "Soil health & conservation", group: "Production systems",
    aliases: ["soil conservation", "soil fertility", "composting", "soil", "land restoration", "soil health"] },
  { slug: "livestock", label: "Livestock & poultry", group: "Production systems",
    aliases: ["animal husbandry", "dairy", "backyard poultry", "poultry", "goatery", "livestock management", "cattle"] },
  { slug: "fisheries", label: "Fisheries & aquaculture", group: "Production systems",
    aliases: ["fisheries", "aquaculture", "inland fisheries", "fish"] },
  { slug: "forestry-ntfp", label: "Forestry & NTFP", group: "Production systems",
    aliases: ["ntfp", "minor forest produce", "forest regeneration", "afforestation", "forestry", "mfp", "non timber forest produce"] },

  // ---- Natural resources & climate ----
  { slug: "water-watershed", label: "Water & watershed (NRM)", group: "Natural resources & climate",
    aliases: ["watershed", "water management", "irrigation", "water harvesting", "nrm", "natural resource management", "water", "watershed development"] },
  { slug: "commons-land", label: "Commons & land restoration", group: "Natural resources & climate",
    aliases: ["commons", "cpr", "common lands", "common property resources", "pasture", "grazing lands", "land restoration"] },
  { slug: "biodiversity", label: "Biodiversity conservation", group: "Natural resources & climate",
    aliases: ["biodiversity", "agrobiodiversity", "conservation", "agro-biodiversity"] },
  { slug: "climate-resilience", label: "Climate resilience & adaptation", group: "Natural resources & climate",
    aliases: ["climate change", "climate adaptation", "resilience", "drr", "disaster risk reduction", "climate", "climate resilient agriculture"] },
  { slug: "energy", label: "Renewable & decentralised energy", group: "Natural resources & climate",
    aliases: ["energy", "solar", "clean energy", "decentralised energy", "decentralized energy", "renewable energy", "biogas"] },

  // ---- Livelihoods & markets ----
  { slug: "livelihoods", label: "Livelihoods & incomes", group: "Livelihoods & markets",
    aliases: ["livelihood", "income generation", "employment", "incomes", "livelihoods"] },
  { slug: "market-value-chains", label: "Market linkages & value chains", group: "Livelihoods & markets",
    aliases: ["market", "value chain", "value chains", "marketing", "post harvest", "post-harvest", "aggregation", "market linkage", "market linkages"] },
  { slug: "fpo-collectives", label: "FPOs & collectives", group: "Livelihoods & markets",
    aliases: ["fpo", "fpos", "producer organisation", "producer organization", "shg", "self help group", "cooperatives", "farmer collectives", "collectives", "producer company"] },
  { slug: "finance-credit", label: "Finance & credit", group: "Livelihoods & markets",
    aliases: ["finance", "microfinance", "credit", "working capital", "financial inclusion", "banking", "loans"] },
  { slug: "enterprise", label: "Enterprise & entrepreneurship", group: "Livelihoods & markets",
    aliases: ["enterprise", "entrepreneurship", "micro enterprise", "micro-enterprise", "ecotourism", "homestays", "rural enterprise", "startups"] },

  // ---- People & systems ----
  { slug: "nutrition", label: "Nutrition & food security", group: "People & systems",
    aliases: ["nutrition", "food security", "dietary diversity", "kitchen gardens", "nutrition garden", "food systems"] },
  { slug: "gender-inclusion", label: "Gender & social inclusion", group: "People & systems",
    aliases: ["gender", "women empowerment", "social inclusion", "equity", "tribal", "adivasi", "women", "inclusion"] },
  { slug: "capacity-building", label: "Capacity building & training", group: "People & systems",
    aliases: ["capacity building", "training", "extension", "crp", "skilling", "skill development", "community resource person"] },
  { slug: "research-knowledge", label: "Research & knowledge", group: "People & systems",
    aliases: ["research", "knowledge management", "documentation", "mel", "data", "monitoring and evaluation", "knowledge"] },
  { slug: "policy-advocacy", label: "Policy & advocacy", group: "People & systems",
    aliases: ["policy", "advocacy", "governance", "rights", "campaigns"] },
  { slug: "technical-assistance", label: "Technical assistance", group: "People & systems",
    aliases: ["technical assistance", "ta", "advisory", "consulting"] },
  { slug: "wash-health", label: "Water, sanitation & health (WASH)", group: "People & systems",
    aliases: ["wash", "sanitation", "health", "drinking water", "hygiene"] },
];

export const DOMAIN_LABELS = DOMAINS.map((d) => d.label);
export const DOMAIN_BY_SLUG: Record<string, Domain> = Object.fromEntries(DOMAINS.map((d) => [d.slug, d]));

const normalize = (s: string) =>
  s.trim().toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();

// normalized-key → canonical label. Built from slug, label, group-free aliases.
const LOOKUP: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const d of DOMAINS) {
    m[normalize(d.slug)] = d.label;
    m[normalize(d.label)] = d.label;
    for (const a of d.aliases ?? []) m[normalize(a)] = d.label;
  }
  return m;
})();

/** Resolve any reasonable spelling to a canonical library label, or null if unknown. */
export function resolveDomain(text: string): string | null {
  return LOOKUP[normalize(text)] ?? null;
}

/** True when the text maps to a library term (used to flag custom entries for review). */
export function isLibraryDomain(text: string): boolean {
  return resolveDomain(text) !== null;
}

/**
 * Rank library suggestions for a query. Empty query returns all (grouped order).
 * Matches canonical label first, then aliases; prioritises prefix over substring.
 */
export function suggestDomains(query: string, exclude: string[] = []): Domain[] {
  const excluded = new Set(exclude.map((e) => resolveDomain(e) ?? e.toLowerCase().trim()));
  const isExcluded = (d: Domain) => excluded.has(d.label) || excluded.has(d.label.toLowerCase());
  const q = normalize(query);
  if (!q) return DOMAINS.filter((d) => !isExcluded(d));
  const scored: { d: Domain; score: number }[] = [];
  for (const d of DOMAINS) {
    if (isExcluded(d)) continue;
    const hay = [d.label, ...(d.aliases ?? [])].map(normalize);
    let best = Infinity;
    for (const h of hay) {
      if (h === q) best = Math.min(best, 0);
      else if (h.startsWith(q)) best = Math.min(best, 1);
      else if (h.includes(q)) best = Math.min(best, 2);
    }
    if (best < Infinity) scored.push({ d, score: best });
  }
  return scored.sort((a, b) => a.score - b.score).map((s) => s.d);
}
