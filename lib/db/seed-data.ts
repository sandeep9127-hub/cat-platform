/* Static seed data for foundation + read-only surfaces.
 * Locked vocabularies from PRODUCT.md §10. Five real entries used as the
 * launch baseline; expand by running the ingestion pipeline. */

export const themesSeed = [
  { slug: "soil-land", name: "Soil & Land", colourHex: "#8B6F47", displayOrder: 1, description: "Soil health, land tenure, regeneration. Where the substrate decides everything else." },
  { slug: "water", name: "Water", colourHex: "#3A7CA5", displayOrder: 2, description: "Groundwater, watersheds, irrigation, drinking water security." },
  { slug: "seeds-biodiversity", name: "Seeds & Biodiversity", colourHex: "#A87C4F", displayOrder: 3, description: "Indigenous varieties, seed sovereignty, agro-biodiversity." },
  { slug: "climate-resilience", name: "Climate Resilience", colourHex: "#C76A4A", displayOrder: 4, description: "Adapting farming systems to a less predictable climate." },
  { slug: "women-collectives", name: "Women & Collectives", colourHex: "#7B6391", displayOrder: 5, description: "FPOs, SHGs, women-led federations as the organisational form." },
  { slug: "markets-value-chains", name: "Markets & Value Chains", colourHex: "#5F8B7A", displayOrder: 6, description: "Procurement, processing, market linkages, fair pricing." },
  { slug: "policy-governance", name: "Policy & Governance", colourHex: "#4A4A4A", displayOrder: 7, description: "Schemes, regulations, institutions that hold the system." },
  { slug: "knowledge-capacity", name: "Knowledge & Capacity", colourHex: "#9C7B3F", displayOrder: 8, description: "Training, extension, peer-to-peer learning, documentation." },
];

export const stateGeographies: {
  slug: string;
  name: string;
  stateCode: string;
  latitude: number;
  longitude: number;
}[] = [
  { slug: "andhra-pradesh", name: "Andhra Pradesh", stateCode: "AP", latitude: 15.9129, longitude: 79.74 },
  { slug: "arunachal-pradesh", name: "Arunachal Pradesh", stateCode: "AR", latitude: 28.218, longitude: 94.7278 },
  { slug: "assam", name: "Assam", stateCode: "AS", latitude: 26.2006, longitude: 92.9376 },
  { slug: "bihar", name: "Bihar", stateCode: "BR", latitude: 25.0961, longitude: 85.3131 },
  { slug: "chhattisgarh", name: "Chhattisgarh", stateCode: "CG", latitude: 21.2787, longitude: 81.8661 },
  { slug: "goa", name: "Goa", stateCode: "GA", latitude: 15.2993, longitude: 74.124 },
  { slug: "gujarat", name: "Gujarat", stateCode: "GJ", latitude: 22.2587, longitude: 71.1924 },
  { slug: "haryana", name: "Haryana", stateCode: "HR", latitude: 29.0588, longitude: 76.0856 },
  { slug: "himachal-pradesh", name: "Himachal Pradesh", stateCode: "HP", latitude: 31.1048, longitude: 77.1734 },
  { slug: "jharkhand", name: "Jharkhand", stateCode: "JH", latitude: 23.6102, longitude: 85.2799 },
  { slug: "karnataka", name: "Karnataka", stateCode: "KA", latitude: 15.3173, longitude: 75.7139 },
  { slug: "kerala", name: "Kerala", stateCode: "KL", latitude: 10.8505, longitude: 76.2711 },
  { slug: "madhya-pradesh", name: "Madhya Pradesh", stateCode: "MP", latitude: 22.9734, longitude: 78.6569 },
  { slug: "maharashtra", name: "Maharashtra", stateCode: "MH", latitude: 19.7515, longitude: 75.7139 },
  { slug: "manipur", name: "Manipur", stateCode: "MN", latitude: 24.6637, longitude: 93.9063 },
  { slug: "meghalaya", name: "Meghalaya", stateCode: "ML", latitude: 25.467, longitude: 91.3662 },
  { slug: "mizoram", name: "Mizoram", stateCode: "MZ", latitude: 23.1645, longitude: 92.9376 },
  { slug: "nagaland", name: "Nagaland", stateCode: "NL", latitude: 26.1584, longitude: 94.5624 },
  { slug: "odisha", name: "Odisha", stateCode: "OD", latitude: 20.9517, longitude: 85.0985 },
  { slug: "punjab", name: "Punjab", stateCode: "PB", latitude: 31.1471, longitude: 75.3412 },
  { slug: "rajasthan", name: "Rajasthan", stateCode: "RJ", latitude: 27.0238, longitude: 74.2179 },
  { slug: "sikkim", name: "Sikkim", stateCode: "SK", latitude: 27.533, longitude: 88.5122 },
  { slug: "tamil-nadu", name: "Tamil Nadu", stateCode: "TN", latitude: 11.1271, longitude: 78.6569 },
  { slug: "telangana", name: "Telangana", stateCode: "TG", latitude: 18.1124, longitude: 79.0193 },
  { slug: "tripura", name: "Tripura", stateCode: "TR", latitude: 23.9408, longitude: 91.9882 },
  { slug: "uttar-pradesh", name: "Uttar Pradesh", stateCode: "UP", latitude: 26.8467, longitude: 80.9462 },
  { slug: "uttarakhand", name: "Uttarakhand", stateCode: "UK", latitude: 30.0668, longitude: 79.0193 },
  { slug: "west-bengal", name: "West Bengal", stateCode: "WB", latitude: 22.9868, longitude: 87.855 },
  { slug: "delhi", name: "Delhi", stateCode: "DL", latitude: 28.7041, longitude: 77.1025 },
  { slug: "jammu-kashmir", name: "Jammu & Kashmir", stateCode: "JK", latitude: 33.7782, longitude: 76.5762 },
];

