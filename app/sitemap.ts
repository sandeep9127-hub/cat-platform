import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export const dynamic = "force-dynamic";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.AUTH_URL ?? "https://cat-platform.example.org").replace(/\/$/, "");

  const [entries, themes, orgs, landscapes] = await Promise.all([
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
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    "/",
    "/about",
    "/landscapes",
    "/map",
    "/organizations",
    "/search",
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
  ];
}
