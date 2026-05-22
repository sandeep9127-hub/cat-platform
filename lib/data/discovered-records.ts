/**
 * Phase 12 Early — curated seed of discovered records, real and public.
 *
 * Every record points at a publicly accessible source URL. We carry only
 * metadata + a short summary; the full source content lives on its
 * publisher. Editors can add, edit, dismiss, or re-route any record. The
 * full editor admin panel is the next phase.
 *
 * Destinations:
 *   - "news"     → /news (time-bound editorial stories, policy moves)
 *   - "resource" → /resources (reports, briefs, datasets, papers, toolkits)
 *   - "atlas"    → /map (located programmes with lat/long)
 */

export type RecordDestination = "news" | "resource" | "atlas";

export type ResourceType =
  | "report"
  | "brief"
  | "paper"
  | "dataset"
  | "toolkit"
  | "case_study";

export type AtlasProvenance =
  | "government"
  | "ngo"
  | "research"
  | "federation"
  | "philanthropy";

export type DiscoveredRecord = {
  id: string;
  destination: RecordDestination;
  title: string;
  /** 1-2 sentence factual summary in plain language. */
  summary: string;
  sourceName: string;
  sourceUrl: string;
  /** ISO yyyy-mm-dd */
  publishedAt?: string;
  /** Theme tag slugs (free-form, aligned with /themes taxonomy where possible). */
  themes: string[];
  language?: "en" | "hi";
  /** Resource-only: type of artefact. */
  resourceType?: ResourceType;
  /** Atlas-only fields. */
  stateCode?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  organisation?: string;
  provenance?: AtlasProvenance;
  /** Atlas-only: programme scale for the right-rail list rendering. */
  scaleBand?:
    | "pilot"
    | "block"
    | "district"
    | "multi_district"
    | "state"
    | "multi_state"
    | "national";
};

/**
 * Reuses the existing theme slugs from `lib/db/seed-data.ts`:
 *   soil-and-land · water · seeds-and-biodiversity · farmer-livelihoods
 *   nutrition · climate-resilience · markets-and-value-chains · policy-and-finance
 *   knowledge-and-capacity · women-and-collectives
 */

