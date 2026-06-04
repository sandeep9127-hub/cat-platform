/**
 * The 13 consolidated principles of agroecology (HLPE 2019 / Wezel et al. 2020).
 * Definitions and body text adapted from agroecology-europe.org and the HLPE
 * consolidated set. Each `icon` is line-icon inner SVG markup on a 24x24 grid.
 *
 * Two scales of transformation:
 *   - Principles 1–7  → AGROECOSYSTEM level (field & farm)
 *   - Principles 8–13 → FOOD-SYSTEM level (knowledge, culture, fairness, power)
 *
 * The "inIndia" note and "levers" are the Transformation Hub's own editorial
 * additions — they link the abstract principle to live programmes in India.
 *
 * Source: HLPE Report 14 (2019), UN Committee on World Food Security.
 *   https://www.fao.org/3/ca5602en/ca5602en.pdf
 */

export type TransformationLevel = "agro" | "food";

export type Principle = {
  n: number;
  slug: string;
  title: string;
  /** Operational sub-group from the HLPE consolidation. */
  group: string;
  level: TransformationLevel;
  /** Official one-line definition. */
  definition: string;
  /** Expanded paragraph. */
  body: string;
  /** Hub editorial: how this shows up in Indian landscapes. */
  inIndia: string;
  /** Hub editorial: practical levers. */
  levers: string[];
  /** Inner SVG markup, 24x24 grid, stroke-based line icon. */
  icon: string;
};

export const LEVELS: Record<
  TransformationLevel,
  { key: TransformationLevel; label: string; short: string; range: string; blurb: string }
> = {
  agro: {
    key: "agro",
    label: "Agroecosystem transformation",
    short: "Agroecosystem",
    range: "Principles 1–7",
    blurb:
      "Re-designing the field and farm — its biology, resources and ecological interactions.",
  },
  food: {
    key: "food",
    label: "Food-system transformation",
    short: "Food system",
    range: "Principles 8–13",
    blurb:
      "Re-shaping the wider system — knowledge, culture, fairness and who holds power.",
  },
};

export function levelOf(n: number): TransformationLevel {
  return n <= 7 ? "agro" : "food";
}