export const orgsSeed = [
  { slug: "ryss", name: "Rythu Sadhikara Samstha", shortName: "RySS", type: "government", description: "Andhra Pradesh state agency implementing community natural farming at scale." },
  { slug: "wassan", name: "Watershed Support Services and Activities Network", shortName: "WASSAN", type: "ngo", description: "Hyderabad-based NGO working on dryland farming, millets, and watershed development across the Deccan." },
  { slug: "tarun-bharat-sangh", name: "Tarun Bharat Sangh", shortName: "TBS", type: "ngo", description: "Alwar-based organisation that revived rivers in eastern Rajasthan through community-led water harvesting." },
  { slug: "odisha-millet-mission", name: "Odisha Millet Mission Society", shortName: "OMM", type: "government", description: "State-society partnership reviving millets in tribal blocks of Odisha." },
  { slug: "fpo-cotton-vidarbha", name: "Vidarbha Organic Farmers' Federation", shortName: "VOFF", type: "network", description: "Federation of farmer producer organisations selling residue-free cotton out of Vidarbha." },
  { slug: "sundarbans-trust", name: "Sundarbans Adaptive Farming Trust", shortName: "SAFT", type: "ngo", description: "Climate-adaptation trust working on salt-tolerant paddy in delta blocks." },
  { slug: "nabard", name: "National Bank for Agriculture and Rural Development", shortName: "NABARD", type: "government", description: "Apex development finance institution for agriculture and rural development in India." },
  { slug: "ifad", name: "International Fund for Agricultural Development", shortName: "IFAD", type: "multilateral", description: "UN agency financing rural transformation. Long-term funder of APCNF and related programmes." },
  { slug: "azim-premji-philanthropy", name: "Azim Premji Philanthropic Initiatives", shortName: "APPI", type: "foundation", description: "Foundation supporting livelihood, education, and ecological work across India." },
  { slug: "icrisat", name: "International Crops Research Institute for the Semi-Arid Tropics", shortName: "ICRISAT", type: "research", description: "Research institute working on dryland crops and farming systems in semi-arid geographies." },
];