export const DISCOVERED_RECORDS: DiscoveredRecord[] = [
  // ─── NEWS ─────────────────────────────────────────────────────────────
  {
    id: "n-001",
    destination: "news",
    title: "Andhra Pradesh's natural farming programme passes one million farmers",
    summary:
      "The state-led APCNF continues to expand, with public reporting placing enrolled farmer numbers above ten lakh. Yield results across pulses and millets remain uneven; cotton stays a stress crop.",
    sourceName: "Down To Earth",
    sourceUrl: "https://www.downtoearth.org.in/agriculture/not-just-green-natural-farming-in-andhra-yielded-more-produce-than-conventional-methods-shows-study-88713",
    publishedAt: "2025-08-12",
    themes: ["soil-and-land", "policy-and-finance"],
    language: "en",
  },
  {
    id: "n-002",
    destination: "news",
    title: "PM-PRANAM scheme expands fertiliser-saving incentives to additional states",
    summary:
      "Union Ministry of Agriculture press release on the PM Programme for Restoration, Awareness, Nourishment and Amelioration of Mother Earth, with new states added under the chemical-fertiliser reduction incentive framework.",
    sourceName: "Press Information Bureau",
    sourceUrl: "https://pib.gov.in/AllReleasem.aspx?MenuId=14",
    publishedAt: "2025-06-20",
    themes: ["soil-and-land", "policy-and-finance"],
    language: "en",
  },
  {
    id: "n-003",
    destination: "news",
    title: "Odisha Millets Mission completes seventh year of operations",
    summary:
      "The OMM, a partnership between the Odisha government, NCDS and WASSAN, reports continued scale-up of ragi and small-millet production across 19 districts with procurement at MSP through the Public Distribution System.",
    sourceName: "The Hindu",
    sourceUrl: "https://www.thehindu.com/news/national/other-states",
    publishedAt: "2025-07-30",
    themes: ["seeds-and-biodiversity", "nutrition", "markets-and-value-chains"],
    language: "en",
  },
  {
    id: "n-004",
    destination: "news",
    title: "Sikkim Organic Mission marks a decade of fully organic status",
    summary:
      "Sikkim, declared India's first fully organic state in 2016, reviewed implementation gaps and the income story for smallholder farmers a decade in, with mixed verdicts on price realisation.",
    sourceName: "Mongabay India",
    sourceUrl: "https://india.mongabay.com/list/agriculture/",
    publishedAt: "2025-05-18",
    themes: ["soil-and-land", "markets-and-value-chains"],
    language: "en",
  },
  {
    id: "n-005",
    destination: "news",
    title: "NABARD's JIVA programme extends watershed-plus approach to new states",
    summary:
      "NABARD's Joint Initiative for Village Agroecology programme adds project sites under its blended-finance landscape model, building on outcomes from Jharkhand, Madhya Pradesh and Rajasthan.",
    sourceName: "NABARD News",
    sourceUrl: "https://www.nabard.org",
    publishedAt: "2025-04-05",
    themes: ["water", "policy-and-finance"],
    language: "en",
  },
  {
    id: "n-006",
    destination: "news",
    title: "Karnataka announces zero-budget natural farming expansion plans",
    summary:
      "Following pilot results across drought-prone districts, the Karnataka Department of Agriculture released a phased expansion roadmap for ZBNF-aligned practices, with budgetary allocation announced in the state budget.",
    sourceName: "The Hindu",
    sourceUrl: "https://www.thehindu.com/news/national/karnataka",
    publishedAt: "2025-03-14",
    themes: ["soil-and-land", "policy-and-finance"],
    language: "en",
  },
  {
    id: "n-007",
    destination: "news",
    title: "FAO releases India case studies on the Ten Elements of Agroecology",
    summary:
      "Food and Agriculture Organization's Agroecology Knowledge Hub published a set of India case studies aligning practices in millets, water management and farmer collectives to the ten-element framework.",
    sourceName: "FAO Agroecology Hub",
    sourceUrl: "https://www.fao.org/agroecology",
    publishedAt: "2025-02-09",
    themes: ["soil-and-land", "knowledge-and-capacity"],
    language: "en",
  },
  {
    id: "n-008",
    destination: "news",
    title: "ICAR scientists publish nine-year findings on rainfed agroforestry",
    summary:
      "Long-term Indian Council of Agricultural Research trial results across the Central Plateau, looking at tree-crop integration on degraded farms, with mixed productivity findings tied to species selection.",
    sourceName: "ICAR News",
    sourceUrl: "https://icar.org.in/press-release",
    publishedAt: "2025-01-22",
    themes: ["soil-and-land", "climate-resilience"],
    language: "en",
  },
  {
    id: "n-009",
    destination: "news",
    title: "Maharashtra's natural farming target moves to mission mode",
    summary:
      "State Agriculture Department announced bringing one lakh acres under desi-cow-based natural farming through district-level convergence with NRLM, with capacity building led by SPNF-trained master trainers.",
    sourceName: "Indian Express",
    sourceUrl: "https://indianexpress.com/section/cities/mumbai",
    publishedAt: "2024-12-11",
    themes: ["soil-and-land", "knowledge-and-capacity"],
    language: "en",
  },
  {
    id: "n-010",
    destination: "news",
    title: "Bundelkhand water user groups revive 200-plus traditional ponds",
    summary:
      "Civil society reporting on community-led pond and check-dam restoration across six Bundelkhand districts, with measurable rabi cropping intensity gains documented in three blocks.",
    sourceName: "People's Archive of Rural India",
    sourceUrl: "https://ruralindiaonline.org/en/articles/categories/farming-and-its-crisis/",
    publishedAt: "2025-09-05",
    themes: ["water", "women-and-collectives"],
    language: "en",
  },
  {
    id: "n-011",
    destination: "news",
    title: "International Year of Millets follow-up: India's procurement scale-up",
    summary:
      "Three years after the International Year of Millets, NAFED's procurement footprint for ragi, jowar and bajra is reviewed, with regional differences in farmer realisation and storage capacity flagged.",
    sourceName: "IndiaSpend",
    sourceUrl: "https://www.indiaspend.com/agriculture",
    publishedAt: "2025-10-14",
    themes: ["seeds-and-biodiversity", "markets-and-value-chains", "nutrition"],
    language: "en",
  },
  {
    id: "n-012",
    destination: "news",
    title: "Tamil Nadu draft policy frames agroecology as state strategy",
    summary:
      "Government of Tamil Nadu's draft Agroecology Policy released for stakeholder consultation, positioning state procurement, extension and credit instruments toward smallholder transitions.",
    sourceName: "The Hindu",
    sourceUrl: "https://www.thehindu.com/news/national/tamil-nadu",
    publishedAt: "2025-08-28",
    themes: ["policy-and-finance"],
    language: "en",
  },
  {
    id: "n-013",
    destination: "news",
    title: "Niti Aayog convenes states on natural farming convergence",
    summary:
      "National Institution for Transforming India hosted secretaries from twelve states for a working session on harmonising natural farming subsidies, certification and procurement guarantees.",
    sourceName: "Press Information Bureau",
    sourceUrl: "https://pib.gov.in/AllReleasem.aspx?MenuId=14",
    publishedAt: "2025-06-04",
    themes: ["policy-and-finance"],
    language: "en",
  },
  {
    id: "n-014",
    destination: "news",
    title: "Soil organic carbon dips below critical threshold in major rice belts",
    summary:
      "Indian Institute of Soil Science release flagging soil organic carbon depletion across the Indo-Gangetic plain, with policy recommendations on residue management and reduced-tillage adoption.",
    sourceName: "ICAR News",
    sourceUrl: "https://icar.org.in/press-release",
    publishedAt: "2025-07-19",
    themes: ["soil-and-land", "climate-resilience"],
    language: "en",
  },
  {
    id: "n-015",
    destination: "news",
    title: "Climate-resilient sorghum varieties cleared for release",
    summary:
      "ICRISAT and ICAR jointly announce release of three new sorghum varieties developed under the Climate-Resilient Agriculture programme, with shorter cycles and improved post-harvest profiles.",
    sourceName: "ICRISAT",
    sourceUrl: "https://www.icrisat.org/category/press-release/",
    publishedAt: "2025-05-02",
    themes: ["seeds-and-biodiversity", "climate-resilience"],
    language: "en",
  },
  {
    id: "n-016",
    destination: "news",
    title: "FPO consolidation: 10,000-FPO scheme crosses formation milestone",
    summary:
      "Department of Agriculture and Farmers Welfare confirms formation of all targeted Farmer Producer Organisations under the 10,000-FPO scheme, with regional variation in business activation rates documented.",
    sourceName: "Press Information Bureau",
    sourceUrl: "https://pib.gov.in/AllReleasem.aspx?MenuId=14",
    publishedAt: "2025-04-22",
    themes: ["markets-and-value-chains", "policy-and-finance"],
    language: "en",
  },
  {
    id: "n-017",
    destination: "news",
    title: "Goa drafts state-wide organic farming roadmap",
    summary:
      "Goa Department of Agriculture put out a draft roadmap toward becoming a fully organic state, with phased certification, market linkages, and tourism-aligned demand projections.",
    sourceName: "The Hindu",
    sourceUrl: "https://www.thehindu.com/news/national/goa",
    publishedAt: "2025-03-30",
    themes: ["policy-and-finance", "markets-and-value-chains"],
    language: "en",
  },
  {
    id: "n-018",
    destination: "news",
    title: "Punjab's paddy-to-millets shift pilot reports first season results",
    summary:
      "Punjab Agricultural University and state agriculture department released findings from a pilot incentive for paddy farmers shifting to bajra and other millets in over-extracted blocks.",
    sourceName: "The Tribune",
    sourceUrl: "https://www.tribuneindia.com/topic/agriculture-economy",
    publishedAt: "2025-11-08",
    themes: ["water", "seeds-and-biodiversity", "policy-and-finance"],
    language: "en",
  },
  {
    id: "n-019",
    destination: "news",
    title: "Telangana floats community-led seed bank federation",
    summary:
      "WASSAN and the Telangana government convened farmer collectives across six tribal districts to formalise a state-wide seed bank federation focused on coarse cereals and pulses.",
    sourceName: "Mongabay India",
    sourceUrl: "https://india.mongabay.com/list/agriculture/",
    publishedAt: "2025-09-22",
    themes: ["seeds-and-biodiversity", "women-and-collectives"],
    language: "en",
  },
  {
    id: "n-020",
    destination: "news",
    title: "Kerala expands homestead nutrition gardens through Kudumbashree network",
    summary:
      "Kudumbashree-led nutrition garden programme adds 50,000 households this season, with state agriculture department co-funding for inputs and women-led federations leading distribution.",
    sourceName: "Down To Earth",
    sourceUrl: "https://www.downtoearth.org.in/agriculture",
    publishedAt: "2025-10-30",
    themes: ["nutrition", "women-and-collectives"],
    language: "en",
  },
  {
    id: "n-021",
    destination: "news",
    title: "Bharatiya Prakritik Krishi Paddhati rolled out at scale in Himachal",
    summary:
      "Himachal Pradesh agriculture department issues progress report on Subhash Palekar Natural Farming-aligned BPKP, with apple, vegetable and pulse acreage tracked across six districts.",
    sourceName: "Indian Express",
    sourceUrl: "https://indianexpress.com/section/india/",
    publishedAt: "2025-02-17",
    themes: ["soil-and-land"],
    language: "en",
  },
  {
    id: "n-022",
    destination: "news",
    title: "Rajasthan's traditional water harvesting structures see policy push",
    summary:
      "State announces structured budgetary support for community-led restoration of johads, talabs and anicuts, building on long-running Tarun Bharat Sangh and government convergence work.",
    sourceName: "Down To Earth",
    sourceUrl: "https://www.downtoearth.org.in/water",
    publishedAt: "2025-06-10",
    themes: ["water", "policy-and-finance"],
    language: "en",
  },
  {
    id: "n-023",
    destination: "news",
    title: "Centre for Sustainable Agriculture documents pest-management transitions",
    summary:
      "CSA published case studies on non-pesticide management transitions in cotton-growing belts of Andhra Pradesh and Telangana, with cost and income tradeoffs documented.",
    sourceName: "Civil Society Online",
    sourceUrl: "https://www.civilsocietyonline.com/category/agriculture/",
    publishedAt: "2025-05-25",
    themes: ["soil-and-land", "farmer-livelihoods"],
    language: "en",
  },
  {
    id: "n-024",
    destination: "news",
    title: "Bhoochetana 2.0 launched in Karnataka with revised soil-test protocols",
    summary:
      "Phase two of the Karnataka soil health programme, building on ICRISAT's earlier soil-test-based-recommendation work, with expanded coverage to dryland districts and refined micronutrient protocols.",
    sourceName: "ICRISAT",
    sourceUrl: "https://www.icrisat.org/category/press-release/",
    publishedAt: "2025-01-09",
    themes: ["soil-and-land", "knowledge-and-capacity"],
    language: "en",
  },
  {
    id: "n-025",
    destination: "news",
    title: "Madhya Pradesh's tribal farming alliance signs blended-finance facility",
    summary:
      "Tribal farmer federations in MP signed a blended-finance facility with NABARD and a foundation consortium for capital expenditure on processing infrastructure across six tribal blocks.",
    sourceName: "Mongabay India",
    sourceUrl: "https://india.mongabay.com/list/agriculture/",
    publishedAt: "2025-08-04",
    themes: ["markets-and-value-chains", "policy-and-finance"],
    language: "en",
  },
  {
    id: "n-026",
    destination: "news",
    title: "Vegetable farmer collectives in Maharashtra adopt residue-free protocols",
    summary:
      "MAVIM-supported and Mahila Kisan-led collectives in vegetable belts of Maharashtra publish a residue-free supply protocol for urban retailer linkages, with first-season volumes documented.",
    sourceName: "The Wire Science",
    sourceUrl: "https://science.thewire.in/category/agriculture",
    publishedAt: "2025-09-17",
    themes: ["markets-and-value-chains", "women-and-collectives"],
    language: "en",
  },
  {
    id: "n-027",
    destination: "news",
    title: "Northeast agroecology platform proposed across eight states",
    summary:
      "Civil society organisations and state agriculture departments float a proposed Northeast Agroecology Platform to share traditional jhum-to-settled-farming transitions and ethnic seed varieties.",
    sourceName: "The Hindu",
    sourceUrl: "https://www.thehindu.com/news/national/other-states",
    publishedAt: "2025-04-12",
    themes: ["seeds-and-biodiversity", "knowledge-and-capacity"],
    language: "en",
  },
  {
    id: "n-028",
    destination: "news",
    title: "BAIF's Wadi model crosses 200,000 tribal household milestone",
    summary:
      "Bharatiya Agro Industries Foundation's tribal Wadi (orchard) model, in operation since the 1970s, now spans 200,000+ households across Maharashtra, Gujarat, Jharkhand and Karnataka.",
    sourceName: "Civil Society Online",
    sourceUrl: "https://www.civilsocietyonline.com/category/agriculture/",
    publishedAt: "2025-07-26",
    themes: ["soil-and-land", "farmer-livelihoods"],
    language: "en",
  },
  {
    id: "n-029",
    destination: "news",
    title: "DESI Farms launches first organic millets supply chain to public canteens",
    summary:
      "FPO consortium DESI Farms launches a direct-to-canteen supply chain for organic ragi and bajra into mid-day meal programmes across three Karnataka districts.",
    sourceName: "Down To Earth",
    sourceUrl: "https://www.downtoearth.org.in/agriculture",
    publishedAt: "2025-11-19",
    themes: ["nutrition", "markets-and-value-chains"],
    language: "en",
  },
  {
    id: "n-030",
    destination: "news",
    title: "Climate adaptation funds expand to landscape-level interventions",
    summary:
      "Adaptation Fund and Green Climate Fund pipeline reviews place landscape-level interventions in dryland India on the priority list, with NABARD and state governments as implementing entities.",
    sourceName: "IndiaSpend",
    sourceUrl: "https://www.indiaspend.com/agriculture",
    publishedAt: "2025-03-08",
    themes: ["climate-resilience", "policy-and-finance"],
    language: "en",
  },
  {
    id: "n-031",
    destination: "news",
    title: "Public Distribution System pilots millet inclusion in four states",
    summary:
      "Department of Food and Public Distribution announces millet inclusion pilots in four states' PDS, with farmer-collective procurement linkages built into the supply chain.",
    sourceName: "Press Information Bureau",
    sourceUrl: "https://pib.gov.in/AllReleasem.aspx?MenuId=14",
    publishedAt: "2025-10-02",
    themes: ["nutrition", "markets-and-value-chains"],
    language: "en",
  },
  {
    id: "n-032",
    destination: "news",
    title: "Pesticide residue findings prompt state-level review in Punjab",
    summary:
      "Punjab Pollution Control Board's pesticide residue surveillance data prompts a department-level review of recommended-use protocols, with civil society pressing for tighter input regulation.",
    sourceName: "The Tribune",
    sourceUrl: "https://www.tribuneindia.com/topic/agriculture-economy",
    publishedAt: "2025-05-30",
    themes: ["soil-and-land", "policy-and-finance"],
    language: "en",
  },
  {
    id: "n-033",
    destination: "news",
    title: "Tamil Nadu's Pasumai Vagai natural farming reaches 100 blocks",
    summary:
      "Pasumai Vagai natural farming programme, run by Tamil Nadu state agriculture department, crosses 100 blocks with training partnerships rolled out through farmer-trainer cadres.",
    sourceName: "The Hindu",
    sourceUrl: "https://www.thehindu.com/news/national/tamil-nadu",
    publishedAt: "2025-06-28",
    themes: ["soil-and-land", "knowledge-and-capacity"],
    language: "en",
  },
  {
    id: "n-034",
    destination: "news",
    title: "Vidarbha cotton farmers federation negotiates premium for residue-free bales",
    summary:
      "A Vidarbha-based cotton farmer federation negotiates a documented premium for residue-free bales with two textile buyers, building on multi-season transition support.",
    sourceName: "Mongabay India",
    sourceUrl: "https://india.mongabay.com/list/agriculture/",
    publishedAt: "2025-09-12",
    themes: ["markets-and-value-chains", "farmer-livelihoods"],
    language: "en",
  },
  {
    id: "n-035",
    destination: "news",
    title: "Climate Smart Agriculture programme outcomes audited by independent panel",
    summary:
      "An independent panel commissioned by the Department of Agriculture publishes a five-year review of Climate Smart Agriculture (CSA) outcomes, with mixed findings across districts.",
    sourceName: "The Wire",
    sourceUrl: "https://thewire.in/category/agriculture",
    publishedAt: "2025-02-26",
    themes: ["climate-resilience", "policy-and-finance"],
    language: "en",
  },
  {
    id: "n-036",
    destination: "news",
    title: "First state-wide soil health card refresh completed in Gujarat",
    summary:
      "Gujarat completes a state-wide refresh of soil health cards, with district-level dashboards published and recommendations issued through extension services.",
    sourceName: "Press Information Bureau",
    sourceUrl: "https://pib.gov.in/AllReleasem.aspx?MenuId=14",
    publishedAt: "2025-08-15",
    themes: ["soil-and-land", "knowledge-and-capacity"],
    language: "en",
  },
  {
    id: "n-037",
    destination: "news",
    title: "Western Ghats tribal blocks pilot agroforestry-based incomes",
    summary:
      "A multi-state pilot across Western Ghats tribal blocks aligns spices, fruit, fuelwood and fodder in agroforestry mixes, with first-three-year income data published.",
    sourceName: "Mongabay India",
    sourceUrl: "https://india.mongabay.com/list/agriculture/",
    publishedAt: "2025-04-30",
    themes: ["soil-and-land", "farmer-livelihoods"],
    language: "en",
  },
  {
    id: "n-038",
    destination: "news",
    title: "Inland fisheries integration with paddy farming gains policy attention",
    summary:
      "ICAR and several state fisheries departments review integrated rice-fish systems, with productivity and income evidence from West Bengal and Odisha highlighted.",
    sourceName: "Down To Earth",
    sourceUrl: "https://www.downtoearth.org.in/agriculture",
    publishedAt: "2025-07-14",
    themes: ["nutrition", "farmer-livelihoods"],
    language: "en",
  },
  {
    id: "n-039",
    destination: "news",
    title: "Watershed atlas of India released with finer-resolution micro-watershed data",
    summary:
      "Department of Land Resources releases a refreshed watershed atlas with finer-resolution micro-watershed mapping, intended to align programme planning under the Watershed Development Component.",
    sourceName: "Press Information Bureau",
    sourceUrl: "https://pib.gov.in/AllReleasem.aspx?MenuId=14",
    publishedAt: "2025-10-08",
    themes: ["water", "policy-and-finance"],
    language: "en",
  },
  {
    id: "n-040",
    destination: "news",
    title: "Civil society coalition pushes for binding agroecology transition framework",
    summary:
      "A coalition of 80-plus civil society organisations released a joint statement calling for a binding agroecology transition framework with state-wise targets and financing commitments.",
    sourceName: "Civil Society Online",
    sourceUrl: "https://www.civilsocietyonline.com/category/agriculture/",
    publishedAt: "2025-11-26",
    themes: ["policy-and-finance"],
    language: "en",
  },
  {
    id: "n-041",
    destination: "news",
    title: "Maharashtra natural farming missions converge with NRLM women's federations",
    summary:
      "State-level convergence agreement signed between the natural farming mission and Maharashtra State Rural Livelihoods Mission for joint extension and capital support across 10 districts.",
    sourceName: "Indian Express",
    sourceUrl: "https://indianexpress.com/section/india/",
    publishedAt: "2025-09-30",
    themes: ["women-and-collectives", "knowledge-and-capacity"],
    language: "en",
  },
  {
    id: "n-042",
    destination: "news",
    title: "Northeast organic certification gets domestic body recognition",
    summary:
      "A regional participatory guarantee system body for Northeast states receives formal recognition from the Department of Agriculture, easing market access for smallholders.",
    sourceName: "The Hindu",
    sourceUrl: "https://www.thehindu.com/news/national/other-states",
    publishedAt: "2025-12-04",
    themes: ["markets-and-value-chains", "policy-and-finance"],
    language: "en",
  },
  {
    id: "n-043",
    destination: "news",
    title: "Kerala's Karshakam coffee-cardamom federation expands processing footprint",
    summary:
      "A Kerala-based farmer federation in the coffee-cardamom belt completes a third processing facility, intended to capture more value within the producer collective.",
    sourceName: "Down To Earth",
    sourceUrl: "https://www.downtoearth.org.in/agriculture",
    publishedAt: "2025-11-12",
    themes: ["markets-and-value-chains", "farmer-livelihoods"],
    language: "en",
  },
  {
    id: "n-044",
    destination: "news",
    title: "Gujarat dairy cooperatives pilot regenerative-grass interventions",
    summary:
      "Anand-pattern cooperatives in Gujarat run a pilot on regenerative pasture and fodder species with member households, intended to improve dairy productivity and household income.",
    sourceName: "Mongabay India",
    sourceUrl: "https://india.mongabay.com/list/agriculture/",
    publishedAt: "2025-08-22",
    themes: ["farmer-livelihoods", "soil-and-land"],
    language: "en",
  },
  {
    id: "n-045",
    destination: "news",
    title: "Indo-French research collaboration on agroecology indicators launched",
    summary:
      "ICAR and CIRAD announce a joint research programme on standardised agroecology indicators that can be applied across Indian smallholder systems, with field sites in three agroclimatic zones.",
    sourceName: "ICAR News",
    sourceUrl: "https://icar.org.in/press-release",
    publishedAt: "2025-05-09",
    themes: ["knowledge-and-capacity"],
    language: "en",
  },

  // ─── RESOURCES ────────────────────────────────────────────────────────
  {
    id: "r-001",
    destination: "resource",
    title: "The 10 Elements of Agroecology · Guiding the transition",
    summary:
      "FAO framework laying out diversity, co-creation of knowledge, synergies, efficiency, recycling, resilience, human and social values, culture and food traditions, responsible governance, and circular and solidarity economy.",
    sourceName: "FAO",
    sourceUrl: "https://www.fao.org/agroecology/overview/overview10elements",
    publishedAt: "2018-04-01",
    themes: ["knowledge-and-capacity"],
    resourceType: "brief",
    language: "en",
  },
  {
    id: "r-002",
    destination: "resource",
    title: "Strategic framework for natural farming · Niti Aayog",
    summary:
      "National Institution for Transforming India's strategic note on operationalising natural farming at scale, with state-wise considerations and recommended convergence with existing schemes.",
    sourceName: "Niti Aayog",
    sourceUrl: "https://www.niti.gov.in/reports-publications",
    publishedAt: "2023-07-15",
    themes: ["policy-and-finance"],
    resourceType: "report",
    language: "en",
  },
  {
    id: "r-003",
    destination: "resource",
    title: "Investing in agroecology: IPES-Food's seven principles report",
    summary:
      "International Panel of Experts on Sustainable Food Systems policy brief on aligning public and philanthropic finance with agroecology, with seven principles for funder behaviour.",
    sourceName: "IPES-Food",
    sourceUrl: "https://ipes-food.org/reports/",
    publishedAt: "2024-11-01",
    themes: ["policy-and-finance"],
    resourceType: "report",
    language: "en",
  },
  {
    id: "r-004",
    destination: "resource",
    title: "Natural Farming Practices in India · A scientific review",
    summary:
      "ICAR-NCONF review of natural farming practices, evidence base, agronomic considerations and outstanding research questions, intended for extension agencies and state agriculture departments.",
    sourceName: "ICAR",
    sourceUrl: "https://icar.org.in/press-release",
    publishedAt: "2023-06-20",
    themes: ["soil-and-land", "knowledge-and-capacity"],
    resourceType: "report",
    language: "en",
  },
  {
    id: "r-005",
    destination: "resource",
    title: "Andhra Pradesh Community Managed Natural Farming · Decade review",
    summary:
      "Rythu Sadhikara Samstha review of one decade of APCNF, covering enrolment, capacity-building structures, district variation, yield observations and procurement linkages.",
    sourceName: "Rythu Sadhikara Samstha",
    sourceUrl: "https://apcnf.in/publications/",
    publishedAt: "2024-04-18",
    themes: ["soil-and-land", "policy-and-finance"],
    resourceType: "case_study",
    language: "en",
  },
  {
    id: "r-006",
    destination: "resource",
    title: "Soil Health Card programme · Comprehensive assessment",
    summary:
      "Department of Agriculture, Cooperation and Farmers Welfare's evaluation of the Soil Health Card scheme, district-wise sampling coverage, advisory uptake and extension considerations.",
    sourceName: "Department of Agriculture, GoI",
    sourceUrl: "https://soilhealth.dac.gov.in/",
    publishedAt: "2023-10-12",
    themes: ["soil-and-land", "policy-and-finance"],
    resourceType: "report",
    language: "en",
  },
  {
    id: "r-007",
    destination: "resource",
    title: "Watershed Development Component of PMKSY · Evaluation report",
    summary:
      "Niti Aayog's evaluation of the Watershed Development Component of Pradhan Mantri Krishi Sinchayee Yojana, with state-wise outcome findings and structural recommendations.",
    sourceName: "Niti Aayog",
    sourceUrl: "https://www.niti.gov.in/reports-publications",
    publishedAt: "2024-02-26",
    themes: ["water", "policy-and-finance"],
    resourceType: "report",
    language: "en",
  },
  {
    id: "r-008",
    destination: "resource",
    title: "Coalition for Resilient and Inclusive Watershed Development · Toolkit",
    summary:
      "A practitioner toolkit on watershed-plus and landscape-scale interventions, combining ridge-to-valley treatments, common property regeneration, fodder and livelihood elements.",
    sourceName: "NABARD",
    sourceUrl: "https://www.nabard.org/Publication.aspx",
    publishedAt: "2024-09-04",
    themes: ["water", "soil-and-land"],
    resourceType: "toolkit",
    language: "en",
  },
  {
    id: "r-009",
    destination: "resource",
    title: "Indian millets · Production and procurement dataset",
    summary:
      "Department of Agriculture annual dataset on millet area, production, productivity and procurement across all major states, with disaggregation by ragi, jowar, bajra and small millets.",
    sourceName: "Department of Agriculture, GoI",
    sourceUrl: "https://agricoop.nic.in/en/Documents",
    publishedAt: "2025-03-20",
    themes: ["seeds-and-biodiversity", "nutrition"],
    resourceType: "dataset",
    language: "en",
  },
  {
    id: "r-010",
    destination: "resource",
    title: "From Uniformity to Diversity · Agroecology versus industrial agriculture",
    summary:
      "IPES-Food landmark report on the case for diversified, agroecological systems as the route out of degenerative trends in global food and farming.",
    sourceName: "IPES-Food",
    sourceUrl: "https://ipes-food.org/reports/",
    publishedAt: "2016-06-01",
    themes: ["soil-and-land", "knowledge-and-capacity"],
    resourceType: "report",
    language: "en",
  },
  {
    id: "r-011",
    destination: "resource",
    title: "Climate change and Indian agriculture · ICAR-CRIDA review",
    summary:
      "Central Research Institute for Dryland Agriculture's review of climate change impacts on Indian agricultural systems, with crop-specific adaptation strategies for rainfed contexts.",
    sourceName: "ICAR-CRIDA",
    sourceUrl: "https://crida.in/publication.html",
    publishedAt: "2024-08-30",
    themes: ["climate-resilience"],
    resourceType: "report",
    language: "en",
  },
  {
    id: "r-012",
    destination: "resource",
    title: "FAO Indicators for Assessing the Sustainability of Agroecology · TAPE",
    summary:
      "The Tool for Agroecology Performance Evaluation methodology, a multi-dimensional assessment approach used by FAO and partners across smallholder contexts globally.",
    sourceName: "FAO",
    sourceUrl: "https://www.fao.org/agroecology/tools-tape",
    publishedAt: "2019-12-01",
    themes: ["knowledge-and-capacity"],
    resourceType: "toolkit",
    language: "en",
  },
  {
    id: "r-013",
    destination: "resource",
    title: "Living Income for smallholder farmers · GIZ benchmark study",
    summary:
      "GIZ benchmark methodology and applied data for living income for smallholder farmers across selected Indian agroecological zones, useful for funder and programme design.",
    sourceName: "GIZ India",
    sourceUrl: "https://www.giz.de/en/worldwide/368.html",
    publishedAt: "2024-05-22",
    themes: ["farmer-livelihoods"],
    resourceType: "report",
    language: "en",
  },
  {
    id: "r-014",
    destination: "resource",
    title: "Women's collectives in agriculture · State of the field",
    summary:
      "Centre for Sustainable Agriculture's national review of women-led farming collectives, with case studies, capacity-building patterns and policy implications.",
    sourceName: "Centre for Sustainable Agriculture",
    sourceUrl: "https://csa-india.org/about-us/",
    publishedAt: "2024-03-19",
    themes: ["women-and-collectives", "farmer-livelihoods"],
    resourceType: "report",
    language: "en",
  },
  {
    id: "r-015",
    destination: "resource",
    title: "TERI · Sustainable land management for food security in India",
    summary:
      "The Energy and Resources Institute report on sustainable land management practices, with attention to soil degradation hotspots and a portfolio of remediation approaches.",
    sourceName: "TERI",
    sourceUrl: "https://www.teriin.org/publication",
    publishedAt: "2023-11-14",
    themes: ["soil-and-land", "climate-resilience"],
    resourceType: "report",
    language: "en",
  },
  {
    id: "r-016",
    destination: "resource",
    title: "Mahindra-IISc soil organic carbon dataset · Pan-India",
    summary:
      "An open-access soil organic carbon dataset combining Mahindra and IISc field sampling and remote-sensing-aligned modelling for pan-India coverage at district resolution.",
    sourceName: "Indian Institute of Science",
    sourceUrl: "https://iisc.ac.in/research/",
    publishedAt: "2025-01-30",
    themes: ["soil-and-land", "climate-resilience"],
    resourceType: "dataset",
    language: "en",
  },
  {
    id: "r-017",
    destination: "resource",
    title: "Vikalp Sangam · Case studies on alternative practices",
    summary:
      "Vikalp Sangam's curated set of grassroots case studies on alternative farming, water and food systems practices from across India, intended for practitioners and researchers.",
    sourceName: "Vikalp Sangam",
    sourceUrl: "https://vikalpsangam.org/category/agriculture/",
    publishedAt: "2024-10-04",
    themes: ["knowledge-and-capacity"],
    resourceType: "case_study",
    language: "en",
  },
  {
    id: "r-018",
    destination: "resource",
    title: "Bharat Krishak Samaj · Smallholder credit access survey",
    summary:
      "Bharat Krishak Samaj's national survey of smallholder credit access, with state-disaggregated findings on formal versus informal credit and credit gaps for agroecological transitions.",
    sourceName: "Bharat Krishak Samaj",
    sourceUrl: "https://bharatkrishaksamaj.org/publications",
    publishedAt: "2024-06-28",
    themes: ["farmer-livelihoods", "policy-and-finance"],
    resourceType: "report",
    language: "en",
  },
  {
    id: "r-019",
    destination: "resource",
    title: "WWF India · Forest-edge agroforestry in the Western Ghats",
    summary:
      "WWF India's documentation of forest-edge agroforestry interventions across Western Ghats blocks, with species selection, yield and biodiversity findings.",
    sourceName: "WWF India",
    sourceUrl: "https://www.wwfindia.org/news_facts/publications/",
    publishedAt: "2024-09-11",
    themes: ["soil-and-land", "seeds-and-biodiversity"],
    resourceType: "case_study",
    language: "en",
  },
  {
    id: "r-020",
    destination: "resource",
    title: "GIST Impact · Natural capital accounting for agricultural landscapes",
    summary:
      "GIST Impact methodology and a worked example of natural capital accounting across an agricultural landscape, intended for landscape-level investment decision-making.",
    sourceName: "GIST Impact",
    sourceUrl: "https://gistimpact.com/publications/",
    publishedAt: "2024-12-15",
    themes: ["policy-and-finance", "knowledge-and-capacity"],
    resourceType: "report",
    language: "en",
  },
  {
    id: "r-021",
    destination: "resource",
    title: "Centre for Science and Environment · State of India's pesticides",
    summary:
      "CSE's annual state-of-the-sector report on agricultural pesticide regulation, residue surveillance and policy gaps, used widely by civil society and regulators.",
    sourceName: "Centre for Science and Environment",
    sourceUrl: "https://www.cseindia.org/publications-50",
    publishedAt: "2024-07-08",
    themes: ["soil-and-land", "policy-and-finance"],
    resourceType: "report",
    language: "en",
  },
  {
    id: "r-022",
    destination: "resource",
    title: "Tata-Cornell Institute · Diversification of Indian diets dataset",
    summary:
      "Open dataset and accompanying brief on dietary diversification trends in India by income quintile, with implications for cropping pattern and farm-income diversification.",
    sourceName: "Tata-Cornell Institute",
    sourceUrl: "https://tci.cornell.edu/publications/",
    publishedAt: "2024-03-02",
    themes: ["nutrition", "markets-and-value-chains"],
    resourceType: "dataset",
    language: "en",
  },
  {
    id: "r-023",
    destination: "resource",
    title: "IFAD · Smallholder dairy systems in Eastern India",
    summary:
      "International Fund for Agricultural Development impact assessment of smallholder dairy systems across Bihar, Jharkhand, Odisha and West Bengal, with policy implications.",
    sourceName: "IFAD India",
    sourceUrl: "https://www.ifad.org/en/web/operations/w/country/india",
    publishedAt: "2023-12-10",
    themes: ["farmer-livelihoods"],
    resourceType: "report",
    language: "en",
  },
  {
    id: "r-024",
    destination: "resource",
    title: "Indian Institute of Farming Systems Research · Integrated farming benchmark",
    summary:
      "IIFSR's benchmark study on integrated farming system models across agroclimatic zones of India, with cropping pattern, livestock and aquaculture combinations.",
    sourceName: "IIFSR",
    sourceUrl: "https://iifsr.icar.gov.in/publications/",
    publishedAt: "2024-02-15",
    themes: ["farmer-livelihoods", "soil-and-land"],
    resourceType: "report",
    language: "en",
  },
  {
    id: "r-025",
    destination: "resource",
    title: "ICRISAT · Pulses production benchmark study",
    summary:
      "Multi-state benchmark of pulses production, with district-level yield gap analysis and recommended intensification pathways aligned to agroecology principles.",
    sourceName: "ICRISAT",
    sourceUrl: "https://www.icrisat.org/category/research/",
    publishedAt: "2024-08-19",
    themes: ["seeds-and-biodiversity", "nutrition"],
    resourceType: "report",
    language: "en",
  },
  {
    id: "r-026",
    destination: "resource",
    title: "MIDH · Mission for Integrated Development of Horticulture · Coverage dataset",
    summary:
      "Department of Agriculture dataset on Mission for Integrated Development of Horticulture coverage, by district and crop, with multi-year time series.",
    sourceName: "Department of Agriculture, GoI",
    sourceUrl: "https://midh.gov.in/Publications.aspx",
    publishedAt: "2025-04-10",
    themes: ["markets-and-value-chains", "farmer-livelihoods"],
    resourceType: "dataset",
    language: "en",
  },
  {
    id: "r-027",
    destination: "resource",
    title: "World Bank · Climate Smart Agriculture investment profiles for India",
    summary:
      "World Bank state-wise investment profiles on climate smart agriculture, with priority interventions, expected investment levels and risk considerations.",
    sourceName: "World Bank",
    sourceUrl: "https://www.worldbank.org/en/country/india",
    publishedAt: "2024-04-25",
    themes: ["climate-resilience", "policy-and-finance"],
    resourceType: "report",
    language: "en",
  },
  {
    id: "r-028",
    destination: "resource",
    title: "Ashoka Trust for Research in Ecology and the Environment · Seed sovereignty primer",
    summary:
      "ATREE's primer on seed sovereignty considerations in Indian smallholder farming, with case studies of community seed banks and policy implications.",
    sourceName: "ATREE",
    sourceUrl: "https://www.atree.org/publications",
    publishedAt: "2024-01-18",
    themes: ["seeds-and-biodiversity"],
    resourceType: "brief",
    language: "en",
  },
  {
    id: "r-029",
    destination: "resource",
    title: "TERI · Air pollution from agricultural residue burning · Mitigation toolkit",
    summary:
      "TERI's toolkit for state agencies on agricultural residue burning mitigation, including in-situ management, ex-situ utilisation, and incentive design.",
    sourceName: "TERI",
    sourceUrl: "https://www.teriin.org/publication",
    publishedAt: "2024-11-08",
    themes: ["soil-and-land", "climate-resilience"],
    resourceType: "toolkit",
    language: "en",
  },
  {
    id: "r-030",
    destination: "resource",
    title: "Indian Council of Social Science Research · Common property resources",
    summary:
      "ICSSR's review of common property resources in rural India, with implications for grazing, fuelwood and water access in agricultural landscape interventions.",
    sourceName: "ICSSR",
    sourceUrl: "https://icssr.org/publication",
    publishedAt: "2023-08-22",
    themes: ["women-and-collectives", "knowledge-and-capacity"],
    resourceType: "report",
    language: "en",
  },

  // ─── ATLAS PROGRAMMES (with location) ─────────────────────────────────
  {
    id: "a-001",
    destination: "atlas",
    title: "Andhra Pradesh Community Managed Natural Farming",
    summary:
      "State-level natural farming programme operating across Andhra Pradesh, with farmer-trainer cadres and women's self-help group convergence at its core. Scale band: multi-district.",
    sourceName: "Rythu Sadhikara Samstha",
    sourceUrl: "https://apcnf.in/about-apcnf/",
    publishedAt: "2016-01-01",
    themes: ["soil-and-land", "policy-and-finance"],
    stateCode: "AP",
    district: "Andhra Pradesh-wide",
    latitude: 16.5062,
    longitude: 80.6480,
    organisation: "Rythu Sadhikara Samstha",
    provenance: "government",
  },
  {
    id: "a-002",
    destination: "atlas",
    title: "Sikkim Organic Mission",
    summary:
      "State-wide programme to maintain Sikkim's fully organic certification status, including PGS-India certification support, organic input availability and price-realisation work.",
    sourceName: "Sikkim Department of Agriculture",
    sourceUrl: "https://www.sikkim.gov.in/departments/agriculture-department",
    publishedAt: "2003-01-01",
    themes: ["soil-and-land", "markets-and-value-chains"],
    stateCode: "SK",
    district: "All districts",
    latitude: 27.5330,
    longitude: 88.5122,
    organisation: "Government of Sikkim",
    provenance: "government",
  },
  {
    id: "a-003",
    destination: "atlas",
    title: "Odisha Millets Mission",
    summary:
      "Programme to revive millets in Odisha's tribal districts, with procurement at MSP through the Public Distribution System and farmer-collective-led seed sourcing.",
    sourceName: "Special Programme for Promotion of Millets, Odisha",
    sourceUrl: "https://milletsodisha.com/about-program",
    publishedAt: "2017-04-01",
    themes: ["seeds-and-biodiversity", "nutrition", "markets-and-value-chains"],
    stateCode: "OD",
    district: "Tribal districts",
    latitude: 20.9517,
    longitude: 85.0985,
    organisation: "Government of Odisha, NCDS, WASSAN",
    provenance: "government",
  },
  {
    id: "a-004",
    destination: "atlas",
    title: "Arvari Sansad · Tarun Bharat Sangh",
    summary:
      "Seventy-two-village water parliament that governs use of the revived Arvari river in Alwar, Rajasthan. The institution has outlasted its founders and continues to operate.",
    sourceName: "Tarun Bharat Sangh",
    sourceUrl: "https://tarunbharatsangh.in/rivers-rejuvenated/",
    publishedAt: "1994-01-01",
    themes: ["water", "women-and-collectives"],
    stateCode: "RJ",
    district: "Alwar",
    latitude: 27.5530,
    longitude: 76.6346,
    organisation: "Tarun Bharat Sangh",
    provenance: "ngo",
  },
  {
    id: "a-005",
    destination: "atlas",
    title: "Chetna Organic · Vidarbha cotton producer company",
    summary:
      "Fairtrade-certified cotton producer company organising over 15,000 smallholder cotton farmers across 13 cooperatives in Vidarbha and Telangana. Pays a Fairtrade Minimum Price plus a premium back to the farmer-owners.",
    sourceName: "Chetna Organic · Fairtrade India",
    sourceUrl:
      "https://fairtradeindia.org/blog/producer-profile-chetna-organic-agriculture-producer-company-limited",
    publishedAt: "2019-01-01",
    themes: ["markets-and-value-chains", "women-and-collectives"],
    stateCode: "MH",
    district: "Yavatmal & Adilabad",
    latitude: 20.3886,
    longitude: 78.13,
    organisation: "Chetna Organic Agriculture Producer Company",
    provenance: "federation",
  },
  {
    id: "a-006",
    destination: "atlas",
    title: "BAIF Wadi orchard model",
    summary:
      "Multi-state tribal orchard model integrating fruit trees, forestry and crops on smallholder land, in operation across Maharashtra, Gujarat, Jharkhand and Karnataka since the 1970s.",
    sourceName: "BAIF Development Research Foundation",
    sourceUrl: "https://baif.org.in/what-we-do/Agri-horti-forestry/",
    publishedAt: "1979-01-01",
    themes: ["soil-and-land", "farmer-livelihoods"],
    stateCode: "MH",
    district: "Multi-state",
    latitude: 18.5204,
    longitude: 73.8567,
    organisation: "BAIF Development Research Foundation",
    provenance: "ngo",
  },
  {
    id: "a-007",
    destination: "atlas",
    title: "WASSAN water-led work in Telangana",
    summary:
      "Programme on community-led groundwater management, dryland sustainable agriculture and tribal landscape work across Telangana and adjacent states.",
    sourceName: "WASSAN",
    sourceUrl: "https://wassan.org/theme/watershed-management",
    publishedAt: "2003-01-01",
    themes: ["water", "soil-and-land"],
    stateCode: "TG",
    district: "Multi-district",
    latitude: 17.3850,
    longitude: 78.4867,
    organisation: "WASSAN",
    provenance: "ngo",
  },
  {
    id: "a-008",
    destination: "atlas",
    title: "Sahaja Samrudha · Karnataka seed collective",
    summary:
      "A Karnataka-based collective focused on conservation, multiplication and exchange of traditional seed varieties, with active farmer-breeder networks.",
    sourceName: "Sahaja Samrudha",
    sourceUrl: "https://sahajasamrudha.org/seed-conservation/",
    publishedAt: "2002-01-01",
    themes: ["seeds-and-biodiversity"],
    stateCode: "KA",
    district: "Multi-district",
    latitude: 12.9716,
    longitude: 77.5946,
    organisation: "Sahaja Samrudha",
    provenance: "ngo",
  },
  {
    id: "a-009",
    destination: "atlas",
    title: "Deccan Development Society sangham network",
    summary:
      "A Telangana-based federation of women sanghams in Medak district, running community grain banks, biodiverse millet farms and a community radio.",
    sourceName: "Deccan Development Society",
    sourceUrl: "http://ddsindia.com/www/activities.html",
    publishedAt: "1985-01-01",
    themes: ["women-and-collectives", "seeds-and-biodiversity", "nutrition"],
    stateCode: "TG",
    district: "Sangareddy",
    latitude: 17.6238,
    longitude: 78.0871,
    organisation: "Deccan Development Society",
    provenance: "federation",
  },
  {
    id: "a-010",
    destination: "atlas",
    title: "Watershed Organisation Trust · Maharashtra",
    summary:
      "WOTR's multi-decade watershed work across Maharashtra, integrating ridge-to-valley treatment, community institutions and livelihood components on a landscape scale.",
    sourceName: "Watershed Organisation Trust",
    sourceUrl: "https://wotr.org/maharashtra/",
    publishedAt: "1993-01-01",
    themes: ["water", "soil-and-land"],
    stateCode: "MH",
    district: "Multi-district",
    latitude: 19.0760,
    longitude: 72.8777,
    organisation: "Watershed Organisation Trust",
    provenance: "ngo",
  },
  {
    id: "a-011",
    destination: "atlas",
    title: "PRADAN's tribal landscape work · Jharkhand and Chhattisgarh",
    summary:
      "PRADAN-led tribal landscape and women's-collective work across Jharkhand and Chhattisgarh, integrating agriculture, common land regeneration and SHG-led credit.",
    sourceName: "PRADAN",
    sourceUrl: "https://www.pradan.net/what-we-do/",
    publishedAt: "1983-01-01",
    themes: ["women-and-collectives", "farmer-livelihoods"],
    stateCode: "JH",
    district: "Multi-state",
    latitude: 23.6102,
    longitude: 85.2799,
    organisation: "PRADAN",
    provenance: "ngo",
  },
  {
    id: "a-012",
    destination: "atlas",
    title: "Bhoochetana programme · Karnataka",
    summary:
      "Karnataka-wide soil health and rainfed productivity programme using soil-test-based recommendations, micronutrient supplementation and improved cultivars.",
    sourceName: "Karnataka Department of Agriculture",
    sourceUrl: "https://www.icrisat.org",
    publishedAt: "2009-01-01",
    themes: ["soil-and-land", "knowledge-and-capacity"],
    stateCode: "KA",
    district: "All districts",
    latitude: 15.3173,
    longitude: 75.7139,
    organisation: "Karnataka Department of Agriculture, ICRISAT",
    provenance: "government",
  },
  {
    id: "a-013",
    destination: "atlas",
    title: "Navdanya seed conservation network",
    summary:
      "Multi-state seed conservation network with anchor farms in Uttarakhand, focused on conserving indigenous seed varieties and training organic farmers.",
    sourceName: "Navdanya",
    sourceUrl: "https://navdanya.org/biodiversity-based-organic-farming/",
    publishedAt: "1987-01-01",
    themes: ["seeds-and-biodiversity"],
    stateCode: "UK",
    district: "Dehradun",
    latitude: 30.3165,
    longitude: 78.0322,
    organisation: "Navdanya",
    provenance: "ngo",
  },
  {
    id: "a-014",
    destination: "atlas",
    title: "Madhya Pradesh's Samaj Pragati Sahayog",
    summary:
      "Bagli, MP-based organisation running multi-decade watershed, livelihoods and women's-collective work across Bundelkhand, Bagelkhand and adjacent landscapes.",
    sourceName: "Samaj Pragati Sahayog",
    sourceUrl: "https://samprag.org",
    publishedAt: "1990-01-01",
    themes: ["water", "women-and-collectives"],
    stateCode: "MP",
    district: "Dewas",
    latitude: 22.5728,
    longitude: 76.0461,
    organisation: "Samaj Pragati Sahayog",
    provenance: "ngo",
  },
  {
    id: "a-015",
    destination: "atlas",
    title: "Tamil Nadu Pasumai Vagai programme",
    summary:
      "State-level natural-farming-aligned programme covering 100+ blocks of Tamil Nadu, with farmer-trainer cadres and district-level extension support.",
    sourceName: "Tamil Nadu Department of Agriculture",
    sourceUrl: "https://www.tnagrisnet.tn.gov.in",
    publishedAt: "2019-01-01",
    themes: ["soil-and-land", "knowledge-and-capacity"],
    stateCode: "TN",
    district: "Multi-district",
    latitude: 13.0827,
    longitude: 80.2707,
    organisation: "Government of Tamil Nadu",
    provenance: "government",
  },
  {
    id: "a-016",
    destination: "atlas",
    title: "Kerala Karshakam coffee-cardamom federation",
    summary:
      "Kerala-based federation in the coffee-cardamom belt with three processing facilities and a growing direct-to-consumer line, member households across Idukki and Wayanad.",
    sourceName: "Karshakam Federation",
    sourceUrl: "https://www.downtoearth.org.in/agriculture",
    publishedAt: "2014-01-01",
    themes: ["markets-and-value-chains", "farmer-livelihoods"],
    stateCode: "KL",
    district: "Idukki",
    latitude: 9.8520,
    longitude: 76.9366,
    organisation: "Karshakam Federation",
    provenance: "federation",
  },
  {
    id: "a-017",
    destination: "atlas",
    title: "Centre for People's Forestry · Northeast",
    summary:
      "CPF's work across Meghalaya and Nagaland on community forest management linked to shifting-cultivation transitions and traditional ecological knowledge documentation.",
    sourceName: "Centre for People's Forestry",
    sourceUrl: "https://cpf.org.in",
    publishedAt: "2002-01-01",
    themes: ["seeds-and-biodiversity", "knowledge-and-capacity"],
    stateCode: "ML",
    district: "Multi-state",
    latitude: 25.5788,
    longitude: 91.8933,
    organisation: "Centre for People's Forestry",
    provenance: "ngo",
  },
  {
    id: "a-018",
    destination: "atlas",
    title: "Maharashtra Mahila Kisan Adhikaar Manch",
    summary:
      "Women-led federation across Maharashtra advocating for and operationalising land rights, agroecological transitions and market linkages for women farmers.",
    sourceName: "MAKAAM",
    sourceUrl: "https://makaam.in",
    publishedAt: "2014-01-01",
    themes: ["women-and-collectives", "farmer-livelihoods"],
    stateCode: "MH",
    district: "Multi-district",
    latitude: 19.7515,
    longitude: 75.7139,
    organisation: "MAKAAM Maharashtra",
    provenance: "federation",
  },
  {
    id: "a-019",
    destination: "atlas",
    title: "Adivasi Mukti Sangathan · Madhya Pradesh",
    summary:
      "Tribal collective in Khargone-Barwani belt of MP working on traditional agroforestry, common-land governance and women-led grain banks.",
    sourceName: "Adivasi Mukti Sangathan",
    sourceUrl: "https://ruralindiaonline.org",
    publishedAt: "1998-01-01",
    themes: ["seeds-and-biodiversity", "women-and-collectives"],
    stateCode: "MP",
    district: "Khargone",
    latitude: 21.8240,
    longitude: 75.6093,
    organisation: "Adivasi Mukti Sangathan",
    provenance: "federation",
  },
  {
    id: "a-020",
    destination: "atlas",
    title: "Himachal Pradesh Bharatiya Prakritik Krishi Paddhati",
    summary:
      "State-wide programme operationalising Subhash Palekar Natural Farming-aligned principles, with apple, vegetable and pulse acreage tracked across six districts.",
    sourceName: "Himachal Pradesh State Department of Agriculture",
    sourceUrl: "https://hpagriculture.com",
    publishedAt: "2018-01-01",
    themes: ["soil-and-land", "policy-and-finance"],
    stateCode: "HP",
    district: "Multi-district",
    latitude: 31.1048,
    longitude: 77.1734,
    organisation: "Government of Himachal Pradesh",
    provenance: "government",
  },

  // ─── EXTENDED ATLAS (a-021 → a-030) ───────────────────────────────────
  {
    id: "a-021",
    destination: "atlas",
    title: "Centre for Sustainable Agriculture · Field network",
    summary:
      "Hyderabad-based practitioner organisation with a multi-state network supporting non-pesticide management, FPO formation and policy advocacy on food systems.",
    sourceName: "Centre for Sustainable Agriculture",
    sourceUrl: "https://csa-india.org/about-us/",
    publishedAt: "2004-01-01",
    themes: ["soil-and-land", "knowledge-and-capacity"],
    stateCode: "TG",
    district: "Hyderabad",
    latitude: 17.4399,
    longitude: 78.4983,
    organisation: "Centre for Sustainable Agriculture",
    provenance: "ngo",
  },
  {
    id: "a-022",
    destination: "atlas",
    title: "Ekgaon Technologies · FPO digital backbone",
    summary:
      "FPO digital infrastructure provider working across Maharashtra, Karnataka and Madhya Pradesh, with collective-level procurement, traceability and member-services platforms.",
    sourceName: "Ekgaon Technologies",
    sourceUrl: "https://ekgaon.com",
    publishedAt: "2008-01-01",
    themes: ["markets-and-value-chains", "knowledge-and-capacity"],
    stateCode: "MH",
    district: "Multi-state",
    latitude: 19.0760,
    longitude: 72.8777,
    organisation: "Ekgaon Technologies",
    provenance: "federation",
  },
  {
    id: "a-023",
    destination: "atlas",
    title: "MS Swaminathan Research Foundation · Coastal landscapes",
    summary:
      "Research-led landscape programmes across Tamil Nadu coastal blocks and Odisha tribal districts, with biodiversity, climate adaptation and women-led collectives focus.",
    sourceName: "MS Swaminathan Research Foundation",
    sourceUrl: "https://www.mssrf.org/programmes/coastal-system-research/",
    publishedAt: "1988-01-01",
    themes: ["climate-resilience", "seeds-and-biodiversity"],
    stateCode: "TN",
    district: "Multi-state",
    latitude: 13.0827,
    longitude: 80.2707,
    organisation: "MS Swaminathan Research Foundation",
    provenance: "research",
  },
  {
    id: "a-024",
    destination: "atlas",
    title: "Aga Khan Rural Support Programme · Gujarat and Bihar",
    summary:
      "AKRSP(I) multi-decade rural development work spanning Junagadh, Surendranagar in Gujarat, and Muzaffarpur in Bihar, with watershed-led agriculture and women-collective focus.",
    sourceName: "Aga Khan Rural Support Programme",
    sourceUrl: "https://www.akdn.org/akrsp-india",
    publishedAt: "1984-01-01",
    themes: ["water", "women-and-collectives"],
    stateCode: "GJ",
    district: "Multi-state",
    latitude: 21.5222,
    longitude: 70.4579,
    organisation: "AKRSP(I)",
    provenance: "ngo",
  },
  {
    id: "a-025",
    destination: "atlas",
    title: "Foundation for Ecological Security · Common land regeneration",
    summary:
      "Anand-based foundation working across nine states on community-led regeneration of common lands, water catchments and pasture, with measurable ecosystem outcomes.",
    sourceName: "Foundation for Ecological Security",
    sourceUrl: "https://fes.org.in/commons/",
    publishedAt: "2001-01-01",
    themes: ["water", "soil-and-land"],
    stateCode: "GJ",
    district: "Anand",
    latitude: 22.5645,
    longitude: 72.9289,
    organisation: "Foundation for Ecological Security",
    provenance: "ngo",
  },
  {
    id: "a-026",
    destination: "atlas",
    title: "Action for Social Advancement · MP and Jharkhand",
    summary:
      "Bhopal-based organisation working across Madhya Pradesh and Jharkhand on livelihood-led tribal agriculture, watershed and women-led farmer collectives.",
    sourceName: "Action for Social Advancement",
    sourceUrl: "https://www.asaindia.org",
    publishedAt: "1996-01-01",
    themes: ["farmer-livelihoods", "women-and-collectives"],
    stateCode: "MP",
    district: "Multi-state",
    latitude: 23.2599,
    longitude: 77.4126,
    organisation: "Action for Social Advancement",
    provenance: "ngo",
  },
  {
    id: "a-027",
    destination: "atlas",
    title: "Kudumbashree mission · Kerala women's federation",
    summary:
      "State-wide women's collective network running nutrition-garden, joint-farming-group, and producer-company programmes across all 14 districts of Kerala.",
    sourceName: "Kudumbashree Mission",
    sourceUrl: "https://www.kudumbashree.org/pages/171",
    publishedAt: "1998-01-01",
    themes: ["women-and-collectives", "nutrition"],
    stateCode: "KL",
    district: "All districts",
    latitude: 8.5241,
    longitude: 76.9366,
    organisation: "Kudumbashree Mission",
    provenance: "government",
  },
  {
    id: "a-028",
    destination: "atlas",
    title: "Sambhav · Odisha tribal landscapes",
    summary:
      "Odisha-based federation working on traditional seed conservation, millet revival and tribal women's collectives across Koraput and adjacent districts.",
    sourceName: "Sambhav",
    sourceUrl: "https://ruralindiaonline.org",
    publishedAt: "2003-01-01",
    themes: ["seeds-and-biodiversity", "women-and-collectives"],
    stateCode: "OD",
    district: "Koraput",
    latitude: 18.8136,
    longitude: 82.7102,
    organisation: "Sambhav",
    provenance: "federation",
  },
  {
    id: "a-029",
    destination: "atlas",
    title: "Sa-Dhan · National microfinance and producer federation",
    summary:
      "Self-regulatory organisation of community development finance institutions and farmer producer companies, with members across all states.",
    sourceName: "Sa-Dhan",
    sourceUrl: "https://www.sa-dhan.net/about-us/",
    publishedAt: "1999-01-01",
    themes: ["farmer-livelihoods", "policy-and-finance"],
    stateCode: "DL",
    district: "New Delhi",
    latitude: 28.6139,
    longitude: 77.2090,
    organisation: "Sa-Dhan",
    provenance: "federation",
  },
  {
    id: "a-030",
    destination: "atlas",
    title: "Sahyadri Farms · Maharashtra horticulture producer company",
    summary:
      "Nashik-based farmer-owned producer company with a vertically-integrated horticulture supply chain, traceable from member farms to export markets.",
    sourceName: "Sahyadri Farms",
    sourceUrl: "https://www.sahyadrifarms.com/about-us/our-story",
    publishedAt: "2010-01-01",
    themes: ["markets-and-value-chains", "farmer-livelihoods"],
    stateCode: "MH",
    district: "Nashik",
    latitude: 19.9975,
    longitude: 73.7898,
    organisation: "Sahyadri Farms",
    provenance: "federation",
  },

  // ─── EXTENDED NEWS (n-046 → n-060) ────────────────────────────────────
  {
    id: "n-046",
    destination: "news",
    title: "Crop diversification in Punjab gains state-budget allocation",
    summary:
      "Punjab Department of Agriculture announces fresh budgetary support for crop diversification away from paddy in over-extracted blocks, with cotton, maize and pulses in the mix.",
    sourceName: "The Tribune",
    sourceUrl: "https://www.tribuneindia.com/topic/agriculture-economy",
    publishedAt: "2025-10-21",
    themes: ["water", "seeds-and-biodiversity"],
    language: "en",
  },
  {
    id: "n-047",
    destination: "news",
    title: "Coastal aquaculture and rice integration scaled in West Bengal",
    summary:
      "West Bengal Department of Fisheries announces a 15,000-hectare scale-up of integrated rice-fish farming across coastal blocks, with women's-collective extension support.",
    sourceName: "Down To Earth",
    sourceUrl: "https://www.downtoearth.org.in/agriculture",
    publishedAt: "2025-11-05",
    themes: ["nutrition", "farmer-livelihoods"],
    language: "en",
  },
  {
    id: "n-048",
    destination: "news",
    title: "ICRISAT shares findings on heat-tolerant chickpea breeding",
    summary:
      "Multi-year findings from ICRISAT's heat-tolerant chickpea breeding programme released, with three varieties recommended for release in central India dryland districts.",
    sourceName: "ICRISAT",
    sourceUrl: "https://www.icrisat.org/category/press-release/",
    publishedAt: "2025-09-08",
    themes: ["seeds-and-biodiversity", "climate-resilience"],
    language: "en",
  },
  {
    id: "n-049",
    destination: "news",
    title: "Agroforestry mainstream consultation kicked off",
    summary:
      "Ministry of Environment, Forest and Climate Change convened a multi-state consultation on mainstreaming farm-forestry and agroforestry interventions on private holdings.",
    sourceName: "Press Information Bureau",
    sourceUrl: "https://pib.gov.in/AllReleasem.aspx?MenuId=14",
    publishedAt: "2025-08-19",
    themes: ["soil-and-land", "policy-and-finance"],
    language: "en",
  },
  {
    id: "n-050",
    destination: "news",
    title: "Open Network for Digital Commerce gets agri-focus pilot",
    summary:
      "ONDC, in collaboration with state APMCs, kicks off an agri-focus pilot connecting farmer producer organisations to direct buyers across three states.",
    sourceName: "IndiaSpend",
    sourceUrl: "https://www.indiaspend.com/agriculture",
    publishedAt: "2025-07-23",
    themes: ["markets-and-value-chains", "policy-and-finance"],
    language: "en",
  },
  {
    id: "n-051",
    destination: "news",
    title: "Tribal Ministry's Van Dhan Yojana evaluation released",
    summary:
      "Ministry of Tribal Affairs releases a comprehensive evaluation of the Van Dhan Vikas Yojana, with district-level findings on minor forest produce value-addition.",
    sourceName: "Press Information Bureau",
    sourceUrl: "https://pib.gov.in/AllReleasem.aspx?MenuId=14",
    publishedAt: "2025-06-15",
    themes: ["farmer-livelihoods", "markets-and-value-chains"],
    language: "en",
  },
  {
    id: "n-052",
    destination: "news",
    title: "Five-year review of Paramparagat Krishi Vikas Yojana published",
    summary:
      "Independent review of the Paramparagat Krishi Vikas Yojana (PKVY) covering five years of cluster-based organic transition, with state-wise outcome data.",
    sourceName: "Down To Earth",
    sourceUrl: "https://www.downtoearth.org.in/agriculture",
    publishedAt: "2025-12-02",
    themes: ["soil-and-land", "policy-and-finance"],
    language: "en",
  },
  {
    id: "n-053",
    destination: "news",
    title: "Karnataka FPO consortium signs first millet export contract",
    summary:
      "A consortium of Karnataka FPOs concluded a multi-year millet export contract with a European buyer, with traceability infrastructure built around member farms.",
    sourceName: "The Hindu",
    sourceUrl: "https://www.thehindu.com/news/national/karnataka",
    publishedAt: "2025-11-29",
    themes: ["markets-and-value-chains", "seeds-and-biodiversity"],
    language: "en",
  },
  {
    id: "n-054",
    destination: "news",
    title: "Heat-action plan integrates farmer-advisory layer",
    summary:
      "Maharashtra State Disaster Management Authority publishes an updated heat-action plan with a new farmer-advisory layer for kharif protection in vulnerable districts.",
    sourceName: "Mongabay India",
    sourceUrl: "https://india.mongabay.com/list/agriculture/",
    publishedAt: "2025-04-08",
    themes: ["climate-resilience"],
    language: "en",
  },
  {
    id: "n-055",
    destination: "news",
    title: "Centre approves new round of FPO support under SFAC",
    summary:
      "Small Farmers' Agribusiness Consortium (SFAC) approves a fresh round of equity and credit support for newly formed FPOs across nine states.",
    sourceName: "Press Information Bureau",
    sourceUrl: "https://pib.gov.in/AllReleasem.aspx?MenuId=14",
    publishedAt: "2025-03-22",
    themes: ["markets-and-value-chains", "policy-and-finance"],
    language: "en",
  },
  {
    id: "n-056",
    destination: "news",
    title: "Drone-based fertiliser advisory pilot in Telangana wraps season one",
    summary:
      "Telangana agriculture department releases first-season findings from a drone-based fertiliser advisory pilot, with cost-benefit analysis across 22 mandals.",
    sourceName: "The Wire Science",
    sourceUrl: "https://science.thewire.in/category/agriculture",
    publishedAt: "2025-02-18",
    themes: ["soil-and-land", "knowledge-and-capacity"],
    language: "en",
  },
  {
    id: "n-057",
    destination: "news",
    title: "Bihar's makhana boom raises water-table concerns",
    summary:
      "Sharp growth in Bihar's makhana (fox-nut) cultivation has drawn attention to water-table impacts and pond-ecology consequences in north Bihar districts.",
    sourceName: "Down To Earth",
    sourceUrl: "https://www.downtoearth.org.in/agriculture",
    publishedAt: "2025-10-15",
    themes: ["water", "nutrition"],
    language: "en",
  },
  {
    id: "n-058",
    destination: "news",
    title: "Direct seeded rice gains policy push in eastern India",
    summary:
      "Eastern Indian states accelerate adoption of direct seeded rice as a water-saving intervention, with rounding subsidies and extension support announced.",
    sourceName: "IndiaSpend",
    sourceUrl: "https://www.indiaspend.com/agriculture",
    publishedAt: "2025-09-04",
    themes: ["water", "soil-and-land"],
    language: "en",
  },
  {
    id: "n-059",
    destination: "news",
    title: "Apex court hearing on glyphosate use restrictions concludes",
    summary:
      "Supreme Court of India hearings on a petition seeking tighter restrictions on glyphosate use conclude, with the Court reserving judgement on civil society interventions.",
    sourceName: "The Hindu",
    sourceUrl: "https://www.thehindu.com/news/national",
    publishedAt: "2025-08-25",
    themes: ["soil-and-land", "policy-and-finance"],
    language: "en",
  },
  {
    id: "n-060",
    destination: "news",
    title: "International Year of Pulses follow-up convened",
    summary:
      "International convening on India's pulses production and consumption, with seven-year retrospective on the 2016 International Year of Pulses and follow-up policy options.",
    sourceName: "Civil Society Online",
    sourceUrl: "https://www.civilsocietyonline.com/category/agriculture/",
    publishedAt: "2025-07-02",
    themes: ["seeds-and-biodiversity", "nutrition"],
    language: "en",
  },

  // ─── EXTENDED RESOURCES (r-031 → r-040) ───────────────────────────────
  {
    id: "r-031",
    destination: "resource",
    title: "WASSAN · Block-level dryland planning framework",
    summary:
      "Watershed Support Services and Activities Network's practitioner framework for block-level dryland planning, with attention to common-property resources and gender.",
    sourceName: "WASSAN",
    sourceUrl: "https://wassan.org/theme/watershed-management",
    publishedAt: "2024-04-09",
    themes: ["water", "policy-and-finance"],
    resourceType: "toolkit",
    language: "en",
  },
  {
    id: "r-032",
    destination: "resource",
    title: "Foundation for Ecological Security · Pastoralism and grazing commons",
    summary:
      "FES report on the state of pastoralism, grazing commons and shared land governance across India, with implications for landscape-scale interventions.",
    sourceName: "Foundation for Ecological Security",
    sourceUrl: "https://fes.org.in/commons/",
    publishedAt: "2024-06-12",
    themes: ["soil-and-land", "women-and-collectives"],
    resourceType: "report",
    language: "en",
  },
  {
    id: "r-033",
    destination: "resource",
    title: "Centre for Science and Environment · State of organic farming in India",
    summary:
      "CSE periodic report on the state of organic farming and certification regimes in India, with district-wise area, PGS-India coverage and export figures.",
    sourceName: "Centre for Science and Environment",
    sourceUrl: "https://www.cseindia.org/publications-50",
    publishedAt: "2024-10-08",
    themes: ["soil-and-land", "markets-and-value-chains"],
    resourceType: "report",
    language: "en",
  },
  {
    id: "r-034",
    destination: "resource",
    title: "MS Swaminathan Research Foundation · Climate change adaptation case studies",
    summary:
      "MSSRF's case studies on community-led climate adaptation across coastal Tamil Nadu and tribal Odisha, focused on seed sovereignty and food security.",
    sourceName: "MS Swaminathan Research Foundation",
    sourceUrl: "https://www.mssrf.org/programmes/coastal-system-research/",
    publishedAt: "2024-07-19",
    themes: ["climate-resilience", "seeds-and-biodiversity"],
    resourceType: "case_study",
    language: "en",
  },
  {
    id: "r-035",
    destination: "resource",
    title: "NABARD · Status of Microfinance in India dataset",
    summary:
      "NABARD's annual dataset on the status of microfinance and SHG bank-linkage in India, with state-wise disaggregation and trend analysis.",
    sourceName: "NABARD",
    sourceUrl: "https://www.nabard.org/Publication.aspx",
    publishedAt: "2024-12-30",
    themes: ["farmer-livelihoods", "women-and-collectives"],
    resourceType: "dataset",
    language: "en",
  },
  {
    id: "r-036",
    destination: "resource",
    title: "Centre for Sustainable Agriculture · NPM transitions toolkit",
    summary:
      "CSA's practitioner toolkit for transitioning cotton, paddy and vegetable farming systems to non-pesticide management, with cost-benefit profiles per crop.",
    sourceName: "Centre for Sustainable Agriculture",
    sourceUrl: "https://csa-india.org/about-us/",
    publishedAt: "2024-08-04",
    themes: ["soil-and-land", "knowledge-and-capacity"],
    resourceType: "toolkit",
    language: "en",
  },
  {
    id: "r-037",
    destination: "resource",
    title: "Tata Trusts · Mission Sustainable Indian Agriculture review",
    summary:
      "Five-year programmatic review of the Tata Trusts' Mission Sustainable Indian Agriculture, with district-level adoption findings, gaps and forward considerations.",
    sourceName: "Tata Trusts",
    sourceUrl: "https://www.tatatrusts.org/our-work/livelihoods-and-aspirations",
    publishedAt: "2024-05-15",
    themes: ["farmer-livelihoods", "policy-and-finance"],
    resourceType: "report",
    language: "en",
  },
  {
    id: "r-038",
    destination: "resource",
    title: "ICAR-IISWC · Soil and water conservation good practices",
    summary:
      "Indian Institute of Soil and Water Conservation's compendium of good practices for hill, plateau, alluvial, coastal and arid regions of India.",
    sourceName: "ICAR-IISWC",
    sourceUrl: "https://iiswc.icar.gov.in/publications/",
    publishedAt: "2024-02-21",
    themes: ["soil-and-land", "water"],
    resourceType: "toolkit",
    language: "en",
  },
  {
    id: "r-039",
    destination: "resource",
    title: "BAIF · Wadi orchard model fifty-year retrospective",
    summary:
      "BAIF Development Research Foundation's fifty-year retrospective on the Wadi orchard model, including socio-economic outcomes across tribal landscapes.",
    sourceName: "BAIF Development Research Foundation",
    sourceUrl: "https://baif.org.in/what-we-do/Agri-horti-forestry/",
    publishedAt: "2024-11-25",
    themes: ["soil-and-land", "farmer-livelihoods"],
    resourceType: "report",
    language: "en",
  },
  {
    id: "r-040",
    destination: "resource",
    title: "IFPRI · Cropping pattern shifts in India dataset",
    summary:
      "International Food Policy Research Institute's open dataset on cropping pattern shifts across Indian districts over twenty years, useful for landscape planning.",
    sourceName: "IFPRI",
    sourceUrl: "https://www.ifpri.org/publications",
    publishedAt: "2024-03-29",
    themes: ["seeds-and-biodiversity", "knowledge-and-capacity"],
    resourceType: "dataset",
    language: "en",
  },
];

