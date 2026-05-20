import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export const dynamic = "force-dynamic";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.AUTH_URL ?? "https://cat-platform.example.org").replace(/\/$/, "");

  const [entries, themes, orgs, landscapes, resources, news] = await Promise.all([
    db
      .select({ slug: schema.entries.slug, lastReviewed: schema.entries.lastReviewedAt })
      .from(schema.entries)
      .where(eq(schema.entries.editorialStatus, "published")),
    db.select({ slug: schema.themes.slug }).from(schema.themes),
    db.select({ slug: schema.organisations.slug }).from(schema.organisations),
    db
      .select({ slug: schema.geographies.slug })
      .from(schema.geographies)
      .where(eq(schema.geographies.type, "landscape")),
    db
      .select({ slug: schema.resources.slug })
      .from(schema.resources)
      .where(eq(schema.resources.editorialStatus, "published")),
    db
      .select({ slug: schema.newsItems.slug, date: schema.newsItems.publicationDate })
      .from(schema.newsItems)
      .where(eq(schema.newsItems.editorialStatus, "published")),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    "/",
    "/about",
    "/editorial-process",
    "/landscapes",
    "/map",
    "/resources",
    "/news",
    "/search",
    "/contribute",
  ].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "/" ? 1 : 0.7,
  }));

  return [
    ...staticRoutes,
    ...entries.map((e) => ({
      url: `${base}/entry/${e.slug}`,
      lastModified: e.lastReviewed ?? undefined,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...themes.map((t) => ({ url: `${base}/theme/${t.slug}`, changeFrequency: "weekly" as const })),
    ...orgs.map((o) => ({ url: `${base}/organisation/${o.slug}`, changeFrequency: "monthly" as const })),
    ...landscapes.map((l) => ({ url: `${base}/landscape/${l.slug}`, changeFrequency: "monthly" as const })),
    ...resources.map((r) => ({ url: `${base}/resources#${r.slug}`, changeFrequency: "monthly" as const })),
    ...news.map((n) => ({
      url: `${base}/news#${n.slug}`,
      lastModified: n.date,
      changeFrequency: "monthly" as const,
    })),
  ];
}
