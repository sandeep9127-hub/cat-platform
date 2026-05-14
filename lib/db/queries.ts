import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "./index";

export type PublishedEntrySummary = {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  scaleBand: schema.Entry["scaleBand"];
  provenance: schema.Entry["provenance"];
  startYear: number;
  endYear: number | null;
  catEndorsement: schema.Entry["catEndorsement"];
  publishedDate: Date | null;
  lastReviewedAt: Date | null;
  primaryGeography: { name: string; stateCode: string | null; latitude: number | null; longitude: number | null };
  primaryTheme: { slug: string; name: string; colourHex: string };
  themes: { slug: string; name: string; colourHex: string }[];
};

export async function getPublishedEntries(): Promise<PublishedEntrySummary[]> {
  const rows = await db
    .select({
      id: schema.entries.id,
      slug: schema.entries.slug,
      title: schema.entries.title,
      tagline: schema.entries.tagline,
      scaleBand: schema.entries.scaleBand,
      provenance: schema.entries.provenance,
      startYear: schema.entries.startYear,
      endYear: schema.entries.endYear,
      catEndorsement: schema.entries.catEndorsement,
      publishedDate: schema.entries.publishedDate,
      lastReviewedAt: schema.entries.lastReviewedAt,
      geoName: schema.geographies.name,
      stateCode: schema.geographies.stateCode,
      latitude: schema.geographies.latitude,
      longitude: schema.geographies.longitude,
      themeSlug: schema.themes.slug,
      themeName: schema.themes.name,
      themeColour: schema.themes.colourHex,
    })
    .from(schema.entries)
    .innerJoin(schema.geographies, eq(schema.geographies.id, schema.entries.primaryGeographyId))
    .innerJoin(schema.themes, eq(schema.themes.id, schema.entries.primaryThemeId))
    .where(eq(schema.entries.editorialStatus, "published"))
    .orderBy(desc(schema.entries.publishedDate));

  if (rows.length === 0) return [];

  // Fetch all theme links for these entries.
  const entryIds = rows.map((r) => r.id);
  const themeLinks = await db
    .select({
      entryId: schema.entryThemes.entryId,
      slug: schema.themes.slug,
      name: schema.themes.name,
      colourHex: schema.themes.colourHex,
      isPrimary: schema.entryThemes.isPrimary,
    })
    .from(schema.entryThemes)
    .innerJoin(schema.themes, eq(schema.themes.id, schema.entryThemes.themeId))
    .where(inArray(schema.entryThemes.entryId, entryIds));

  const themesByEntry = new Map<string, { slug: string; name: string; colourHex: string }[]>();
  for (const t of themeLinks) {
    const arr = themesByEntry.get(t.entryId) ?? [];
    arr.push({ slug: t.slug, name: t.name, colourHex: t.colourHex });
    themesByEntry.set(t.entryId, arr);
  }

  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    tagline: r.tagline,
    scaleBand: r.scaleBand,
    provenance: r.provenance,
    startYear: r.startYear,
    endYear: r.endYear,
    catEndorsement: r.catEndorsement,
    publishedDate: r.publishedDate,
    lastReviewedAt: r.lastReviewedAt,
    primaryGeography: {
      name: r.geoName,
      stateCode: r.stateCode ?? null,
      latitude: r.latitude ?? null,
      longitude: r.longitude ?? null,
    },
    primaryTheme: { slug: r.themeSlug, name: r.themeName, colourHex: r.themeColour },
    themes: themesByEntry.get(r.id) ?? [{ slug: r.themeSlug, name: r.themeName, colourHex: r.themeColour }],
  }));
}

export async function getThemesWithCounts() {
  const rows = await db
    .select({
      id: schema.themes.id,
      slug: schema.themes.slug,
      name: schema.themes.name,
      colourHex: schema.themes.colourHex,
      displayOrder: schema.themes.displayOrder,
      description: schema.themes.description,
      entryCount: sql<number>`count(distinct ${schema.entries.id})`.mapWith(Number),
    })
    .from(schema.themes)
    .leftJoin(
      schema.entries,
      and(
        eq(schema.entries.primaryThemeId, schema.themes.id),
        eq(schema.entries.editorialStatus, "published")
      )
    )
    .groupBy(schema.themes.id)
    .orderBy(asc(schema.themes.displayOrder));
  return rows;
}

export async function getEntryBySlug(slug: string) {
  const [row] = await db
    .select()
    .from(schema.entries)
    .where(and(eq(schema.entries.slug, slug), eq(schema.entries.editorialStatus, "published")))
    .limit(1);
  if (!row) return null;

  const [theme] = await db
    .select()
    .from(schema.themes)
    .where(eq(schema.themes.id, row.primaryThemeId))
    .limit(1);
  const [geo] = await db
    .select()
    .from(schema.geographies)
    .where(eq(schema.geographies.id, row.primaryGeographyId))
    .limit(1);

  const orgsLink = await db
    .select({
      role: schema.entryOrganisations.role,
      org: schema.organisations,
    })
    .from(schema.entryOrganisations)
    .innerJoin(
      schema.organisations,
      eq(schema.organisations.id, schema.entryOrganisations.organisationId)
    )
    .where(eq(schema.entryOrganisations.entryId, row.id));

  const themeLinks = await db
    .select({
      slug: schema.themes.slug,
      name: schema.themes.name,
      colourHex: schema.themes.colourHex,
      isPrimary: schema.entryThemes.isPrimary,
    })
    .from(schema.entryThemes)
    .innerJoin(schema.themes, eq(schema.themes.id, schema.entryThemes.themeId))
    .where(eq(schema.entryThemes.entryId, row.id));

  return { entry: row, theme, geography: geo, organisations: orgsLink, themes: themeLinks };
}

export async function getOverviewCounts() {
  const [programmes] = await db
    .select({ value: sql<number>`count(*)`.mapWith(Number) })
    .from(schema.entries)
    .where(eq(schema.entries.editorialStatus, "published"));

  const [states] = await db
    .select({
      value: sql<number>`count(distinct ${schema.entries.primaryGeographyId})`.mapWith(Number),
    })
    .from(schema.entries)
    .where(eq(schema.entries.editorialStatus, "published"));

  const [orgs] = await db
    .select({ value: sql<number>`count(*)`.mapWith(Number) })
    .from(schema.organisations);

  const [resources] = await db
    .select({ value: sql<number>`count(*)`.mapWith(Number) })
    .from(schema.resources)
    .where(eq(schema.resources.editorialStatus, "published"));

  return {
    programmes: programmes?.value ?? 0,
    states: states?.value ?? 0,
    organisations: orgs?.value ?? 0,
    resources: resources?.value ?? 0,
  };
}
