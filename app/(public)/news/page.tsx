import { desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export const revalidate = 60;
export const metadata = {
  title: "News",
  description: "Dated updates from food-systems work in India, curated by CAT.",
};

export default async function NewsPage() {
  const rows = await db
    .select({
      id: schema.newsItems.id,
      slug: schema.newsItems.slug,
      headline: schema.newsItems.headline,
      summary: schema.newsItems.summary,
      sourceUrl: schema.newsItems.sourceUrl,
      publicationDate: schema.newsItems.publicationDate,
      sourceName: schema.organisations.name,
      sourceShort: schema.organisations.shortName,
    })
    .from(schema.newsItems)
    .leftJoin(
      schema.organisations,
      eq(schema.organisations.id, schema.newsItems.sourceOrganisationId)
    )
    .where(eq(schema.newsItems.editorialStatus, "published"))
    .orderBy(desc(schema.newsItems.publicationDate));

  const ids = rows.map((r) => r.id);
  const themeLinks = ids.length
    ? await db
        .select({
          nid: schema.newsThemes.newsId,
          name: schema.themes.name,
          colour: schema.themes.colourHex,
          slug: schema.themes.slug,
        })
        .from(schema.newsThemes)
        .innerJoin(schema.themes, eq(schema.themes.id, schema.newsThemes.themeId))
        .where(inArray(schema.newsThemes.newsId, ids))
    : [];
  const geoLinks = ids.length
    ? await db
        .select({
          nid: schema.newsGeographies.newsId,
          name: schema.geographies.name,
          code: schema.geographies.stateCode,
        })
        .from(schema.newsGeographies)
        .innerJoin(schema.geographies, eq(schema.geographies.id, schema.newsGeographies.geographyId))
        .where(inArray(schema.newsGeographies.newsId, ids))
    : [];

  const themesByItem = new Map<string, { slug: string; name: string; colour: string }[]>();
  for (const l of themeLinks) {
    const arr = themesByItem.get(l.nid) ?? [];
    arr.push({ slug: l.slug, name: l.name, colour: l.colour });
    themesByItem.set(l.nid, arr);
  }
  const geosByItem = new Map<string, { name: string; code: string | null }[]>();
  for (const l of geoLinks) {
    const arr = geosByItem.get(l.nid) ?? [];
    arr.push({ name: l.name, code: l.code });
    geosByItem.set(l.nid, arr);
  }

  // Group by year-month for editorial rhythm
  const byMonth = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = r.publicationDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    const arr = byMonth.get(key) ?? [];
    arr.push(r);
    byMonth.set(key, arr);
  }

  return (
    <>
      <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-12 sm:pt-16 lg:pt-20 pb-12 grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-10 lg:gap-16 items-end">
        <div className="reveal-stagger" style={{ animationDelay: "0ms" }}>
          <span className="eyebrow">Dated updates</span>
          <h1 className="font-serif font-normal text-hero-xl text-ink mt-4">
            What happened, <em className="hero-italic italic text-teal not-italic" style={{ fontStyle: "italic" }}>recently</em>.
          </h1>
          <p className="font-serif italic text-[17px] sm:text-[19px] text-ink-soft leading-[1.45] max-w-[42ch] mt-6 font-light">
            Short summaries with source links. We do not host long passages. We do not chase
            the news cycle. Listed because it changes the read of a programme we already track.
          </p>
        </div>
        <aside className="lg:border-l lg:border-line lg:pl-7 lg:self-end lg:pb-2 border-t border-line pt-6 lg:border-t-0 lg:pt-0 reveal-stagger" style={{ animationDelay: "180ms" }}>
          <span className="eyebrow">In this feed</span>
          <p className="text-[14px] text-ink-soft max-w-[34ch] mt-3.5">
            {rows.length} items since launch. Each item links to its source, never substitutes
            for it. Editorial process explained on the{" "}
            <a href="/editorial-process" className="text-teal underline-offset-2 hover:underline">
              editorial process page
            </a>
            .
          </p>
        </aside>
      </section>

      <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pb-24 border-t border-line pt-4">
        {rows.length === 0 ? (
          <p className="font-serif italic text-ink-soft text-[18px] max-w-[40ch] mt-10">
            No news yet this edition.
          </p>
        ) : (
          <div className="flex flex-col gap-8 mt-4">
            {Array.from(byMonth.entries()).map(([month, items], mi) => (
              <div key={month} className="reveal-stagger" style={{ animationDelay: `${mi * 80}ms` }}>
                <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-amber-deep font-semibold mb-3">
                  {month}
                </div>
                <ul className="flex flex-col list-none p-0">
                  {items.map((item) => (
                    <li key={item.id} className="border-b border-line-soft last:border-b-0">
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="group block py-5 hover:bg-teal-wash/40 transition-colors"
                      >
                        <div className="grid grid-cols-[64px_1fr_auto] sm:grid-cols-[90px_1fr_auto] gap-x-4 sm:gap-x-6 items-start">
                          <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.14em] text-muted pt-1.5">
                            {item.publicationDate.toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </span>
                          <div className="min-w-0">
                            <h2 className="font-serif text-[19px] sm:text-[21px] font-medium leading-[1.25] tracking-[-0.01em] text-ink group-hover:text-teal transition-colors">
                              {item.headline}
                            </h2>
                            <p className="font-serif text-[15px] text-ink-soft leading-[1.55] mt-2 max-w-[68ch]">
                              {item.summary}
                            </p>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                              {item.sourceShort && <span>Source: {item.sourceShort}</span>}
                              {geosByItem.get(item.id)?.map((g) => (
                                <span key={g.code} className="flex items-center gap-1.5">
                                  <span className="text-line">·</span>
                                  {g.name}
                                </span>
                              ))}
                              {themesByItem.get(item.id)?.slice(0, 1).map((t) => (
                                <span key={t.slug} className="flex items-center gap-1.5">
                                  <span className="text-line">·</span>
                                  <span
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ background: t.colour }}
                                  />
                                  {t.name}
                                </span>
                              ))}
                            </div>
                          </div>
                          <span className="font-serif text-[18px] text-muted pt-1.5 group-hover:text-teal group-hover:translate-x-1 transition-all duration-300">
                            ↗
                          </span>
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
