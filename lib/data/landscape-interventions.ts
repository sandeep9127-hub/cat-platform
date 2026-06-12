/**
 * Landscape interventions — verbatim from the CAT "Landscape Transformation
 * Profiles: Agroecological Pathways from Eleven Landscapes" booklet (May 2026),
 * the "Important Landscape Interventions" section of each landscape's spread.
 *
 * Editorial truth: do not paraphrase. Category names are kept as printed; the
 * UI maps each to the nearest CAT intervention category for its icon + colour.
 */

export type Intervention = { title: string; body: string };
export type InterventionGroup = { category: string; items: Intervention[] };

export const LANDSCAPE_INTERVENTIONS: Record<string, InterventionGroup[]> = {
  ahwa: [
    {
      category: "Agriculture, Horticulture & Agroforestry",
      items: [
        { title: "Strengthening traditional seed conservation and crop diversity", body: "Through community-managed, farmer-led seed systems. To protect agrobiodiversity and strengthen climate resilience." },
        { title: "Strengthening integrated crop development and value chains", body: "To stabilise yields, improve quality, and enable market-linked surplus through cluster- and block-level FPOs." },
        { title: "Promoting a modified Wadi model", body: "To diversify farm income, enhance biodiversity, and strengthen climate-resilient livelihood assets for small and marginal farmers." },
        { title: "Promoting vegetable cultivation", body: "To diversify livelihoods, enhance nutrition, and improve market-linked income opportunities." },
      ],
    },
    {
      category: "Natural Resource Management",
      items: [
        { title: "Facilitating GPDP planning and implementation", body: "Using a ridge-to-valley approach to strengthen integrated natural resource management across villages." },
        { title: "Implementing decentralised irrigation systems", body: "Lift- and diversion-based solutions, to improve water access, stabilise production, and support agroecological livelihoods." },
      ],
    },
    {
      category: "Forestry & NTFP",
      items: [
        { title: "Promoting community-led plantation of native forest species on forest and common lands", body: "Through MGNREGA to restore biodiversity and strengthen access to non-timber forest produce (NTFPs)." },
      ],
    },
    {
      category: "Livestock Management",
      items: [
        { title: "Scaling backyard poultry", body: "Indigenous breeds to improve household nutrition, generate supplementary income, and strengthen women-led livelihoods." },
        { title: "Strengthening goat rearing", body: "Pashu Sakhi-led model units, and FPO-managed revolving funds to overcome subsidy and access barriers for poor households and support diversifying the livelihoods." },
      ],
    },
    {
      category: "Biodiversity",
      items: [
        { title: "Establishing a biodiversity register and community volunteering programme", body: "To document, monitor, and strengthen agriculture-relevant biodiversity and ecosystem services." },
      ],
    },
    {
      category: "Nutrition",
      items: [
        { title: "Implementing community-based nutrition education", body: "In schools, via awareness campaigns, and frontline worker training to improve food choices and nutrition outcomes." },
      ],
    },
    {
      category: "Energy",
      items: [
        { title: "Introducing dairy-linked biogas units", body: "To provide clean energy, reduce fuelwood dependence, and support circular nutrient use in agroecological farming systems." },
      ],
    },
    {
      category: "Institutional Strengthening",
      items: [
        { title: "Strengthening Farmer-Producer Organisations", body: "To support aggregate, process, and market agricultural, livestock, and NTFP products, improving price realisation and market access for tribal farmers." },
      ],
    },
    {
      category: "Knowledge Building",
      items: [
        { title: "Strengthening local agroecological extension", body: "Training CRPs, Prakrutik Krishi Sakhis, and Pashu Sakhis to improve last-mile outreach, farmer handholding, and knowledge transfer across agriculture and livestock." },
        { title: "Establishing village-level Farmer Field Schools", body: "Led by CRPs and Prakrutik Krishi Sakhis to enable hands-on, peer-based learning and demonstration of agroecological practices." },
      ],
    },
  ],

  chitrakonda: [
    {
      category: "Agriculture, Horticulture & Agroforestry",
      items: [
        { title: "Poly-cropping & Rice Fallow", body: "Transition from monocultures to pulse, millet, and turmeric-based poly-cropping, introducing short-duration Rabi pulses in rice fallows to optimise residual moisture and cropping intensity." },
        { title: "Bio Resource Centres", body: "Build a self-enabling local ecosystem for bio-input production, ensuring chemical-free farming and input self-sufficiency." },
        { title: "Organic Value Chains", body: "Facilitate organic certification for niche markets and institutional supply, along with organic vegetable clusters and fruit orchards (Cashew, Mango, Banana) for year-round income and nutrition." },
      ],
    },
    {
      category: "Natural Resource Management",
      items: [
        { title: "Silvicultural Agroforestry on Uplands", body: "Rejuvenate degraded forests using farmer-preferred species for fuel and fodder, supported by community nurseries to provide a local supply of high-quality planting materials." },
        { title: "Water & Watershed", body: "Harness mountain streams via gravity-flow and solar-lift irrigation. Implement ridge-to-valley measures (contour bunds, trenches, farm ponds) to control erosion and enhance groundwater recharge." },
        { title: "Integrated Ponds", body: "Transform farm ponds into integrated units to optimise water utilisation and support allied production systems." },
      ],
    },
    {
      category: "Livestock Management",
      items: [
        { title: "Integrated Backyard Farming", body: "Combine poultry, small ruminants, and vegetables at the household level to diversify income, recycle nutrients." },
        { title: "Health & Housing", body: "Train “Prani Mitras” for decentralised veterinary care. Construct improved goat shelters." },
      ],
    },
    {
      category: "Institutional Strengthening",
      items: [
        { title: "Build FPO Capacity", body: "For aggregation, processing, and collective marketing. Support entrepreneur-run Bio-Resource Centres." },
      ],
    },
    {
      category: "Knowledge Building",
      items: [
        { title: "Breeder Seed Models", body: "To conserve indigenous landraces." },
        { title: "Agroecology Education", body: "Integrate agroecology into school curricula and lead community nutrition campaigns targeting women's groups and youth to address malnutrition and promote resilient dietary habits." },
      ],
    },
    {
      category: "Energy & Infrastructure",
      items: [
        { title: "Renewable Processing", body: "Deploy solar- or hybrid-powered units for primary processing and cold storage at local markets. Promote mobile, tractor-mounted processing units to provide essential services at the doorstep." },
        { title: "Establish Decentralised Custom Hiring Centres", body: "Provide site-specific small equipment to reduce farm drudgery and enhance operational efficiency for smallholders and tenant farmers." },
      ],
    },
  ],

  dantewada: [
    {
      category: "Agriculture, Horticulture & Agroforestry",
      items: [
        { title: "Integrated Organic Paddy Production Systems", body: "Enhance the productivity of 20+ indigenous paddy varieties through improved practices like SRI, line transplantation, and bio-input application while maintaining organic certification and cultural preferences." },
        { title: "Initiating Second and Third Cropping Cycles", body: "Utilise residual soil moisture and expanded irrigation to introduce pulses (chana, moong, kulthi), oilseeds (mustard), and vegetables, breaking the rice-fallow pattern and improving soil health." },
        { title: "Lift Irrigation", body: "Provide lift irrigation systems on rivers/streams in rainfed/water-scarce areas, enabling multiple cropping, reducing crop failure risk, and improving farm incomes." },
        { title: "Green Manuring with Dhaincha/Sun Hemp", body: "Regenerate soil organic carbon and fertility through green manuring, reducing chemical dependency and enhancing moisture retention in upland and midland areas." },
      ],
    },
    {
      category: "Natural Resource Management",
      items: [
        { title: "Landscape-Level Soil & Water Conservation", body: "Control soil erosion and enhance groundwater recharge through contour bunds, check dams, farm ponds, and watershed interventions in upland and midland areas with undulating terrain." },
        { title: "Restoration of Commons & Forest Fringes", body: "Regenerate degraded grazing lands and forest interfaces through community forest rights management, fodder plantation, and sustainable grazing practices supporting livestock livelihoods." },
      ],
    },
    {
      category: "Agroforestry & NTFP",
      items: [
        { title: "Mahua Seedling Plantation & Net Provision", body: "Strengthen household livelihoods through mahua seedlings plantation on private lands and provision of nets, supporting culturally significant NTFP collection." },
        { title: "NTFP Value Addition & Processing", body: "Enhance income from mahua (flower/seed), tamarind, and tendu leaves through processing units, quality improvement, and market linkages via Bhoomgaadi FPC, benefiting households engaged in NTFP collection." },
      ],
    },
    {
      category: "Livestock Management",
      items: [
        { title: "Strengthening Small Ruminant & Cattle Management", body: "Support households rearing goats and cattle through improved breeds, veterinary services, fodder development, and cattle shed improvements, with urine collection for bio-inputs." },
        { title: "Azolla Cultivation for Livestock Fodder", body: "Address fodder scarcity by cultivating Azolla as a protein-rich livestock feed, reducing grazing pressure on commons and supporting year-round livestock nutrition." },
      ],
    },
    {
      category: "Nutrition",
      items: [
        { title: "Promotion of Nutri-Millets & Vegetable Cultivation", body: "Address household nutritional insecurity by promoting the cultivation of traditional millets (kodo, kutki, ragi) and vegetables in upland areas and baadi plots for consumption and market sale." },
      ],
    },
    {
      category: "Market Development",
      items: [
        { title: "Post-Harvest Infrastructure & Cold Storage", body: "Reduce post-harvest losses and distress sales by establishing dry godowns, cold storage facilities, and drying yards for horticultural produce and paddy." },
      ],
    },
    {
      category: "Institutional Strengthening",
      items: [
        { title: "Strengthening Bhoomgaadi FPC & Market Linkages", body: "Build the capacity of Bhoomgaadi FPC for aggregation, processing, and marketing of organic produce supported by godowns, processing infrastructure, and certification support." },
        { title: "Women-led Bio-Resource Centres (BRCs)", body: "Establish community-owned enterprises managed by SHG members for the production and sale of bio-inputs (Jeevamrit, neem oil, compost), ensuring the availability of low-cost organic inputs at the village level." },
      ],
    },
    {
      category: "Knowledge Building",
      items: [
        { title: "Strengthening Jaivik Karyakartas Network", body: "Expand the cadre of community resource persons providing last-mile technical support, training farmers on agroecological practices, and facilitating adoption across 60 villages." },
      ],
    },
  ],

  dharashiv: [
    {
      category: "Agriculture, Horticulture & Agroforestry",
      items: [
        { title: "Climate-Resilient Cropping", body: "Shift from soybean–sugarcane monocultures to millet–pulse–oilseed intercropping on black cotton soils to reduce external input dependence, mitigate weather risks, and stabilise yields." },
        { title: "Community Seed Banks", body: "Conserve indigenous landraces through local seed banks to ensure timely access to adapted varieties and reduce dependence on external markets." },
        { title: "Tree Integration", body: "Promote fruit and multipurpose trees on farm bunds and homesteads to build long-term livelihood assets and enhance year-round biomass availability." },
      ],
    },
    {
      category: "Natural Resource Management",
      items: [
        { title: "Soil Organic Carbon (SOC) Restoration", body: "Rebuild soil structure and moisture-holding capacity by scaling composting, crop-residue retention, and green manuring, while replacing chemical inputs with on-farm bio-inputs." },
        { title: "Water Security & Budgeting", body: "Maintain watershed structures (check dams, ponds) and implement village-level water budgeting to protect semi-critical aquifers and align crop plans with water availability." },
      ],
    },
    {
      category: "Livestock Management",
      items: [
        { title: "Small Ruminant & Poultry Systems", body: "Enhance cash incomes through Pashu Sakhi-led health services, improved housing, and preventive care for goats and backyard poultry." },
        { title: "Fodder & Housing", body: "Address chronic scarcity via rainfed fodder on bunds and common lands. Upgrade cattle sheds to enable systematic collection of urine and dung for circular nutrient management." },
      ],
    },
    {
      category: "Nutrition",
      items: [
        { title: "Women-led One-Acre Model", body: "Enable women farmers to manage diversified plots with cereals, pulses, and vegetables to secure household nutrition and reduce market dependence." },
      ],
    },
    {
      category: "Post-harvest, Processing & Markets",
      items: [
        { title: "Village-level Value Addition", body: "Establish FPO-led facilities for cleaning, grading, and small-scale processing (e.g., dal milling) to reduce post-harvest losses and improve price realisation." },
      ],
    },
    {
      category: "Energy",
      items: [
        { title: "Clean Energy & Biogas", body: "Introduce biogas units for cooking and slurry-based nutrient management to reduce women's drudgery and fuelwood use." },
      ],
    },
    {
      category: "Institutional Strengthening",
      items: [
        { title: "Strengthening women-led institutions", body: "To strengthen women-led SHGs, Sakhis, and FPOs to advance agroecology and improve smallholder incomes through collective action." },
      ],
    },
    {
      category: "Knowledge Building",
      items: [
        { title: "Livelihood and Agroecology Service Centres", body: "Establish Livelihood and Agroecology Service Centres to provide decentralised technical support through trained women and youth para-professionals linked to KVK, ATMA, and PoCRA." },
        { title: "Rural Finance and Risk Mitigation", body: "Improve access to affordable credit and climate-risk insurance through KCC, SHGs, and FPOs, supported by financial literacy and digital systems." },
      ],
    },
  ],

  "khatarshnong-laitkroh": [
    {
      category: "Agriculture, Horticulture & Agroforestry",
      items: [
        { title: "Forming a pool of barefoot agroecology researchers from local youth", body: "To generate evidence and support community-led transformation." },
        { title: "Deeper study of the three Indigenous food systems (bun, jhum, bri) across 96 villages", body: "To document practices, changes, costs, yields, and millet diversity, and to inform interventions." },
        { title: "Forming Agroecology Learning Circles (ALCs) in all 96 villages", body: "To co-create, test and document agroecological solutions with farmers." },
        { title: "Setting up an International Training Centre on Agroecology at Laitsohpliah", body: "A hub to promote Indigenous food systems learning, training and exchanges." },
        { title: "Community seed banks and seed farmers", body: "For conserving indigenous seeds (including millets) and strengthening local seed systems." },
        { title: "Creating soil health demonstration plots (0.5–1 acre bun/jhum/bri)", body: "To test and package soil-restoring practices (mulching, composting, green manures, legumes, alder, bamboo windbreaks)." },
        { title: "Millet revival through diversified actions", body: "Testing varieties, seed conservation, farmer promotion, millet-based foods and value-added products." },
      ],
    },
    {
      category: "Natural Resource Management",
      items: [
        { title: "Watershed and spring-shed management", body: "Protecting community springs, contour trenches and vegetative bunds, upgrading the Laitsohpliah check dam, and enhancing recharge." },
        { title: "Biocentric restoration and biodiversity parks", body: "For the restoration of degraded lands and community-led Landscape Management Plans (PPLMP), and enhancing eco-tourism." },
      ],
    },
    {
      category: "Livestock Management",
      items: [
        { title: "Integrating livestock (pigs, poultry, cattle, goats)", body: "With agroecological practices through improved composting, manure use and diversified household nutrition." },
        { title: "Strengthening local animal health and feeding practices", body: "To improve the productivity and resilience of smallholder livestock systems." },
      ],
    },
    {
      category: "Fisheries",
      items: [
        { title: "Supporting small-scale aquaculture in ponds and reservoirs where feasible", body: "To promote complementary livelihoods and protein sources." },
      ],
    },
    {
      category: "Energy",
      items: [
        { title: "Exploring alternative energy options using biomass residues, coppicing species like Alnus", body: "To reduce unsustainable fuelwood extraction, with pilots on pelletisation and fuelwood producer groups." },
      ],
    },
    {
      category: "Institutional Strengthening",
      items: [
        { title: "Strengthening customary and community institutions", body: "Like Hima Sohra, Dorbar shnong, BMCs, cooperatives and forming Primary Cooperative Societies and women's cooperatives towards enhanced value addition and marketing." },
      ],
    },
    {
      category: "Knowledge Building",
      items: [
        { title: "Children's Dorbars, biodiversity walks, Mei-Ramew Learning Centre and online Indigenous Peoples Food Systems course", body: "To build inter-generational knowledge and pride in agroecology." },
      ],
    },
  ],

  mau: [
    {
      category: "Agriculture, Horticulture & Agroforestry",
      items: [
        { title: "Climate-Smart Crop Demonstration", body: "Natural farming demonstration plots with millet, pulse and vegetable diversification to improve soil health, nutrition, and farm profitability." },
        { title: "Prakritik Krishi Kendra cum Seed Bank", body: "Women-led bio-input and seed centres to reduce input costs, restore soil biology, and to strengthen local seed sovereignty." },
        { title: "Custom Hiring Centers", body: "Affordable farm mechanisation services to reduce drudgery, improve efficiency and enhance timely climate-adaptive cultivation." },
        { title: "Fruit-Based Agroforestry", body: "Integrated fruit and timber systems on degraded lands for long-term income, carbon sequestration, and agrobiodiversity restoration." },
      ],
    },
    {
      category: "Natural Resource Management",
      items: [
        { title: "Soil and Water Conservation", body: "Watershed structures to reduce erosion, recharge groundwater, stabilise production, and enable multi-season cropping." },
        { title: "Lift Irrigation", body: "Community-managed irrigation systems to convert rainfed land into productive multi-cropped agricultural assets." },
      ],
    },
    {
      category: "Forestry & NTFP",
      items: [
        { title: "NTFP Value Addition", body: "Community-based drying and processing of forest produce to enhance income, reduce losses, and incentivise conservation." },
      ],
    },
    {
      category: "Livestock Management",
      items: [
        { title: "Improved Dairy Management", body: "Scientific dairy practices with improved feeding and health management to increase milk income and soil-enriching manure use." },
        { title: "Improved Goat Rearing", body: "Low-cost housing, fodder systems and vaccination to reduce mortality and strengthen livestock-based household incomes." },
      ],
    },
    {
      category: "Processing, Value Addition and Markets",
      items: [
        { title: "FPO Strengthening", body: "Professionalised farmer collectives to improve aggregation efficiency, price realisation, and market-linked production." },
        { title: "Value Addition Units", body: "Women-led processing enterprises adding value to millets, pulses, fruits and NTFPs for improved margins and shelf life." },
      ],
    },
    {
      category: "Institutional Strengthening",
      items: [
        { title: "Community Resource Persons", body: "Local agroecology facilitators enabling last-mile advisory, adoption of practices, and climate-resilient farming scale-up." },
        { title: "Women Producer Groups", body: "Strengthened women collectives to drive enterprise development, financial inclusion, and inclusive market participation." },
      ],
    },
    {
      category: "Knowledge Building",
      items: [
        { title: "Farmer Field Schools", body: "Experiential learning platforms to strengthen farmer innovation, soil stewardship, and climate adaptation." },
        { title: "Digital Extension and weather services", body: "Mobile-based advisories delivering weather, pest and market intelligence for informed and timely farm decisions." },
      ],
    },
  ],

  pangi: [
    {
      category: "Agriculture, Horticulture & Agroforestry",
      items: [
        { title: "Dissemination of Integrated Scientific Horticulture Approaches", body: "To improve orchard productivity, optimise input use, reduce costs, and strengthen climate-resilient and environmentally sustainable incomes." },
        { title: "Promotion of Cultivation of Traditional Crops", body: "Strengthened farming practices and community seed banks to enhance seed security, improve productivity, strengthen household food self-reliance, and generate income from climate-adapted crops." },
        { title: "Promoting the cultivation of medicinal plants", body: "Farmer capacity building, nursery development, and collective aggregation to enhance productivity, diversify incomes, and support sustainable use of local biodiversity." },
      ],
    },
    {
      category: "Natural Resource Management",
      items: [
        { title: "Reviving traditional Kuhls", body: "Community-led restoration to enhance irrigation efficiency, strengthen agro-biodiversity management, and build climate-resilient agriculture." },
      ],
    },
    {
      category: "Forestry & NTFP",
      items: [
        { title: "Promoting sustainable harvesting, cultivation, and aggregation of NTFPs through FPOs", body: "To improve price realisation, strengthen forest-based livelihoods, and ensure conservation of high-value medicinal and aromatic species." },
        { title: "Forest Area Regeneration through Plantation of Native NTFPs and high-value tree species", body: "To restore biodiversity, strengthen ecological resilience, and support sustainable forest-based livelihoods." },
      ],
    },
    {
      category: "Livestock Management",
      items: [
        { title: "Strengthening the traditional Adhwari livestock system", body: "Local extension facilitators and predator-proof shelters to improve animal health, milk quality, livestock survival, and the resilience and safety of high-altitude pastoral livelihoods." },
        { title: "Pasture development", body: "Regeneration of degraded alpine pastures to enhance fodder availability, improve livestock productivity, and strengthen ecological resilience." },
        { title: "Strengthening wool- and dairy-based value addition", body: "To increase incomes and sustain traditional pastoral livelihoods." },
      ],
    },
    {
      category: "Biodiversity",
      items: [
        { title: "Strengthening community-led management of Biodiversity Heritage Sites and identifying OECM hotspots", body: "To conserve high-altitude biodiversity while sustaining traditional livelihoods." },
      ],
    },
    {
      category: "Nutrition",
      items: [
        { title: "Introducing nutrient-rich, high-altitude-adapted crops in kitchen gardens with improved greenhouse integration", body: "To enable year-round vegetable cultivation, enhance household nutrition, reduce dependence on distant markets, and strengthen food self-sufficiency." },
      ],
    },
    {
      category: "Energy & Infrastructure",
      items: [
        { title: "Upgrading traditional water mills (Gharats) with improved technologies", body: "To enhance milling efficiency, reduce drudgery, strengthen local food security, and sustain renewable, community-managed energy systems." },
      ],
    },
    {
      category: "Other Livelihood Sources",
      items: [
        { title: "Promoting rural and eco-tourism", body: "Capacity building of homestay owners to create alternative livelihoods and ensure sustainable tourism development." },
      ],
    },
  ],

  patharpratima: [
    {
      category: "Agriculture, Horticulture & Agroforestry",
      items: [
        { title: "Land shaping-based integrated farming", body: "Crops-fishery-livestock-poultry farming model to convert waterlogged paddy fields and current land area into climate-resilient agroecological production systems, improve household food and nutrition security through diversified on-farm production." },
        { title: "Eliminating the use of chemical synthetic inputs and promoting diversification", body: "Restore soil health, improve household food & nutrition security, and enhance resilience to climatic stress." },
        { title: "Strengthening of Community Seed Bank (CSB)", body: "To ensure timely access to climate-resilient indigenous seeds, thereby reducing vulnerability of smallholders to external seed markets." },
        { title: "Promotion of Fruit-Bearing Trees in Homestead Land", body: "To enhance year-round access to nutrition." },
        { title: "Improved Betel Vine Management practices", body: "Stabilise household livelihoods by reducing disease incidence, lowering input dependence, and sustaining productivity." },
      ],
    },
    {
      category: "Natural Resource Management",
      items: [
        { title: "Promoting farm ponds for rainwater harvesting and bunds for vegetable cultivation", body: "Improve fresh water availability, support diversified production, and reduce climate-induced risks in agriculture and allied livelihoods." },
        { title: "Embankment protection (coastal and riverine region)", body: "Restore mangrove and coastal biodiversity, protect lives and livelihoods, and enhance ecosystem services for long-term climate proofing." },
      ],
    },
    {
      category: "Aquaculture",
      items: [
        { title: "Promotion of polyculture pond-based fisheries — Indian Major Carp (IMC) + Small Indigenous Species (SIS)", body: "Increase the availability of fish for household consumption and enhance the resilience of homestead waterbodies." },
        { title: "Supporting crab fattening using cage technology", body: "To diversify coastal livelihoods, generate short-cycle income, and reduce pressure on wild crab populations." },
        { title: "Rejuvenation of the local hatchery", body: "Ensure timely access to climate-adapted, indigenous fish seeds and strengthen self-reliant, sustainable aquaculture in the landscape." },
      ],
    },
    {
      category: "Livestock Management",
      items: [
        { title: "Promoting improved small ruminant and poultry rearing practices", body: "Increase household nutrition, reduce mortality, and strengthen women-led livelihoods." },
        { title: "Improving existing cattleshed", body: "Support agroecological farming with dung–urine collection, and enhance animal health." },
      ],
    },
    {
      category: "Energy & Infrastructure",
      items: [
        { title: "Introducing household biogas units", body: "To meet clean energy needs, reduce dependence on fuelwood, improve women's health, and recycle organic waste for circular farm nutrient systems." },
      ],
    },
    {
      category: "Institutional Strengthening",
      items: [
        { title: "Strengthening women-led FPC (Alor Thikana)", body: "To support aggregation, improve market access, and enterprise sustainability that enhances livelihood stability for smallholder farmers." },
      ],
    },
    {
      category: "Knowledge Building",
      items: [
        { title: "Establishment of Livelihood Service Centres (LSCs)", body: "To provide decentralised, last-mile technical support and handholding, enabling the adoption of climate-resilient and sustainable practices." },
      ],
    },
  ],

  patratu: [
    {
      category: "Agriculture, Horticulture & Agroforestry",
      items: [
        { title: "Sustainable Rice Intensification (SRI)", body: "Transplanting young seedlings with alternate wetting-drying to increase yields, save water, reduce emissions, and improve soil health." },
        { title: "Vegetable Clusters", body: "Organised off-season vegetable production with collective marketing for diversified income, improved nutrition, and climate-resilient livelihoods." },
      ],
    },
    {
      category: "NRM - Community",
      items: [
        { title: "Rainwater Harvesting", body: "Community water budgeting and harvesting structures for groundwater recharge and climate-resilient agriculture." },
      ],
    },
    {
      category: "NRM - Private",
      items: [
        { title: "Bio-Resource Production", body: "Women-led bio-input production to restore soil fertility and reduce chemical dependency." },
      ],
    },
    {
      category: "Forestry & NTFP",
      items: [
        { title: "NTFP Value Addition", body: "Community processing of forest produces to increase tribal incomes and promote sustainable forest management." },
        { title: "WADI Orchard Expansion", body: "Diversified orchards with intercropping for stable incomes, degraded land restoration, and carbon sequestration." },
      ],
    },
    {
      category: "Livestock Management",
      items: [
        { title: "Piggery Promotion", body: "Improved pig rearing systems for high-return livelihoods and enhanced protein nutrition." },
        { title: "Goat Rearing", body: "Scientific goat management to reduce mortality and strengthen household financial security." },
      ],
    },
    {
      category: "Fisheries",
      items: [
        { title: "Fisheries Development", body: "Sustainable aquaculture in ponds and mine pits for income generation and protein access." },
      ],
    },
    {
      category: "Biodiversity",
      items: [
        { title: "Biodiversity Registers", body: "Community documentation of agrobiodiversity to conserve traditional varieties and strengthen stewardship." },
      ],
    },
    {
      category: "Market",
      items: [
        { title: "FPO Strengthening", body: "Strengthening farmer collectives for aggregation, improved price realisation, and better market access." },
        { title: "Solar Cold Storage", body: "Solar-powered storage units to reduce post-harvest losses and improve farmer returns." },
        { title: "Mango Processing", body: "Women-led fruit processing enterprises for value addition and year-round income generation." },
      ],
    },
    {
      category: "Institutional Strengthening",
      items: [
        { title: "Community Resource Persons", body: "Training local agroecology facilitators for last-mile advisory and climate-resilient farming support." },
      ],
    },
    {
      category: "Agritech",
      items: [
        { title: "Weather Monitoring", body: "Automated weather stations to enable climate-informed farming decisions and reduce crop risks." },
      ],
    },
  ],

  rajnagar: [
    {
      category: "Agriculture, Horticulture & Agroforestry",
      items: [
        { title: "Promotion of diversified, agroecological cropping systems", body: "To develop wheat, mustard, groundnut, and black gram clusters, with soil health improvement, bio-input use, and moisture-conserving agronomy." },
        { title: "Agroecological transition to reduce chemical inputs", body: "Enhance soil organic matter and improve household food and nutrition security under semi-arid conditions." },
        { title: "Seed system strengthening", body: "Through women seed entrepreneurs and local seed production of key crops (wheat, mustard, groundnut, pulses)." },
        { title: "Promotion of homestead nutrition gardens and fruit/vegetable cultivation", body: "To improve year-round access to diverse, nutrient-rich foods." },
        { title: "Improved management practices in key cash and oilseed crops (mustard, groundnut)", body: "For better agronomy practices and post-harvest handling to stabilise incomes." },
      ],
    },
    {
      category: "Natural Resource Management",
      items: [
        { title: "Promotion of farm ponds, bunding and water-efficient practices", body: "For soil and moisture conservation, and to improve water availability and reduce climate-induced risks." },
        { title: "Restoration and protection of degraded commons and grazing lands", body: "To enhance biomass, fodder supply and ecosystem services." },
      ],
    },
    {
      category: "Livestock Management",
      items: [
        { title: "Promotion of improved small ruminant and backyard poultry rearing practices", body: "To enhance household nutrition and women-led income." },
        { title: "Improvement of livestock housing and manure management", body: "To support agroecological farming and increase on-farm organic nutrient availability." },
      ],
    },
    {
      category: "Processing, Value Addition and Markets",
      items: [
        { title: "Interventions in wheat–mustard–groundnut value chains", body: "By developing market linkages and developing value-added products like mustard oil, groundnut products etc." },
        { title: "Enhanced use of crop residues and by-products", body: "In livestock and fish feeding and composting, supporting circular resource use." },
        { title: "Localised seed and input systems (via BRC and Panchayat-level distribution units)", body: "To ensure reliable access to bio-inputs and quality seeds." },
      ],
    },
    {
      category: "Energy",
      items: [
        { title: "Promotion of farm- and village-level bio-input and biomass-based solutions", body: "Aligned with reduced chemical use by incorporating organic methods like composting, green manuring, vermicompost etc." },
      ],
    },
    {
      category: "Institutional Strengthening",
      items: [
        { title: "Strengthening women-led FPC in Rajnagar", body: "To support aggregation, processing (mustard oil, groundnut), market access and enterprise sustainability." },
      ],
    },
    {
      category: "Knowledge Building",
      items: [
        { title: "Strengthening Farmer Field Schools, CRPs and Krishi Sakhis", body: "To promote community-based extension platforms and Livelihood Service Centres for agroecological and market advisory services." },
      ],
    },
  ],

  vempalli: [
    {
      category: "Agriculture, Horticulture & Agroforestry",
      items: [
        { title: "Integrated Banana Systems", body: "Diversify monocrops through intercropping and ecological disease management; establish fibre processing units to generate additional income from crop waste." },
        { title: "Climate-Smart Paddy", body: "Promote Alternate Wetting and Drying (AWD) and dry direct seeding in command areas to reduce groundwater abstraction and methane emissions." },
        { title: "Nutrition Integration", body: "Address dietary gaps and market dependence by intercropping nutri-millets and vegetables within commercial fields and homesteads." },
        { title: "Soil Health & Diversification", body: "Regenerate soil organic carbon via green manuring and crop rotation to enhance moisture retention and stabilise yields in cotton and groundnut systems." },
      ],
    },
    {
      category: "Natural Resource Management",
      items: [
        { title: "Ecological Crop Protection", body: "Mitigate wildlife conflict using live hedgerows and solar fencing, enabling farmers to safely diversify into high-value vegetables and pulses." },
        { title: "Landscape Conservation", body: "Revive tanks and drainage systems through ridge-to-valley measures, including contour bunds and trenches, to enhance groundwater recharge and control erosion." },
        { title: "Commons Restoration", body: "Regenerate degraded grazing lands and forest interfaces by removing invasive species and planting fruit and fodder species to support biodiversity." },
      ],
    },
    {
      category: "Livestock Management",
      items: [
        { title: "Small Ruminant Systems", body: "Support landless and vulnerable households with sheep/goat assets, integrated with preventive healthcare, vaccinations, and insurance to ensure livelihood stability." },
        { title: "Improved Cattle Sheds", body: "Enhance animal hygiene while facilitating the collection of urine and dung for bio-input production, closing the nutrient loop between livestock and crops." },
      ],
    },
    {
      category: "Energy",
      items: [
        { title: "Household Biogas", body: "Convert livestock waste into clean energy, reducing women's drudgery while providing nutrient-rich slurry for soil enrichment." },
      ],
    },
    {
      category: "Institutional Strengthening",
      items: [
        { title: "FPO & Market Linkages", body: "Build FPO capacity for aggregation and marketing, and provide essential infrastructure such as godowns, to reduce post-harvest losses and prevent distress sales." },
        { title: "Women-led Bio-Resource Centres", body: "Establish community-owned enterprises to produce and sell organic inputs locally, ensuring the availability of low-cost bio-fertilisers." },
      ],
    },
    {
      category: "Knowledge Building",
      items: [
        { title: "Kisan Mitra Service Centres", body: "Provide decentralised technical support and digital extension for weather and pest advisories, lowering costs and enabling data-driven transitions for smallholders." },
      ],
    },
  ],
};
