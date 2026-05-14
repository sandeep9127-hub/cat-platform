import "dotenv/config";
import dns from "node:dns";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq } from "drizzle-orm";
import * as schema from "../lib/db/schema";

dns.setDefaultResultOrder("verbatim");
import {
  themesSeed,
  stateGeographies,
  orgsSeed,
  entriesSeed,
  sourceRegistrySeed,
} from "../lib/db/seed-data";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({ connectionString: url, max: 1, ssl: { rejectUnauthorized: false } });
  const db = drizzle(pool, { schema });

  console.log("Seeding themes...");
  for (const t of themesSeed) {
    await db
      .insert(schema.themes)
      .values({ ...t })
      .onConflictDoNothing({ target: schema.themes.slug });
  }

  console.log("Seeding state geographies...");
  for (const g of stateGeographies) {
    await db
      .insert(schema.geographies)
      .values({
        slug: g.slug,
        name: g.name,
        type: "state",
        stateCode: g.stateCode,
        latitude: g.latitude,
        longitude: g.longitude,
        displayOnMap: true,
      })
      .onConflictDoNothing({ target: schema.geographies.slug });
  }

  console.log("Seeding organisations...");
  for (const o of orgsSeed) {
    await db
      .insert(schema.organisations)
      .values({
        slug: o.slug,
        name: o.name,
        shortName: o.shortName,
        type: o.type as schema.Organisation["type"],
        description: o.description,
      })
      .onConflictDoNothing({ target: schema.organisations.slug });
  }

  const themesAll = await db.select().from(schema.themes);
  const geosAll = await db.select().from(schema.geographies);
  const orgsAll = await db.select().from(schema.organisations);

  const themeBySlug = new Map(themesAll.map((t) => [t.slug, t]));
  const geoBySlug = new Map(geosAll.map((g) => [g.slug, g]));
  const orgBySlug = new Map(orgsAll.map((o) => [o.slug, o]));

  console.log("Seeding entries...");
  for (const e of entriesSeed) {
    const theme = themeBySlug.get(e.primaryThemeSlug);
    const geo = geoBySlug.get(e.primaryGeographySlug);
    if (!theme || !geo) {
      console.warn(`Skipping entry ${e.slug}: missing theme or geography`);
      continue;
    }

    const existing = await db
      .select()
      .from(schema.entries)
      .where(eq(schema.entries.slug, e.slug))
      .limit(1);
    if (existing.length) {
      console.log(`  ↳ ${e.slug} already exists, skipping`);
      continue;
    }

    const [inserted] = await db
      .insert(schema.entries)
      .values({
        slug: e.slug,
        title: e.title,
        tagline: e.tagline,
        provenance: e.provenance as schema.Entry["provenance"],
        scaleBand: e.scaleBand as schema.Entry["scaleBand"],
        primaryThemeId: theme.id,
        primaryGeographyId: geo.id,
        startYear: e.startYear,
        endYear: e.endYear,
        status: e.status as schema.Entry["status"],
        context: e.context,
        whatWasAttempted: e.whatWasAttempted,
        whatWasAchieved: e.whatWasAchieved,
        whatWorked: e.whatWorked,
        whatDidNotWork: e.whatDidNotWork,
        catEndorsement: e.catEndorsement as schema.Entry["catEndorsement"],
        headlineMetrics: e.headlineMetrics,
        investmentQuantumInrCr: e.investmentQuantumInrCr,
        coverImageUrl: e.coverImageUrl,
        editorialStatus: "published",
        publishedDate: new Date(),
        lastReviewedAt: new Date(),
      })
      .returning();

    // primary theme join
    await db.insert(schema.entryThemes).values({
      entryId: inserted.id,
      themeId: theme.id,
      isPrimary: true,
    });

    // primary geo join
    await db.insert(schema.entryGeographies).values({
      entryId: inserted.id,
      geographyId: geo.id,
      isPrimary: true,
    });

    // organisations
    for (const orgLink of e.organisations) {
      const org = orgBySlug.get(orgLink.orgSlug);
      if (!org) {
        console.warn(`  ↳ org ${orgLink.orgSlug} not found, skipping link`);
        continue;
      }
      await db.insert(schema.entryOrganisations).values({
        entryId: inserted.id,
        organisationId: org.id,
        role: orgLink.role as
          | "lead_implementer"
          | "supporting_implementer"
          | "funder"
          | "knowledge_partner"
          | "government_counterpart"
          | "research_collaborator",
      });
    }

    console.log(`  ↳ inserted ${e.slug}`);
  }

  console.log("Seeding source registry...");
  for (const s of sourceRegistrySeed) {
    await db
      .insert(schema.sourceRegistry)
      .values({
        url: s.url,
        sourceType: s.sourceType,
        trustTier: s.trustTier,
        crawlFrequencyDays: s.crawlFrequencyDays,
        notes: s.notes,
      })
      .onConflictDoNothing({ target: schema.sourceRegistry.url });
  }

  console.log("Seed complete.");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
