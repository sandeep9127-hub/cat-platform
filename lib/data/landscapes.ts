/**
 * Official CAT Landscape Profiles — content sourced from
 * https://agroecologyindia.org/wp-content/uploads/2026/03/CAT-Landscape-Profiles-February_2026.pdf
 *
 * Each profile records the canonical attribution (district, region) so we can
 * remove any earlier placeholder language. Investment plan status is from CAT's own page.
 */

export type LandscapePhoto = {
  /** Path relative to /public, e.g. /images/landscapes/patratu/02.jpg */
  src: string;
  /** Short editorial caption. Plain language, no marketing. */
  caption: string;
  /** Photographer or team credit. */
  credit: string;
  /** ISO yyyy-mm-dd. Optional — omitted when the capture date is unknown. */
  date?: string;
  /** Source image pixel dimensions, for next/image and aspect math. */
  width: number;
  height: number;
  /** Optional alt text override. Defaults to caption. */
  alt?: string;
};

export type LandscapeProfile = {
  slug: string;
  name: string;
  district: string;
  region: string;
  stateCode: string;
  /** One-sentence gloss for the index card. */
  gloss: string;
  /** 2-3 sentence editorial context for the detail page hero. */
  context: string;
  /** Multi-paragraph context for the body. */
  bodyContext: string;
  agroclimaticZone: string;
  area: string;
  population: string;
  households: string;
  villages: string;
  keyChallenges: string[];
  /** "published" → investment plan is published; "in_preparation" → in progress per CAT site. */
  lipStatus: "published" | "in_preparation";
  /**
   * Documentary photographs from the landscape, used in the hero anchor strip
   * and the "Field record" gallery. Editorial only, never stock.
   */
  photos?: LandscapePhoto[];
};