export const entriesSeed = [
  {
    slug: "ap-community-natural-farming",
    title: "Andhra Pradesh Community Natural Farming",
    tagline: "Six lakh families have shifted off synthetic inputs. The yield story is more uneven than the headline suggests.",
    provenance: "sourced",
    scaleBand: "state",
    primaryThemeSlug: "soil-land",
    primaryGeographySlug: "andhra-pradesh",
    startYear: 2016,
    endYear: null,
    status: "ongoing",
    context:
      "Andhra Pradesh has been running a state-backed shift from chemical-intensive paddy to natural farming since 2016, implemented by Rythu Sadhikara Samstha, a state-owned society reporting to the agriculture department. The programme grew out of an earlier zero-budget farming movement and was formally adopted as state policy in 2018. It is now the largest agroecological transition programme in India, and one of the largest globally.",
    whatWasAttempted:
      "A district-by-district rollout run through community resource persons drawn from farming households. Each cluster gets a trained champion, on-farm demonstrations, and access to bio-input shops. Funding comes from the state government, with multi-year support from IFAD, Azim Premji Philanthropic Initiatives, KfW, and others. The model is deliberately low-input, low-cost, and locally adapted rather than uniformly prescribed.",
    whatWasAchieved:
      "By year nine, over six lakh farming households on roughly nine lakh acres are enrolled. Independent assessments show cost-of-cultivation reductions averaging 30 to 40 percent on the typical plot. Documented soil organic carbon gains in long-running clusters. Net incomes are up in most studied groups, driven primarily by the cost side rather than yield uplift.",
    whatWorked:
      "The community resource person model travels. Costs come down quickly. Women's participation is significantly higher than in conventional extension. The programme is honest about what it cannot yet claim and revises its public communication when independent studies disagree.",
    whatDidNotWork:
      "Yield comparisons in the first two years over-promised. Crop-by-crop results turned out to be uneven, with paddy holding steady but some pulses and vegetables falling behind for the first two seasons of transition. The programme now publishes uneven results by crop and is more cautious about its carbon claims, but the early headlines did damage that took time to walk back.",
    catEndorsement: "cat_authored",
    headlineMetrics: [
      { label: "Households enrolled", value: "6L+", unit: "" },
      { label: "Acres", value: "9L", unit: "" },
      { label: "Cost reduction (avg)", value: "38", unit: "%" },
      { label: "Years running", value: "9", unit: "" },
    ],
    investmentQuantumInrCr: 1700,
    coverImageUrl: null,
    organisations: [
      { orgSlug: "ryss", role: "lead_implementer" },
      { orgSlug: "ifad", role: "funder" },
      { orgSlug: "azim-premji-philanthropy", role: "funder" },
    ],
  },
  {
    slug: "odisha-millet-mission",
    title: "Odisha Millet Mission",
    tagline: "Government-led revival of ragi and small millets in tribal blocks. Procurement at MSP is the lever.",
    provenance: "sourced",
    scaleBand: "state",
    primaryThemeSlug: "seeds-biodiversity",
    primaryGeographySlug: "odisha",
    startYear: 2017,
    endYear: null,
    status: "ongoing",
    context:
      "The Odisha Millet Mission was launched in 2017 to revive finger millet and other small millets in 76 tribal-dominated blocks. The trigger was a combination of nutritional concerns, climate resilience reasoning, and an interest in re-anchoring traditional cropping systems that had given way to paddy. WASSAN serves as the state's main technical partner.",
    whatWasAttempted:
      "Three legs working together: production support to farmers (seed access, training, on-farm demos), consumption push (millet inclusion in ICDS, midday meals, and PDS), and procurement at MSP through the state's civil supplies corporation. The procurement leg is what distinguishes Odisha's effort from earlier millet revival attempts.",
    whatWasAchieved:
      "Acreage under millets has grown several times over the baseline. Procurement at MSP has held for multiple seasons. Millet-based products are now in state school meals. Farmer-producer organisations have formed around millet aggregation in many blocks. The model has been studied and partially adopted by neighbouring states.",
    whatWorked:
      "Tying production support to a guaranteed procurement price changed the household-level calculation. The state's willingness to absorb procurement losses initially built farmer confidence. WASSAN's role as a long-running technical partner avoided the consultant-rotation problem.",
    whatDidNotWork:
      "Mandi linkages outside Odisha remain thin. Millets sold inter-state still rely on private aggregators with thin margins. Processing infrastructure for value-added millet products is concentrated, leaving most blocks shipping raw grain. The market beyond institutional procurement is still developing.",
    catEndorsement: "cat_endorsed",
    headlineMetrics: [
      { label: "Blocks covered", value: "76", unit: "" },
      { label: "Acreage growth", value: "4x", unit: "" },
      { label: "Districts", value: "15", unit: "" },
    ],
    investmentQuantumInrCr: 540,
    coverImageUrl: null,
    organisations: [
      { orgSlug: "odisha-millet-mission", role: "lead_implementer" },
      { orgSlug: "wassan", role: "knowledge_partner" },
      { orgSlug: "nabard", role: "funder" },
    ],
  },
  {
    slug: "arvari-water-parliament",
    title: "Arvari Sansad — Water Parliament",
    tagline: "Seventy-two villages share governance of a revived river. The institution outlasted its founders.",
    provenance: "sourced",
    scaleBand: "block",
    primaryThemeSlug: "water",
    primaryGeographySlug: "rajasthan",
    startYear: 1994,
    endYear: null,
    status: "ongoing",
    context:
      "The Arvari river in eastern Rajasthan was a seasonal stream by the early 1980s. Through a long process of community water harvesting led by Tarun Bharat Sangh, traditional johads were rebuilt across the catchment. As the river revived, the communities that had built the structures formed the Arvari Sansad, a village-level parliament that governs water use along the river.",
    whatWasAttempted:
      "Seventy-two villages each send representatives to the Sansad, which sets rules on water extraction, crop choice, fishing, and tree cover in the catchment. The Sansad has no statutory authority. Its power rests on social recognition and the visible fact that the river is alive when the villages follow the rules.",
    whatWasAchieved:
      "The river has flowed perennially in most years since the early 2000s. The Sansad has operated continuously for three decades. Its example has informed similar institutions on nearby rivers. It is one of the few Indian examples of a long-running community-governed river basin institution that survived its founders.",
    whatWorked:
      "Investment in the physical infrastructure preceded the institution; the parliament had something concrete to govern. The Sansad's rules are written in plain Hindi, with no NGO branding on them, which made local enforcement easier.",
    whatDidNotWork:
      "State recognition remains ambiguous. The Sansad's rulings have no formal legal weight. When state agencies have proposed extraction or industrial water projects in the catchment, the Sansad has had to rely on protest and high-level political relationships rather than statutory standing. Younger generations are less engaged in some villages.",
    catEndorsement: "cat_authored",
    headlineMetrics: [
      { label: "Villages", value: "72", unit: "" },
      { label: "Years running", value: "30+", unit: "" },
    ],
    investmentQuantumInrCr: null,
    coverImageUrl: null,
    organisations: [{ orgSlug: "tarun-bharat-sangh", role: "lead_implementer" }],
  },
  {
    slug: "vidarbha-cotton-cooperative",
    title: "Vidarbha Cotton Cooperative",
    tagline: "A farmer-owned alternative to the broker chain. Premium for residue-free cotton has held for two seasons.",
    provenance: "self_submitted",
    scaleBand: "multi_district",
    primaryThemeSlug: "markets-value-chains",
    primaryGeographySlug: "maharashtra",
    startYear: 2019,
    endYear: null,
    status: "ongoing",
    context:
      "Vidarbha's cotton economy is built around a broker chain that historically captures most of the margin between farmgate and ginning. After two decades of distress, a federation of farmer producer organisations took shape around an aggregation model for residue-free cotton, aimed at sidestepping the broker and selling directly to processors that pay a premium for traceable raw material.",
    whatWasAttempted:
      "Twelve FPOs federated under a single producer company. The federation negotiates forward contracts with two textile processors and arranges its own ginning. Quality protocols and a chain-of-custody system are run by the federation's own staff, not by the buyers.",
    whatWasAchieved:
      "Premium pricing of 8 to 12 percent over the open market has held for two consecutive seasons. Aggregated volumes are still small relative to the regional total but growing year on year. Repayment discipline on the federation's working-capital line from NABARD is strong.",
    whatWorked:
      "Going premium-segment first, rather than trying to compete on volume, gave the federation breathing room. The buyers' willingness to commit to multi-year contracts is what made the FPO-level investment in compliance defensible.",
    whatDidNotWork:
      "Working capital is the choke point. The federation cannot expand to additional FPOs without a larger credit facility, and conventional lenders are slow to underwrite this structure. One season of pest pressure forced a quality downgrade for a portion of the harvest that hurt the federation's reserves.",
    catEndorsement: "cat_listed",
    headlineMetrics: [
      { label: "FPOs in federation", value: "12", unit: "" },
      { label: "Premium over open market", value: "10", unit: "%" },
      { label: "Seasons holding", value: "2", unit: "" },
    ],
    investmentQuantumInrCr: 18,
    coverImageUrl: null,
    organisations: [
      { orgSlug: "fpo-cotton-vidarbha", role: "lead_implementer" },
      { orgSlug: "nabard", role: "funder" },
    ],
  },
  {
    slug: "sundarbans-climate-resilient-farming",
    title: "Sundarbans Climate-Resilient Farming",
    tagline: "Salt-tolerant paddy and aquaculture rotations across 14 blocks. Cyclone Yaas reset the baseline.",
    provenance: "self_submitted",
    scaleBand: "multi_district",
    primaryThemeSlug: "climate-resilience",
    primaryGeographySlug: "west-bengal",
    startYear: 2021,
    endYear: null,
    status: "ongoing",
    context:
      "The Sundarbans face a hard climate constraint. Salinity intrusion, embankment failures, and recurring cyclones now define the production environment. Several state and NGO actors have tried adaptation programmes over the past decade. This programme, started in 2021, focuses on rotating salt-tolerant paddy with shrimp and small-fish aquaculture in 14 blocks across North and South 24 Parganas.",
    whatWasAttempted:
      "Salt-tolerant varieties from research institutes were introduced alongside an aquaculture rotation calendar tailored to monsoon and tidal patterns. Embankment-adjacent plots got priority. Extension staff worked block by block on the rotation rules. Women's SHGs were the primary entry point for adoption.",
    whatWasAchieved:
      "Two and a half years in, adoption is meaningful in 8 of the 14 blocks. Household income volatility has decreased in adopting families even where headline yields have not risen. The local hatchery economy has grown around the aquaculture leg.",
    whatWorked:
      "Anchoring the programme on women's SHGs rather than land-owning farmers shifted decision-making. The aquaculture leg gave families a cash crop that was less weather-dependent than rain-fed paddy.",
    whatDidNotWork:
      "Cyclone Yaas in mid-2021 reset the baseline for several adopting blocks. Several embankments breached. The programme is honest that one severe cyclone can undo two years of adaptation gains, and that the structural answer is climate-proof embankments which sit outside its remit.",
    catEndorsement: "cat_endorsed",
    headlineMetrics: [
      { label: "Blocks", value: "14", unit: "" },
      { label: "Adoption holding", value: "8", unit: "blocks" },
      { label: "Households", value: "~9,400", unit: "" },
    ],
    investmentQuantumInrCr: 32,
    coverImageUrl: null,
    organisations: [
      { orgSlug: "sundarbans-trust", role: "lead_implementer" },
      { orgSlug: "ifad", role: "funder" },
    ],
  },
];

