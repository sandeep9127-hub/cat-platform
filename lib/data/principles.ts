/**
 * The 13 Principles of Agroecology, as articulated by the High Level Panel
 * of Experts on Food Security and Nutrition (HLPE) of the UN Committee on
 * World Food Security in their 2019 report. The principles are grouped into
 * three operational levels: improve resource efficiency, strengthen
 * resilience, and secure social equity / responsibility.
 *
 * Source: HLPE Report 14, "Agroecological and other innovative approaches"
 *   https://www.fao.org/3/ca5602en/ca5602en.pdf
 *
 * Definitions below are written in our own words for the Transformation Hub —
 * the canonical phrasing lives in the HLPE report. We add a "how this shows
 * up in India" note per principle, and link to atlas pins that exemplify it.
 */

export type PrincipleLevel = "efficiency" | "resilience" | "equity";

export type Principle = {
  number: number;
  slug: string;
  name: string;
  level: PrincipleLevel;
  /** One-sentence definition in our own words. */
  definition: string;
  /** Short paragraph: how this manifests in Indian landscapes. */
  inIndia: string;
  /** Two or three illustrative phrases — practical levers, not theory. */
  levers: string[];
};

export const PRINCIPLE_LEVELS: Record<
  PrincipleLevel,
  { title: string; subtitle: string }
> = {
  efficiency: {
    title: "Improve resource efficiency",
    subtitle:
      "Use less, waste less. Close nutrient and energy loops within the farm.",
  },
  resilience: {
    title: "Strengthen resilience",
    subtitle:
      "Make farms and food systems robust to shocks — climate, market, ecological.",
  },
  equity: {
    title: "Secure social equity and responsibility",
    subtitle:
      "Centre the people who grow food. Knowledge, fairness, governance, voice.",
  },
};