export const LANDSCAPES: Record<string, LandscapeProfile> = {
  ahwa: {
    slug: "ahwa",
    name: "Ahwa",
    district: "Dang district",
    region: "Western Ghats, Gujarat",
    stateCode: "GJ",
    gloss: "Tribal block in Gujarat's Dang district, part of the Western Ghats. Rainfed, forest-fringe, monsoon-driven.",
    context:
      "The Ahwa Block is a predominantly tribal landscape in Gujarat's Dang district, forming part of the ecologically sensitive Western Ghats-Satpura hill system.",
    bodyContext:
      "The landscape is characterised by undulating highlands, narrow valleys, isolated plateaus, dense forest cover, and a network of seasonal streams originating in high-rainfall zones. Its basaltic geology and heavy monsoonal precipitation make it ecologically significant but highly constrained for irrigation-led agriculture. Livelihoods are closely linked to rainfed farming, forests, and seasonal migration. The agroecological pathway for Ahwa is rooted in building climate resilience, enhancing adaptation, and enabling mitigation across the landscape.",
    agroclimaticZone:
      "Northern Hill Zone of Gujarat (Zone XIII), South Gujarat heavy rainfall area (GJ-1), influenced by the Western Ghats. Humid to sub-humid monsoon climate with high rainfall and pronounced seasonality.",
    area: "35,000 Ha",
    population: "50,000",
    households: "10,000",
    villages: "65",
    keyChallenges: [
      "Persistent livelihood and ecological constraints due to hilly terrain, high forest dependence, and rainfed agriculture.",
      "Predominantly monsoon-dependent farming with limited irrigation, leading to single-season cropping, low productivity, and high vulnerability to rainfall variability.",
      "Steep slopes, high runoff, and fragile soils causing soil erosion, nutrient loss, and degradation of agricultural and common lands.",
      "Narrow, seasonal livelihood options drive distress migration, weakening local labour availability for agriculture and allied activities.",
      "Marginal landholdings, poverty, and limited access to technical services constrain household capacity to invest in resilient systems.",
    ],
    lipStatus: "published",
    photos: [
      {
        src: "/images/landscapes/ahwa/01.jpg",
        caption: "Ahwa · Western Ghats, Gujarat",
        credit: "CAT field team",
        width: 1800,
        height: 1350,
      },
      {
        src: "/images/landscapes/ahwa/02.jpg",
        caption: "Ahwa · Field documentation",
        credit: "CAT field team",
        width: 1800,
        height: 1200,
      },
    ],
  },

  chitrakonda: {
    slug: "chitrakonda",
    name: "Chitrakonda",
    district: "Malkangiri district",
    region: "Eastern Ghats, Odisha",
    stateCode: "OD",
    gloss: "Tribal block in southern Odisha. Once cut off by the Balimela Reservoir; transitioning from Podu to settled farming.",
    context:
      "Chitrakonda block in Odisha's Malkangiri district is characterised by steep hills, dense forests, and rich biodiversity, drained by the Sileru, Sabari, and Machkund rivers.",
    bodyContext:
      'Historically known as the "Cut-off Area" due to severe isolation by the Balimela Reservoir, the region is currently undergoing significant transformation. Livelihoods are shifting from traditional Podu cultivation to settled farming, and the Odisha government is placing strong emphasis on development following the construction of the strategic Gurupriya Bridge. The agroecological pathway for Chitrakonda is rooted in building climate resilience, enhancing adaptation, and enabling mitigation across the landscape.',
    agroclimaticZone:
      "Eastern Plateau and Hills Region. The landscape falls within the Southern Eastern Ghats, under Agro-Climatic Zone VII as classified by the Planning Commission. Average annual rainfall 1279-1554 mm.",
    area: "33,600 Ha",
    population: "30,900",
    households: "6,600",
    villages: "19",
    keyChallenges: [
      "Steep slopes and erratic rainfall cause severe erosion, limiting agriculture to a single rainfed season.",
      "Decades of geographic isolation by the Balimela Reservoir continue to hinder market access despite recent connectivity improvements.",
      "Over 95% of households live in poverty, trapped in subsistence cycles with no financial capacity to invest in farm improvements.",
      "Marginal landholdings constrain food security; wildlife disturbances add occasional uncertainty to livelihoods.",
    ],
    lipStatus: "published",
    photos: [
      {
        src: "/images/landscapes/chitrakonda/01.jpg",
        caption: "Chitrakonda · Eastern Ghats, Odisha",
        credit: "CAT field team",
        width: 1800,
        height: 1350,
      },
      {
        src: "/images/landscapes/chitrakonda/02.jpg",
        caption: "Chitrakonda · Field documentation",
        credit: "CAT field team",
        width: 1800,
        height: 1350,
      },
    ],
  },

  dantewada: {
    slug: "dantewada",
    name: "Dantewada",
    district: "Dantewada district",
    region: "Bastar Plateau, Chhattisgarh",
    stateCode: "CG",
    gloss: "Tribal block in Chhattisgarh's Bastar Plateau. National leader in organic farming with 110 villages under Large Area Certification.",
    context:
      "The Dantewada block in Chhattisgarh's Bastar Plateau features highly undulating terrain (elevation 50-1,025 m) with hills, valleys, plateaus, forests, and rivers. It is predominantly rural and tribal — home to Gondi, Madiya, Muriya and Halba communities.",
    bodyContext:
      "Farming is mostly rainfed on lateritic, yellow clay, sandy loam, and black soils. Dantewada is a national leader in organic farming, with 110 villages under Large Area Certification, and supports rich NTFP-based livelihoods from mahua, tamarind, tendu leaves, and diverse indigenous crops. The agroecological pathway for Dantewada is rooted in building climate resilience, enhancing adaptation, and enabling mitigation across the landscape.",
    agroclimaticZone:
      "Bastar Plateau agroclimatic zone, part of the Eastern Plateau & Hills region. Sub-humid to semi-humid climate with hot summers and moderate rainfall.",
    area: "13,700 Ha",
    population: "39,200",
    households: "8,960",
    villages: "29",
    keyChallenges: [
      "Water scarcity and minimal irrigation (only 2.33% of cropped area irrigated) keep agriculture highly monsoon-dependent.",
      "Climate variability — erratic, delayed and heavy rains with prolonged dry spells — disrupts sowing, damages crops, and undermines NTFP quantity and quality.",
      "Undulating terrain, intense monsoons, and light soils drive severe erosion, nutrient loss, and declining crop productivity.",
      "Weak storage, processing, and road connectivity cause post-harvest losses, distress sales, and limited market access.",
      "Multi-Dimensional Poverty Index of 0.135 (nearly double the rural state average) signals deep socio-economic vulnerability.",
    ],
    lipStatus: "published",
    photos: [
      {
        src: "/images/landscapes/dantewada/01.jpg",
        caption: "Dantewada · Bastar Plateau, Chhattisgarh",
        credit: "CAT field team",
        width: 1800,
        height: 829,
      },
      {
        src: "/images/landscapes/dantewada/02.jpg",
        caption: "Dantewada · Field documentation",
        credit: "CAT field team",
        width: 1800,
        height: 1201,
      },
    ],
  },

  dharashiv: {
    slug: "dharashiv",
    name: "Dharashiv",
    district: "Dharashiv district (formerly Osmanabad)",
    region: "Marathwada, Maharashtra",
    stateCode: "MH",
    gloss: "Drought-prone rural block in Marathwada. Black cotton soils, semi-arid, in the rain-shadow of the Western Ghats.",
    context:
      "A predominantly rural block at the administrative core of Dharashiv district (formerly Osmanabad) in Maharashtra's Marathwada region. The landscape lies in the hot semi-arid eco-region of the Deccan Plateau.",
    bodyContext:
      "It is characterised by gently undulating basaltic terrain, black cotton soils, and a highly variable southwest monsoon. Agriculture is largely rainfed and closely tied to monsoon behaviour, while its central location facilitates access to markets, public offices, and essential services for surrounding villages. The agroecological pathway for Dharashiv is rooted in building climate resilience, enhancing adaptation, and enabling mitigation across the landscape.",
    agroclimaticZone:
      "Deccan Plateau, Hot Semi-Arid Eco-Region, in the rain-shadow of the Western Ghats. Hot semi-arid climate, gently undulating basaltic terrain, black cotton soils, highly variable monsoon rainfall.",
    area: "23,200 Ha",
    population: "55,400",
    households: "11,950",
    villages: "35",
    keyChallenges: [
      "Erratic monsoons, recurrent droughts, and extreme rainfall events drive soil degradation, groundwater depletion, and declining productivity of black cotton soils.",
      "Input-intensive, monocrop agriculture leads to high costs, seasonal unemployment, distress migration, and limited income diversification.",
      "Semi-critical basaltic aquifers, low tree cover, and degraded commons reduce ecological buffering and water security.",
      "Persistent poverty, fragmented holdings, nutrition insecurity, and uneven access to extension services — particularly for women and marginal farmers.",
    ],
    lipStatus: "published",
    photos: [
      {
        src: "/images/landscapes/dharashiv/01.jpg",
        caption: "Dharashiv · Marathwada, Maharashtra",
        credit: "CAT field team",
        width: 1800,
        height: 1200,
      },
      {
        src: "/images/landscapes/dharashiv/02.jpg",
        caption: "Dharashiv · Field documentation",
        credit: "CAT field team",
        width: 1800,
        height: 1350,
      },
    ],
  },

  "khatarshnong-laitkroh": {
    slug: "khatarshnong-laitkroh",
    name: "Khatarshnong–Laitkroh",
    district: "East Khasi Hills district",
    region: "Meghalaya Plateau",
    stateCode: "ML",
    gloss: "High-rainfall block in Meghalaya's Khasi Hills, part of the Sohra (Cherrapunjee) region. Indigenous bun, jhum, and bri cultivation.",
    context:
      "The Khatarshnong–Laitkroh Community Development Block lies in the high-rainfall southern slopes of the Meghalaya Plateau, forming part of the Sohra (Cherrapunjee) region.",
    bodyContext:
      "The landscape is governed under the Sixth Schedule through Hima Sohra and village Dorbar shnong institutions. It is characterised by extremely high rainfall, dissected plateaus and valleys, and Indigenous food systems based on bun, jhum, and bri cultivation. Land is governed primarily under customary tenure: clan/lineage land, communal raid (Ri-Raid) land, and homestead gardens (bri), with Panchayati Raj not applicable; nearly all forest land is community-owned. The agroecological pathway here is rooted in building climate resilience, enhancing adaptation, and enabling mitigation across the landscape.",
    agroclimaticZone:
      "Eastern Himalayan Region (Zone 2). Humid and warm, very high rainfall (400-1,000 cm), mild subtropical highland climate. Sohra-station annual rainfall ~12,204 mm (1901-2023 average).",
    area: "32,400 Ha",
    population: "33,500",
    households: "6,580",
    villages: "94",
    keyChallenges: [
      "Extremely high rainfall, steep slopes (>50°), and shallow soils cause high runoff (~80%) and low groundwater recharge.",
      "Entirely rainfed farming with short monsoon-tied cropping windows; winter crops limited to homestead gardens.",
      "Soil fertility decline, shortened jhum/bun fallows, and erosion undermine Indigenous agro-ecosystems.",
      "Rising use of hybrid seeds, synthetic fertilisers, and pesticides threatens ecological balance.",
      "Poor transport access and headloading raise drudgery and costs, limiting market engagement.",
      "Stunting, anaemia, and 25-30% BPL reflect persistent livelihood and nutrition vulnerabilities.",
    ],
    lipStatus: "published",
    photos: [
      {
        src: "/images/landscapes/khatarshnong-laitkroh/01.jpg",
        caption: "Khatarshnong–Laitkroh · Meghalaya Plateau",
        credit: "CAT field team",
        width: 1800,
        height: 1008,
      },
      {
        src: "/images/landscapes/khatarshnong-laitkroh/02.jpg",
        caption: "Khatarshnong–Laitkroh · Field documentation",
        credit: "CAT field team",
        width: 1800,
        height: 1200,
      },
    ],
  },

  mau: {
    slug: "mau",
    name: "Mau",
    district: "Chitrakoot district",
    region: "Bundelkhand, Uttar Pradesh",
    stateCode: "UP",
    gloss: "Semi-arid Bundelkhand block in UP. Rolling undulations, rocky patches, extreme moisture stress along the Yamuna.",
    context:
      "Located in the Bundelkhand plateau, Mau Block (Chitrakoot district, UP) is a semi-arid landscape characterised by rolling undulations, rocky land patches, and extreme moisture stress.",
    bodyContext:
      "The Yamuna River and seasonal streams define its hydrology. Agriculture is dominated by fragmented smallholdings, while forests face degradation from overgrazing. High poverty and reliance on low-value wage labour intensify local vulnerability. The region remains ecologically sensitive, necessitating a transition toward climate-resilient agroecological systems. The agroecological pathway for Mau is rooted in building climate resilience, enhancing adaptation, and enabling mitigation across the landscape.",
    agroclimaticZone:
      "Central Plateau and Hills Region. Hot semi-arid climate (dry sub-humid to dry-arid) with monsoonal rainfall. Elevation 87.5-213 m (mean ~127 m). Rolling undulations typical of Bundelkhand transitional landscapes.",
    area: "13,800 Ha",
    population: "66,000",
    households: "8,350",
    villages: "25",
    keyChallenges: [
      "Erratic rainfall and prolonged dry spells cause crop failures despite irrigation, creating acute climatic stress.",
      "Lateritic soils have low fertility, declining organic carbon, and severe erosion.",
      "More than half of children are malnourished and anaemic, with similar deficiencies among women.",
      "Grazing pressure and degraded forests limit fodder, undermining livestock productivity.",
      "High poverty, fragmented landholdings, divided society, migration, and reliance on low-value wage labour intensify vulnerability and limit diversification.",
    ],
    lipStatus: "published",
    photos: [
      {
        src: "/images/landscapes/mau/01.jpg",
        caption: "Mau · Bundelkhand, Uttar Pradesh",
        credit: "CAT field team",
        width: 1800,
        height: 1350,
      },
      {
        src: "/images/landscapes/mau/02.jpg",
        caption: "Mau · Field documentation",
        credit: "CAT field team",
        width: 1800,
        height: 1350,
      },
    ],
  },

  pangi: {
    slug: "pangi",
    name: "Pangi",
    district: "Chamba district",
    region: "Pir Panjal-Zanskar, Himachal Pradesh",
    stateCode: "HP",
    gloss: "High-altitude Himalayan block, isolated six months a year. HP's first natural farming sub-division (April 2025).",
    context:
      "The Pangi landscape is a high-altitude Himalayan region in the upper reaches of Chamba district, Himachal Pradesh, between the Pir Panjal and Zanskar ranges.",
    bodyContext:
      "Marked by rugged terrain, alpine ecosystems, and extreme climate, the region remains isolated for nearly six months each year due to heavy snowfall. A short growing season, traditional farming, and dependence on indigenous livestock systems and forest resources shape livelihoods. In April 2025, Pangi was declared Himachal Pradesh's first natural farming sub-division following sustained advocacy by local traditional governing institutions, the Praja Mandal. The agroecological pathway for Pangi is rooted in building climate resilience, enhancing adaptation, and enabling mitigation across the landscape.",
    agroclimaticZone:
      "Agro-Climatic Zone IV, cold temperate to alpine Himalayan (Cold Dry) zone. Cool summers, low rainfall, severe and prolonged winters, snow-fed hydrology. Elevations from ~3,000 to over 4,000 m with skeletal soils in upper reaches and sub-mountain soils in lower valleys.",
    area: "1,60,000 Ha",
    population: "24,400",
    households: "6,100",
    villages: "60",
    keyChallenges: [
      "Long, severe winters and six months of isolation restrict farming to a short growing season and limit access to markets, services, and inputs.",
      "Small and marginal farms face high climate risk; recent crop failures from unusual weather events reduce productivity, incomes, and reliability.",
      "The shift to commercial crops has reduced traditional grain cultivation, increased dependence on government rations, and weakened food security.",
      "Declining herd sizes and rising losses from predators (snow leopards, wolves, bears) stress livestock-based livelihoods.",
      "Poor energy, transport, and digital connectivity constrain extension services, enterprise development, and market access; fuelwood dependence persists.",
      "Climate change heightens risks to snow-fed water systems.",
    ],
    lipStatus: "in_preparation",
    photos: [
      {
        src: "/images/landscapes/pangi/01.jpg",
        caption: "Pangi · Pir Panjal-Zanskar, Himachal Pradesh",
        credit: "CAT field team",
        width: 1800,
        height: 1347,
      },
      {
        src: "/images/landscapes/pangi/02.jpg",
        caption: "Pangi · Field documentation",
        credit: "CAT field team",
        width: 1800,
        height: 1192,
      },
    ],
  },

  patharpratima: {
    slug: "patharpratima",
    name: "Patharpratima",
    district: "Kakdwip subdivision, South 24 Parganas",
    region: "Sundarbans delta, West Bengal",
    stateCode: "WB",
    gloss: "Sundarbans delta block at West Bengal's southern tip. Defined by tidal channels, cyclones, and embankment vulnerability.",
    context:
      "The Patharpratima Community Development (C.D.) Block is a predominantly rural region at the southernmost tip of West Bengal, part of the Sundarbans deltaic system.",
    bodyContext:
      "The landscape is defined by a dense network of tidal channels, creeks, and distributaries of the Ganga River. Its low-lying, estuarine setting forms a unique mangrove-dominated ecosystem but also makes it highly vulnerable to cyclones, tidal surges, and embankment breaches. Limited local livelihood opportunities mean seasonal and long-term migration is a reality for many households, with remittances playing a significant role in sustaining the local economy. The agroecological pathway for Patharpratima is rooted in building climate resilience, enhancing adaptation, and enabling mitigation across the landscape.",
    agroclimaticZone:
      "Lower Gangetic Plain (Agro-Climatic Zone III) and the Coastal Saline Zone (WB-6). Sub-tropical eastern coastal plain, hot subhumid to semi-arid ecoregion. Flat alluvial deltaic landscape with tidal creeks, estuarine channels, and reclaimed embanked land.",
    area: "8,300 Ha",
    population: "56,000",
    households: "11,700",
    villages: "17",
    keyChallenges: [
      "Chronic ecological vulnerability from recurrent cyclones, tidal flooding, and saline water ingress, affecting agriculture, settlements, and natural ecosystems.",
      "Agriculture is predominantly synthetic-chemical-input led; exorbitant use of chemical inputs has adversely affected soil health, lowering crop yields.",
      "Livelihoods are predominantly climate-sensitive and poorly diversified, resulting in low productivity, seasonal unemployment, and distress migration.",
      "Weak physical connectivity, fragile embankments, small marketable surpluses, and limited storage and processing restrict market access and income potential.",
      "Persistent poverty, marginal landholdings, and gendered vulnerabilities constrain households' capacity to adapt and invest in resilient livelihoods.",
    ],
    lipStatus: "published",
    photos: [
      {
        src: "/images/landscapes/patharpratima/01.jpg",
        caption: "Patharpratima · Sundarbans delta, West Bengal",
        credit: "CAT field team",
        width: 1800,
        height: 1350,
      },
      {
        src: "/images/landscapes/patharpratima/02.jpg",
        caption: "Patharpratima · Field documentation",
        credit: "CAT field team",
        width: 1800,
        height: 1350,
      },
    ],
  },

  patratu: {
    slug: "patratu",
    name: "Patratu",
    district: "Ramgarh district",
    region: "Chotanagpur Plateau, Jharkhand",
    stateCode: "JH",
    gloss: "Humid subtropical block on Jharkhand's Chotanagpur plateau. NABARD JIVA project being scaled as a CAT landscape.",
    context:
      "Situated on Jharkhand's Chotanagpur plateau, Patratu is a humid subtropical landscape defined by the Damodar and Nalkarni river systems.",
    bodyContext:
      "Despite high rainfall, the region faces seasonal water scarcity due to rapid runoff across sloping, coarse-soiled terrain. Agriculture is predominantly rainfed and smallholder-based, often limited to mono-crop paddy. Mining-related fragmentation and soil acidity further constrain productivity, while proximity to urban markets offers significant potential for high-value agro-ecological diversification. Patratu stands out as one of NABARD's most successful JIVA projects, with plans for scaling up as a CAT landscape. The agroecological pathway for Patratu is rooted in building climate resilience, enhancing adaptation, and enabling mitigation across the landscape.",
    agroclimaticZone:
      "Eastern Plateau and Hills Region (Zone VII). Humid subtropical climate with pronounced summer and winter seasons. Elevation 322-988 m (mean ~430 m).",
    area: "10,700 Ha",
    population: "35,700",
    households: "6,660",
    villages: "31",
    keyChallenges: [
      "Coarse soils and sloping terrain lead to rapid runoff, limiting water retention even during high rainfall.",
      "Dependence on single-crop paddy leads to seasonal unemployment and distress migration among tribal households.",
      "Acidic soils with low organic carbon reduce productivity and increase erosion.",
      "Poor market access allows middleman exploitation; inadequate housing and disease management lead to high livestock mortality.",
      "Limited diversification and inadequate post-harvest infrastructure constrain income realisation.",
    ],
    lipStatus: "published",
    photos: [
      {
        src: "/images/landscapes/patratu/02.jpg",
        caption: "Patratu landscape · Monsoon morning · Ramgarh district",
        credit: "CAT field team",
        date: "2024-08-09",
        width: 1800,
        height: 1350,
      },
      {
        src: "/images/landscapes/patratu/03.jpg",
        caption: "Patratu landscape · Late monsoon · Field documentation",
        credit: "CAT field team",
        date: "2024-09-21",
        width: 1800,
        height: 1350,
      },
      {
        src: "/images/landscapes/patratu/01.jpg",
        caption: "Patratu landscape · Winter season · Field documentation",
        credit: "CAT field team",
        date: "2023-02-17",
        width: 1350,
        height: 1800,
      },
    ],
  },

  rajnagar: {
    slug: "rajnagar",
    name: "Rajnagar",
    district: "Chhatarpur district",
    region: "Bundelkhand, Madhya Pradesh",
    stateCode: "MP",
    gloss: "Rural Bundelkhand block in MP, transition zone between Central Plateau and Northern Plains. Semi-arid, Ken-river drained.",
    context:
      "Rajnagar Block is a predominantly rural block in northern Madhya Pradesh, situated in the Bundelkhand region. It forms a transition zone between the Central Plateau and the Northern Plains of Chhatarpur district.",
    bodyContext:
      "The gently undulating landscape, under semi-arid conditions, is shaped by seasonal streams that drain into the Ken River system. Production is dominated by rainfed agriculture and a high dependence on smallholder cultivation and wage labour. The agroecological pathway for Rajnagar is rooted in building climate resilience, enhancing adaptation, and enabling mitigation across the landscape.",
    agroclimaticZone:
      "Bundelkhand Agro-Climatic Zone (Zone V) within the Central Plateau and Hills Region (Region VIII); Agro-Ecological Sub-Region 10.1 — Northern Madhya Pradesh, Bundelkhand Plateau.",
    area: "38,100 Ha",
    population: "95,200",
    households: "17,200",
    villages: "38",
    keyChallenges: [
      "Semi-arid climate, erratic monsoon, shallow erosion-prone soils, and patchy irrigation drive chronic production and climate risks.",
      "Agriculture-dominated livelihoods with few non-farm options lead to low, volatile incomes and seasonal underemployment.",
      "Soil degradation, moisture stress, and fragmented smallholdings limit the use of inputs and investment in risk-reducing technologies.",
      "Poverty, malnutrition, gendered literacy gaps, and a low sex ratio deepen household-level vulnerability.",
      "Uneven access to health services, credit, and markets constrains livelihood upgrading and enterprise growth.",
    ],
    lipStatus: "published",
    photos: [
      {
        src: "/images/landscapes/rajnagar/01.jpg",
        caption: "Rajnagar · Bundelkhand, Madhya Pradesh",
        credit: "CAT field team",
        width: 1800,
        height: 1350,
      },
      {
        src: "/images/landscapes/rajnagar/02.jpg",
        caption: "Rajnagar · Field documentation",
        credit: "CAT field team",
        width: 1800,
        height: 1200,
      },
    ],
  },

  vempalli: {
    slug: "vempalli",
    name: "Vempalli",
    district: "YSR Kadapa district",
    region: "Rayalaseema, Andhra Pradesh",
    stateCode: "AP",
    gloss: 'Semi-arid Deccan Plateau block in Rayalaseema. Known as the "Second Bangalore" for high-quality lemon production.',
    context:
      "Vempalli block in YSR Kadapa district serves as the rugged gateway to the Papaghni River. Dominated by the semi-arid Deccan Plateau's rocky outcrops and scrub forests, the terrain varies significantly from ridges to valleys.",
    bodyContext:
      'Yet this landscape is agriculturally rich: fertile alluvial and black soils support a diverse cropping system. Most notably, Vempalli is historically celebrated as the "Second Bangalore" for its exceptionally high-quality lemon production, which remains a defining feature of the local economy. The agroecological pathway for Vempalli is rooted in building climate resilience, enhancing adaptation, and enabling mitigation across the landscape.',
    agroclimaticZone:
      "Deccan Plateau (hot, semi-arid/arid) agro-climatic zone. Semi-arid tropical climate, hot summers, low to moderate rainfall.",
    area: "13,100 Ha",
    population: "36,500",
    households: "9,140",
    villages: "18",
    keyChallenges: [
      "Acute hydrological stress from semi-arid climate, recurrent droughts, and overexploitation of groundwater through deep borewells; declining water tables and fluoride contamination.",
      "Livelihoods increasingly vulnerable due to shift towards high-input monocropping of banana, cotton, Bengal gram, chrysanthemum, and paddy — soil degradation, rising pest incidence, exposure to volatile market prices.",
      "Severe human-wildlife conflict acts as a structural barrier to farmers cultivating diverse food crops, threatening household nutritional security.",
      "Limited access to grazing commons due to land-use changes, coupled with labour shortages, has constrained the traditional livestock sector.",
    ],
    lipStatus: "published",
    photos: [
      {
        src: "/images/landscapes/vempalli/01.jpg",
        caption: "Vempalli · Paddy fields below the red sandstone hills of YSR Kadapa",
        credit: "CAT field team",
        width: 1600,
        height: 1200,
      },
      {
        src: "/images/landscapes/vempalli/02.jpg",
        caption: "Vempalli · A field walk with farmers and the landscape team",
        credit: "CAT field team",
        width: 1200,
        height: 1600,
      },
    ],
  },
};