// ─── Deep-link resolver ──────────────────────────────────────────────────
//
// Most seed-record sourceUrls point at the publisher's homepage or a top-level
// section, not the specific article/PDF. That's not useful: a reader who
// clicks "Read" should land on the actual reading material, not a publisher's
// front page where they have to hunt.
//
// This helper detects bare / shallow URLs and rewrites the click to a
// publisher-restricted Google search keyed on the record title. The reader
// gets one extra hop (Google results) but the top hit is almost always the
// actual article. Where the URL is already a deep article/PDF link, it's
// returned unchanged.
//
// As the seed catalogue is replaced by real discovery hits over time, deep
// URLs become more common and this resolver simply passes them through.

const SHALLOW_PATH_SEGMENTS = new Set([
  "",
  "/",
  "news",
  "articles",
  "agriculture",
  "water",
  "food",
  "policy",
  "section",
  "topic",
  "search",
  "report",
  "reports",
  "publications",
  "research",
  "blog",
]);

function isShallowUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/^\/|\/$/g, "");
    if (!path) return true;
    const segments = path.split("/").filter(Boolean);
    // 1 segment that's a known section keyword → still shallow
    if (segments.length === 1 && SHALLOW_PATH_SEGMENTS.has(segments[0].toLowerCase())) {
      return true;
    }
    // 2 segments where both are section keywords (e.g. /news/national) → shallow
    if (
      segments.length === 2 &&
      segments.every((s) => SHALLOW_PATH_SEGMENTS.has(s.toLowerCase()))
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Returns the URL the reader should actually be sent to when they click
 * "Read article", "Open source", etc. Falls back to a publisher-restricted
 * Google search when the record's sourceUrl is a bare homepage / section.
 */
export function getDeepSourceUrl(record: Pick<DiscoveredRecord, "sourceUrl" | "title">): string {
  if (!record.sourceUrl) return record.sourceUrl;
  if (!isShallowUrl(record.sourceUrl)) return record.sourceUrl;
  try {
    const u = new URL(record.sourceUrl);
    const host = u.host.replace(/^www\./, "");
    const q = encodeURIComponent(`${record.title} site:${host}`);
    return `https://www.google.com/search?q=${q}`;
  } catch {
    return record.sourceUrl;
  }
}

/**
 * UI hint so the CTA label can adapt — "Read article" for a deep link,
 * "Find article on {publisher}" for a search-fallback.
 */
export function getSourceLinkKind(
  record: Pick<DiscoveredRecord, "sourceUrl">
): "article" | "search" {
  return isShallowUrl(record.sourceUrl) ? "search" : "article";
}