export const sourceRegistrySeed = [
  {
    url: "https://apzbnf.in",
    sourceType: "gov_site" as const,
    trustTier: "tier_1_authoritative" as const,
    crawlFrequencyDays: 7,
    notes: "RySS official site for APCNF programme reporting.",
  },
  {
    url: "https://wassan.org",
    sourceType: "ngo_site" as const,
    trustTier: "tier_1_authoritative" as const,
    crawlFrequencyDays: 14,
    notes: "WASSAN. Covers Odisha Millet Mission and Deccan dryland work.",
  },
  {
    url: "https://www.nabard.org",
    sourceType: "gov_site" as const,
    trustTier: "tier_1_authoritative" as const,
    crawlFrequencyDays: 14,
    notes: "NABARD project portfolio and reports.",
  },
  {
    url: "https://www.ifad.org/en/web/operations/country/id/india",
    sourceType: "gov_site" as const,
    trustTier: "tier_1_authoritative" as const,
    crawlFrequencyDays: 30,
    notes: "IFAD India portfolio.",
  },
  {
    url: "https://www.icrisat.org",
    sourceType: "research_inst" as const,
    trustTier: "tier_1_authoritative" as const,
    crawlFrequencyDays: 14,
    notes: "ICRISAT research outputs.",
  },
];