export const PRINCIPLES: Principle[] = [
  {
    n: 1,
    slug: "recycling",
    title: "Recycling",
    group: "Resource efficiency",
    level: "agro",
    definition:
      "Preferentially use local renewable resources and close, as far as possible, resource cycles of nutrients and biomass.",
    body: "Recycling keeps nutrients, biomass and water moving within the farm rather than leaking out of it. By composting residues, returning manure to fields and reusing on-farm materials, growers cut waste and dependence on external inputs while regenerating the resource base their production depends on.",
    inIndia:
      "Composting, vermicomposting, and on-farm biofertilisers like jeevamrutham. Crop residue and manure cycled back into soil instead of burnt or sold.",
    levers: ["On-farm composting", "Biofertilisers", "Crop-livestock integration"],
    icon: '<path d="M7 19H4.8a1.83 1.83 0 0 1-1.57-2.66L7.2 9.5"/><path d="M11 19h8.2a1.83 1.83 0 0 0 1.55-2.66l-1.22-2.12"/><path d="m14 16-3 3 3 3"/><path d="M8.3 13.6 7.2 9.5 3.1 10.6"/><path d="m9.34 5.81 1.1-1.9a1.83 1.83 0 0 1 3.1 0l3.94 6.84"/><path d="m13.38 9.63 4.1 1.1 1.1-4.1"/>',
  },
  {
    n: 2,
    slug: "input-reduction",
    title: "Input reduction",
    group: "Resource efficiency",
    level: "agro",
    definition:
      "Reduce or eliminate dependency on purchased inputs and increase self-sufficiency.",
    body: "Cutting reliance on bought-in fertilisers, pesticides and energy lowers cost and exposure to volatile markets. Careful design of diverse, synergistic systems lets free natural processes — sunlight, biological nitrogen fixation, predation — do work that purchased inputs would otherwise do.",
    inIndia:
      "The headline lever for Andhra Pradesh Community-managed Natural Farming (APCNF), now reaching over 800,000 farmers. Synthetic inputs replaced with farm-made preparations.",
    levers: ["Natural farming", "Botanical pest management", "Seed sovereignty"],
    icon: '<path d="M16 17h6v-6"/><path d="m22 17-8.5-8.5-5 5L2 7"/>',
  },
  {
    n: 3,
    slug: "soil-health",
    title: "Soil health",
    group: "Resilience",
    level: "agro",
    definition:
      "Secure and enhance soil health and functioning for improved plant growth, particularly by managing organic matter and enhancing soil biological activity.",
    body: "Soils are the living foundation of food production. Building organic matter, protecting structure and feeding soil biology improves fertility, water-holding capacity and resilience to drought and erosion — the basis of every other outcome on the farm.",
    inIndia:
      "Cover cropping, mulching, multi-species green manures, reduced tillage. Soil organic carbon ties climate, water, and yield outcomes together.",
    levers: ["Living root cover", "Mulching", "Reduced tillage"],
    icon: '<path d="M12 18V8.5"/><path d="M12 9.5C12 6.5 9.8 5 7 5c0 3 2.2 4.5 5 4.5z"/><path d="M12 11.5c0-2.4 1.8-3.8 4.2-3.8 0 2.4-1.8 3.8-4.2 3.8z"/><path d="M4 18.5h16"/><path d="M5.5 21.5h2M10.5 21.5h3M16.5 21.5h2"/>',
  },
  {
    n: 4,
    slug: "animal-health",
    title: "Animal health",
    group: "Resilience",
    level: "agro",
    definition: "Ensure animal health and welfare across the agroecosystem.",
    body: "Healthy, well-kept animals are more productive and need fewer veterinary inputs. Meeting animals' behavioural and physiological needs — space, appropriate diets, low stress — improves welfare and integrates livestock soundly into the wider farm system.",
    inIndia:
      "Indigenous breeds adapted to local feed and climate. Pasture-based and silvopastoral systems. Ethnoveterinary practice reducing antibiotic reliance.",
    levers: ["Indigenous breeds", "Silvopasture", "Ethnoveterinary care"],
    icon: '<path d="M6 8.5C4.3 8 3 6.6 3.2 5c1.6-.2 3.1.7 3.7 2.2"/><path d="M18 8.5C19.7 8 21 6.6 20.8 5c-1.6-.2-3.1.7-3.7 2.2"/><path d="M6.6 9C6.6 6.9 9 5.5 12 5.5s5.4 1.4 5.4 3.5c0 1.2-.4 1.9-.5 3a4.9 4.9 0 0 1-9.8 0c-.1-1.1-.5-1.8-.5-3z"/><path d="M9.3 14.2a4 4 0 0 0 5.4 0"/><path d="M10.2 9.9h.01M13.8 9.9h.01"/><path d="M10.6 12.6h.01M13.4 12.6h.01"/>',
  },
  {
    n: 5,
    slug: "biodiversity",
    title: "Biodiversity",
    group: "Resilience",
    level: "agro",
    definition:
      "Maintain and enhance diversity of species, functional diversity and genetic resources, sustaining biodiversity in time and space at field, farm and landscape scales.",
    body: "Diversity is agroecology's engine of stability. A mix of crops, varieties, animals and wild species spreads risk, supports pollination and pest control, and keeps the agroecosystem productive across seasons and shocks.",
    inIndia:
      "Mixed cropping, traditional millets, sacred groves, on-farm seed banks. Navdanya and Sahaja Samrudha steward thousands of farmer-saved varieties.",
    levers: ["Mixed cropping", "Seed banks", "Habitat corridors"],
    icon: '<path d="M12 21v-8.5"/><path d="M12 14.5c-.3-3.2-2.6-5-5.4-4.9C6.3 12.7 8.6 14.5 12 14.5z"/><path d="M12 12.5c2-.1 3.7-1.7 4-4-2.1.1-3.7 1.7-4 4z"/><circle cx="12" cy="6.7" r="2.5"/>',
  },
  {
    n: 6,
    slug: "synergy",
    title: "Synergy",
    group: "Resilience",
    level: "agro",
    definition:
      "Enhance positive ecological interaction, synergy, integration and complementarity among the elements of agroecosystems — animals, crops, trees, soil and water.",
    body: "When the parts of a farm reinforce each other — trees sheltering crops, livestock fertilising fields, legumes feeding cereals — the whole produces more than its parts. Designing for synergy turns interactions into productivity instead of conflict.",
    inIndia:
      "Tank-fed paddy with fish, agroforestry on bunds, integrated farming systems pioneered by BAIF and PRADAN. The whole producing more than the parts.",
    levers: ["Crop-tree-livestock integration", "Tank aquaculture", "Agroforestry"],
    icon: '<circle cx="12" cy="8.2" r="4.3"/><circle cx="8.2" cy="14.8" r="4.3"/><circle cx="15.8" cy="14.8" r="4.3"/>',
  },
  {
    n: 7,
    slug: "economic-diversification",
    title: "Economic diversification",
    group: "Resilience",
    level: "agro",
    definition:
      "Diversify on-farm incomes so that producers have greater financial independence and value-addition opportunities, and can respond to consumer demand.",
    body: "Relying on a single crop or buyer is fragile. Multiple income streams — varied products, processing, direct sales — give farmers stability against price swings and weather, and more autonomy in how they run their enterprise.",
    inIndia:
      "Producer-owned value addition — millet flours, oil mills, dairy collectives. FPOs like Sahyadri Farms moving into processing and direct-to-consumer markets.",
    levers: ["Producer companies", "On-farm processing", "Direct-to-consumer"],
    icon: '<circle cx="4.5" cy="12" r="1.9"/><path d="M6.4 12h2.1"/><path d="M8.5 12c2.6 0 3-4.8 6.3-4.8"/><path d="M8.5 12h6.3"/><path d="M8.5 12c2.6 0 3 4.8 6.3 4.8"/><circle cx="16.8" cy="7.2" r="1.9"/><circle cx="17" cy="12" r="1.9"/><circle cx="16.8" cy="16.8" r="1.9"/>',
  },
  {
    n: 8,
    slug: "co-creation-of-knowledge",
    title: "Co-creation of knowledge",
    group: "Social equity & responsibility",
    level: "food",
    definition:
      "Enhance the co-creation and horizontal sharing of knowledge, including local and scientific innovation, especially through farmer-to-farmer exchange.",
    body: "Agroecology advances when farmers, researchers and communities learn together. Combining traditional know-how with science, and spreading it peer-to-peer, produces solutions that fit local conditions far better than top-down prescriptions.",
    inIndia:
      "Farmer field schools, community resource persons, knowledge networks like WASSAN and AMEF. The farmer is researcher, not recipient.",
    levers: ["Farmer field schools", "Community resource persons", "Participatory research"],
    icon: '<path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2z"/><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"/>',
  },
  {
    n: 9,
    slug: "social-values-and-diets",
    title: "Social values & diets",
    group: "Social equity & responsibility",
    level: "food",
    definition:
      "Build food systems based on the culture, identity, tradition, and social and gender equity of local communities, providing healthy, diversified, seasonally and culturally appropriate diets.",
    body: "Food is more than calories — it carries culture and identity. Agroecology honours local traditions and equity, supplying diverse, seasonal and nourishing diets that communities recognise as their own.",
    inIndia:
      "Millet revival, school meals anchored in local foods, the Deccan Development Society's three decades with Dalit women around millet sovereignty.",
    levers: ["Millet mainstreaming", "Public food procurement", "Mid-day meal redesign"],
    icon: '<path d="M3 11.5h18a9 9 0 0 1-18 0z"/><path d="M9 8.5c-.8-.8-.8-1.7 0-2.5s.8-1.7 0-2.5"/><path d="M13 8.5c-.8-.8-.8-1.7 0-2.5s.8-1.7 0-2.5"/>',
  },
  {
    n: 10,
    slug: "fairness",
    title: "Fairness",
    group: "Social equity & responsibility",
    level: "food",
    definition:
      "Support dignified and robust livelihoods for all actors in food systems, especially small-scale producers, based on fair trade, fair employment and fair treatment of intellectual property.",
    body: "A just food system rewards everyone who sustains it. Fair prices, decent working conditions and respect for producers' rights and knowledge ensure the people who grow food can thrive, not merely survive.",
    inIndia:
      "Fair Trade premiums, women-led collectives, MGNREGA-aligned natural resource works that pay communities for ecological labour.",
    levers: ["Fair trade premiums", "Women collectives", "Living wages"],
    icon: '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
  },
  {
    n: 11,
    slug: "connectivity",
    title: "Connectivity",
    group: "Social equity & responsibility",
    level: "food",
    definition:
      "Ensure proximity and confidence between producers and consumers through fair and short distribution networks, re-embedding food systems in local economies.",
    body: "Shorter chains rebuild trust between the people who grow food and those who eat it. Local markets, box schemes and direct sales keep value in the community and give consumers a real connection to how their food is produced.",
    inIndia:
      "Farmers' markets, organic bazaars, CSA models, the Sahaja Aharam producer-consumer cooperative in Telangana. Cutting aggregators while keeping traceability.",
    levers: ["CSA models", "Farmers' markets", "Direct procurement"],
    icon: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/>',
  },
  {
    n: 12,
    slug: "land-and-resource-governance",
    title: "Land & resource governance",
    group: "Social equity & responsibility",
    level: "food",
    definition:
      "Strengthen institutional arrangements that recognise and support family farmers, smallholders and peasant producers as sustainable managers of natural and genetic resources.",
    body: "Who controls land, water and seeds shapes what is possible on the farm. Secure tenure and inclusive institutions empower local stewards to manage natural resources for the long term rather than for short-term extraction.",
    inIndia:
      "Forest Rights Act community claims, Joint Forest Management, watershed user groups under WOTR and WASSAN, FES' commons governance across nine states.",
    levers: ["Commons institutions", "Community forest rights", "Watershed groups"],
    icon: '<path d="M14.1 5.55a2 2 0 0 0 1.8 0l3.6-1.83A1 1 0 0 1 21 4.62v12.76a1 1 0 0 1-.55.9l-4.55 2.27a2 2 0 0 1-1.8 0l-4.2-2.1a2 2 0 0 0-1.8 0l-3.6 1.83A1 1 0 0 1 3 19.38V6.62a1 1 0 0 1 .55-.9L8.1 3.45a2 2 0 0 1 1.8 0z"/><path d="M15 5.76v15"/><path d="M9 3.24v15"/>',
  },
  {
    n: 13,
    slug: "participation",
    title: "Participation",
    group: "Social equity & responsibility",
    level: "food",
    definition:
      "Encourage social organisation and greater participation in decision-making by food producers and consumers, supporting decentralised governance and local adaptive management.",
    body: "Lasting change is built with people, not for them. When producers and consumers organise and share in decisions, food systems adapt to local needs and communities take ownership of their own transformation.",
    inIndia:
      "Krishi Vigyan Kendra advisory committees, gram sabha-anchored programme design, civil society shaping the National Mission on Natural Farming.",
    levers: ["Gram sabha planning", "Multi-stakeholder platforms", "Policy co-design"],
    icon: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  },
];

