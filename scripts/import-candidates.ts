/**
 * Manual sourcing → triage.
 *
 * One-off importer that pushes hand-sourced programmes (here: agroecology /
 * food-systems solutions read from IUCN PANORAMA, panorama.solutions) into the
 * discovery triage queue as `pending_triage` candidates — exactly like the
 * weekly discovery cron does, so they show up in /admin/candidates for an
 * editor to review, generate a fact sheet from, or dismiss.
 *
 * Why a script and not the in-app "Run discovery now" button: panorama.solutions
 * sits behind Cloudflare's bot challenge, so the server-side fetch the agent uses
 * returns 403. The content was therefore read through a real browser and the
 * structured candidates curated below. Re-run safely after editing CANDIDATES:
 *
 *   npx tsx scripts/import-candidates.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import dns from "node:dns";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { Pool } from "pg";
import * as schema from "../lib/db/schema";

dns.setDefaultResultOrder("verbatim");

type Candidate = {
  title: string;
  summary: string;
  themes: string[]; // controlled theme slugs (soil-land, water, seeds-biodiversity, climate-resilience, women-collectives, markets-value-chains, policy-governance, knowledge-capacity)
  geography: string;
  stateCode: string; // 2-letter Indian state code
  org: string;
  sourceUrls: string[];
  confidence: number;
};

const PANORAMA = "https://panorama.solutions/en/solution/";

const CANDIDATES: Candidate[] = [
  {
    title: "Sustainable Aquaculture for Food and Livelihood",
    summary:
      "An Indo-German (GIZ) project promoting sustainable, integrated pond aquaculture in Assam and Odisha to strengthen food and nutrition security and rural livelihoods. Locally run as SAFAL under the GIZ Global Programme on Sustainable Fisheries and Aquaculture, it works with the Government of India's Ministry of Fisheries (MoFAHD) and the state fisheries departments, and supports women aquaculture farmers to develop the states' large, often unrealised aquaculture potential.",
    themes: ["water", "markets-value-chains"],
    geography: "Assam and Odisha",
    stateCode: "AS",
    org: "GIZ Global Programme Sustainable Fisheries and Aquaculture (SAFAL / EIAA)",
    sourceUrls: [PANORAMA + "sustainable-aquaculture-food-and-livelihood"],
    confidence: 0.8,
  },
  {
    title: "From Fields to Forests: Integrating Nature into Kharagpur's Agriscapes",
    summary:
      "The Sustainable Agriscapes for Future (SAF) project, led by IUCN India and ITC, uses nature-based solutions to tackle ecosystem degradation in the Kharagpur Agriscape of Munger, Bihar. Through spatial planning it delineated the agriscape and produced a Kharagpur Agriscape Plan, then delivered interventions such as women-led eco-nurseries, vermicomposting of invasive water hyacinth and community pasture restoration to conserve the forests and lake that sustain local farming.",
    themes: ["soil-land", "seeds-biodiversity"],
    geography: "Kharagpur, Munger, Bihar",
    stateCode: "BR",
    org: "IUCN India (with ITC)",
    sourceUrls: [PANORAMA + "fields-forests-integrating-nature-india-kharagpurs-agriscapes"],
    confidence: 0.78,
  },
  {
    title: "Promoting Pollination as an Ecosystem Service for Climate Resilience and Agroecology",
    summary:
      "To counter declining pollinator populations that threaten apple quality, yields and farmer incomes in Himachal Pradesh, GIZ's Green Innovation Centres promoted pollination as an ecosystem service with Dr Y S Parmar University of Horticulture & Forestry and the Keystone Foundation. Implemented in Shimla and Kullu, it conserved native pollinators such as Apis cerana and trained farmers and micro-entrepreneurs in beekeeping, honey processing and scientific pollination management.",
    themes: ["seeds-biodiversity", "climate-resilience"],
    geography: "Shimla and Kullu, Himachal Pradesh",
    stateCode: "HP",
    org: "GIZ Green Innovation Centres for the Agriculture and Food Sector (India)",
    sourceUrls: [PANORAMA + "promoting-pollination-ecosystem-service-climate-resilience-and-agroecology"],
    confidence: 0.8,
  },
  {
    title: "Use of Solar Bio-Fermenters for Nutrition and Soil Health Management",
    summary:
      "GIZ's Green Innovation Centres introduced solar-powered biofermenters that let farmers produce high-quality biological inputs on-farm, cutting dependence on chemical fertilisers and market-sourced inputs. Paired with practices such as intercropping and mulching, the approach restores soil ecosystems and builds smallholder resilience to climate change in Himachal Pradesh.",
    themes: ["soil-land"],
    geography: "Himachal Pradesh",
    stateCode: "HP",
    org: "GIZ Green Innovation Centres for the Agriculture and Food Sector (India)",
    sourceUrls: [PANORAMA + "use-solar-bio-fermenters-nutrition-and-soil-health-management"],
    confidence: 0.75,
  },
  {
    title: "Affordable Access to Solar Powered Cold Storages",
    summary:
      "To cut high post-harvest losses for apple farmers, GIZ's Green Innovation Centres and CoolCrop Technologies piloted a 'Cooling as a Service' model in 2021, installing solar-powered cold storages near farms. Farmers pay only a user fee while a service provider funds, installs and operates the units, improving market linkages and reducing waste without a large upfront investment.",
    themes: ["markets-value-chains"],
    geography: "Himachal Pradesh",
    stateCode: "HP",
    org: "GIZ Green Innovation Centres (India), with CoolCrop Technologies",
    sourceUrls: [PANORAMA + "affordable-access-solar-powered-cold-storages"],
    confidence: 0.78,
  },
  {
    title: "Mangrove Restoration for Sustainable Fishery in Palk Bay",
    summary:
      "The OMCAR Foundation runs participatory mangrove restoration in Palk Bay, Tamil Nadu, working with coastal communities and the Tamil Nadu Forest Department to replant and protect mangroves degraded by fuelwood cutting, shrimp farming and cattle grazing. Restoring mangroves rebuilds the fish nurseries that underpin small-scale coastal fisheries and local livelihoods.",
    themes: ["water", "climate-resilience"],
    geography: "Palk Bay, Tamil Nadu",
    stateCode: "TN",
    org: "OMCAR Foundation (with Tamil Nadu Forest Department)",
    sourceUrls: [PANORAMA + "mangrove-restoration-sustainable-fishery-palk-bay-india"],
    confidence: 0.72,
  },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({
    connectionString: url.replace(/[?&]sslmode=[^&]+/g, ""),
    max: 1,
    ssl: { rejectUnauthorized: false },
  });
  const db = drizzle(pool, { schema });

  const [run] = await db
    .insert(schema.ingestionRuns)
    .values({ runType: "discovery_agent", triggeredBy: "manual", status: "running" })
    .returning();

  let yielded = 0;
  for (const c of CANDIDATES) {
    await db.insert(schema.discoveryCandidates).values({
      proposedTitle: c.title.slice(0, 200),
      proposedSummary: c.summary,
      proposedThemes: c.themes,
      proposedGeographyName: c.geography.slice(0, 120),
      proposedStateCode: c.stateCode.slice(0, 4),
      proposedLeadOrganisationName: c.org.slice(0, 200),
      sourceUrls: c.sourceUrls,
      confidenceScore: c.confidence,
      discoveredInRunId: run.id,
    });
    yielded++;
    console.log(`  + ${c.title}`);
  }

  await db
    .update(schema.ingestionRuns)
    .set({
      completedAt: new Date(),
      status: "succeeded",
      itemsProcessed: CANDIDATES.length,
      itemsYielded: yielded,
    })
    .where(eq(schema.ingestionRuns.id, run.id));

  console.log(`\nInserted ${yielded} candidate(s) into triage (run ${run.id}).`);
  console.log("Review them at /admin/candidates");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