export const PRINCIPLES: Principle[] = [
  {
    number: 1,
    slug: "recycling",
    name: "Recycling",
    level: "efficiency",
    definition:
      "Use local renewable resources and close nutrient and biomass cycles, so wastes from one process become inputs for another.",
    inIndia:
      "Composting, vermicomposting, and on-farm preparation of biofertilisers like jeevamrutham and ghanjeevamrutham. Crop residue and animal manure cycled back into soil instead of burnt or sold.",
    levers: ["On-farm composting", "Biofertilisers (jeevamrutham, beejamrutham)", "Crop-livestock integration"],
  },
  {
    number: 2,
    slug: "input-reduction",
    name: "Input reduction",
    level: "efficiency",
    definition:
      "Reduce or eliminate dependence on purchased inputs by designing systems that meet their own needs from internal ecological processes.",
    inIndia:
      "The headline lever for the Andhra Pradesh Community-managed Natural Farming (APCNF) programme, now reaching over 800,000 farmers. Synthetic fertiliser and pesticide use replaced with farm-made preparations.",
    levers: ["Natural farming preparations", "Pest management via botanicals", "Seed sovereignty"],
  },
  {
    number: 3,
    slug: "soil-health",
    name: "Soil health",
    level: "resilience",
    definition:
      "Protect and improve soil biology, structure, and fertility through living roots, organic matter, and minimal disturbance.",
    inIndia:
      "Cover cropping, mulching, multi-species green manures, and reduced tillage. Soil organic carbon is the indicator that ties climate, water, and yield outcomes together.",
    levers: ["Living root cover", "Mulching", "Reduced or zero tillage"],
  },
  {
    number: 4,
    slug: "animal-health",
    name: "Animal health",
    level: "resilience",
    definition:
      "Provide animals with conditions and care that support physical wellbeing, behavioural needs, and resilience to disease.",
    inIndia:
      "Indigenous breeds adapted to local feed and climate. Pasture-based or silvopastoral systems. Reduced reliance on antibiotics and growth promoters.",
    levers: ["Indigenous breeds", "Silvopasture", "Ethnoveterinary practice"],
  },
  {
    number: 5,
    slug: "biodiversity",
    name: "Biodiversity",
    level: "resilience",
    definition:
      "Maintain and enhance the diversity of species, varieties, and habitats across crops, livestock, soil life, and surrounding ecosystems.",
    inIndia:
      "Mixed cropping, traditional millet panchayats, sacred groves, on-farm seed banks. Centres like Navdanya and Sahaja Samrudha steward thousands of farmer-saved varieties.",
    levers: ["Mixed cropping", "Seed banks", "Habitat corridors"],
  },
  {
    number: 6,
    slug: "synergy",
    name: "Synergy",
    level: "resilience",
    definition:
      "Design farms and landscapes so different elements — crops, trees, animals, water, soil — reinforce each other.",
    inIndia:
      "Tank-fed paddy with fish, agroforestry on bunds, integrated farming systems pioneered by BAIF and PRADAN. The whole producing more than the parts in isolation.",
    levers: ["Crop-tree-livestock integration", "Aquaculture in tanks", "Agroforestry"],
  },
  {
    number: 7,
    slug: "economic-diversification",
    name: "Economic diversification",
    level: "resilience",
    definition:
      "Diversify on-farm income streams to reduce market risk and increase financial autonomy for producers.",
    inIndia:
      "Producer-owned value addition — millet flours, oil mills, dairy collectives. FPOs like Sahyadri Farms moving from primary produce into processing and direct-to-consumer markets.",
    levers: ["Producer companies (FPOs)", "On-farm processing", "Direct-to-consumer channels"],
  },
  {
    number: 8,
    slug: "co-creation-of-knowledge",
    name: "Co-creation of knowledge",
    level: "equity",
    definition:
      "Combine traditional, practical, and scientific knowledge through participatory processes rooted in farmer agency.",
    inIndia:
      "Farmer field schools, community resource persons, knowledge networks like WASSAN and AMEF. The farmer is researcher, not recipient.",
    levers: ["Farmer field schools", "Community resource persons", "Participatory research"],
  },
  {
    number: 9,
    slug: "social-values-and-diets",
    name: "Social values and diets",
    level: "equity",
    definition:
      "Build food systems on the culture, identity, and traditions of local communities, producing diets that are diverse, seasonal, and culturally appropriate.",
    inIndia:
      "Millet revival, school meal programmes anchored in local foods, the Deccan Development Society's three-decade work with Dalit women around millet sovereignty.",
    levers: ["Millet mainstreaming", "Public food procurement", "Mid-day meal redesign"],
  },
  {
    number: 10,
    slug: "fairness",
    name: "Fairness",
    level: "equity",
    definition:
      "Support dignified, equitable livelihoods for all actors in food systems, especially small-scale producers, women, and historically marginalised groups.",
    inIndia:
      "Fair Trade premiums, women-led collectives, MGNREGA-aligned natural resource works that pay communities for ecological labour.",
    levers: ["Fair trade premiums", "Women collectives", "Living wages"],
  },
  {
    number: 11,
    slug: "connectivity",
    name: "Connectivity",
    level: "equity",
    definition:
      "Strengthen short, transparent links between producers and consumers, and between rural and urban food systems.",
    inIndia:
      "Farmers' markets, organic bazaars, CSA models, the Sahaja Aharam producer-consumer cooperative in Telangana. Cutting out aggregators while preserving traceability.",
    levers: ["CSA models", "Farmers' markets", "Direct procurement"],
  },
  {
    number: 12,
    slug: "land-and-natural-resource-governance",
    name: "Land and natural resource governance",
    level: "equity",
    definition:
      "Recognise and strengthen community institutions that manage land, water, forests, and seeds as commons.",
    inIndia:
      "Forest Rights Act community claims, Joint Forest Management, watershed user groups under WOTR and WASSAN, FES' work on commons governance across nine states.",
    levers: ["Commons institutions", "Community forest rights", "Watershed user groups"],
  },
  {
    number: 13,
    slug: "participation",
    name: "Participation",
    level: "equity",
    definition:
      "Engage producers, consumers, and citizens in shaping food and agriculture policy — not as recipients but as decision-makers.",
    inIndia:
      "Krishi Vigyan Kendra advisory committees, gram sabha-anchored programme design, the role of civil society in shaping National Mission on Natural Farming policy.",
    levers: ["Gram sabha planning", "Multi-stakeholder platforms", "Policy co-design"],
  },
];

export function getPrincipleBySlug(slug: string): Principle | undefined {
  return PRINCIPLES.find((p) => p.slug === slug);
}

export function getPrinciplesByLevel(level: PrincipleLevel): Principle[] {
  return PRINCIPLES.filter((p) => p.level === level);
}