export function getPrincipleBySlug(slug: string): Principle | undefined {
  return PRINCIPLES.find((p) => p.slug === slug);
}

export const PRINCIPLE_SLUGS = PRINCIPLES.map((p) => p.slug);
const PRINCIPLE_SLUG_SET = new Set(PRINCIPLE_SLUGS);

export function principleTitle(slug: string): string {
  return PRINCIPLES.find((p) => p.slug === slug)?.title ?? slug;
}

/**
 * Normalise a free-text `principle_alignment` entry (the fact-sheet engine
 * emits descriptive strings of mixed casing) to one of the 13 canonical
 * principle slugs, or null if it isn't a principle. Order matters: more
 * specific tests come first. This is what lets the Atlas filter by principle.
 */
export function toPrincipleSlug(raw: string): string | null {
  if (!raw) return null;
  const s = raw.toLowerCase().trim();
  if (PRINCIPLE_SLUG_SET.has(s)) return s;
  if (s.includes("co-creation") || s.includes("co creation") || (s.includes("knowledge") && !s.includes("governance")))
    return "co-creation-of-knowledge";
  if (s.includes("input reduction") || s.includes("input-reduction")) return "input-reduction";
  if (s.includes("recycl")) return "recycling";
  if (s.includes("soil health") || s.includes("soil-health") || s.startsWith("soil")) return "soil-health";
  if (s.includes("animal health") || s.includes("animal integration") || s.includes("livestock integrat"))
    return "animal-health";
  if (s.includes("biodiversity") || s.includes("seed")) return "biodiversity";
  if (s.includes("economic diversif") || s.includes("economic-diversif")) return "economic-diversification";
  if (s.includes("synerg") || s.includes("integration") || s.includes("integrated")) return "synergy";
  if (s.includes("social values") || s.includes("diet") || s.includes("nutrition")) return "social-values-and-diets";
  if (s.includes("fairness") || s.includes("fair ")) return "fairness";
  if (s.includes("participation") || s.includes("women") || s.includes("collective") || s.includes("gram sabha"))
    return "participation";
  if (s.includes("governance") || (s.includes("land") && s.includes("resource")) || s.includes("water"))
    return "land-and-resource-governance";
  if (s.includes("connectivity") || s.includes("market") || s.includes("value chain") || s.includes("value-chain"))
    return "connectivity";
  return null;
}

/** Map an array of free-text principle strings to a deduped set of canonical slugs. */
export function canonicalPrinciples(raw: string[] | null | undefined): string[] {
  const out = new Set<string>();
  for (const r of raw ?? []) {
    const slug = toPrincipleSlug(r);
    if (slug) out.add(slug);
  }
  return [...out];
}
