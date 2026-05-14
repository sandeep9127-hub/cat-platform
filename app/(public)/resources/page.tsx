import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export const revalidate = 60;
export const metadata = {
  title: "Resources",
  description:
    "Reports, papers, briefs, datasets, and presentations from the food-systems work the CAT Platform tracks.",
};

const TYPE_LABELS: Record<string, string> = {
  report: "Report",
  paper: "Paper",
  policy_brief: "Policy brief",
  video: "Video",
  photo_gallery: "Photo gallery",
  dataset: "Dataset",
  presentation: "Presentation",
  external_link: "External link",
  book: "Book",
};

export default async function ResourcesPage() {
  const rows = await db
    .select({
      id: schema.resources.id,
      slug: schema.resources.slug,
      title: schema.resources.title,
      type: schema.resources.type,
      description: schema.resources.description,
      externalUrl: schema.resources.externalUrl,
      fileUrl: schema.resources.fileUrl,
      language: schema.resources.language,
      publicationYear: schema.resources.publicationYear,
      publisherName: schema.organisations.name,
      publisherShort: schema.organisations.shortName,
    })
    .from(schema.resources)
    .leftJoin(
      schema.organisations,
      eq(schema.organisations.id, schema.resources.publisherOrganisationId)
    )
    .where(eq(schema.resources.editorialStatus, "published"))
    .orderBy(desc(schema.resources.publicationYear), desc(schema.resources.submissionDate));

  const ids = rows.map((r) => r.id);
  const themeLinks = ids.length
    ? await db
        .select({
          rid: schema.resourceThemes.resourceId,
          slug: schema.themes.slug,
          name: schema.themes.name,
          colour: schema.themes.colourHex,
        })
        .from(schema.resourceThemes)
        .innerJoin(schema.themes, eq(schema.themes.id, schema.resourceThemes.themeId))
        .where(inArray(schema.resourceThemes.resourceId, ids))
    : [];

  const themesByResource = new Map<string, { slug: string; name: string; colour: string }[]>();
  for (const l of themeLinks) {
    const arr = themesByResource.get(l.rid) ?? [];
    arr.push({ slug: l.slug, name: l.name, colour: l.colour });
    themesByResource.set(l.rid, arr);
  }

  return (
    <>
      <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-12 sm:pt-16 lg:pt-20 pb-10 grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-10 lg:gap-16 items-end">
        <div className="reveal-stagger" style={{ animationDelay: "0ms" }}>
          <span className="eyebrow">The library</span>
          <h1 className="font-serif font-normal text-hero-xl text-ink mt-4">
            <em className="hero-italic italic text-teal not-italic" style={{ fontStyle: "italic" }}>
              Resources
            </em>
            <br />
            worth reading.
          </h1>
          <p className="font-serif italic text-[17px] sm:text-[19px] text-ink-soft leading-[1.45] max-w-[42ch] mt-6 font-light">
            Reports, papers, briefs, datasets, presentations. Linked to entries where they
            evidence a programme, listed standalone where they stand on their own.
          </p>
        </div>
        <aside className="lg:border-l lg:border-line lg:pl-7 lg:self-end lg:pb-2 border-t border-line pt-6 lg:border-t-0 lg:pt-0 reveal-stagger" style={{ animationDelay: "180ms" }}>
          <span className="eyebrow">Currently</span>
          <p className="text-[14px] text-ink-soft max-w-[34ch] mt-3.5">
            {rows.length} resources published. Edit history kept; broken or retracted resources
            are removed rather than silently corrected.
          </p>
        </aside>
      </section>

      <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pb-24 border-t border-line pt-2">
        {rows.length === 0 ? (
          <p className="font-serif italic text-ink-soft text-[18px] max-w-[40ch] mt-10">
            The library is being assembled. New resources land here as CAT editors approve them
            from the submission queue.
          </p>
        ) : (
          <ul className="flex flex-col list-none p-0">
            {rows.map((r, i) => {
              const themes = themesByResource.get(r.id) ?? [];
              const href = r.externalUrl ?? r.fileUrl ?? `#`;
              const isExternal = href.startsWith("http");
              return (
                <li
                  key={r.id}
                  className="reveal-stagger border-b border-line-soft"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <a
                    href={href}
                    target={isExternal ? "_blank" : undefined}
                    rel={isExternal ? "noreferrer" : undefined}
                    className="group block py-6 hover:bg-teal-wash/40 transition-colors"
                  >
                    <div className="grid grid-cols-[60px_1fr_auto] sm:grid-cols-[90px_1fr_auto] gap-x-4 sm:gap-x-6 items-start">
                      <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.14em] text-amber-deep font-semibold pt-1.5">
                        {TYPE_LABELS[r.type] ?? r.type}
                      </span>
                      <div className="min-w-0">
                        <h2 className="font-serif text-[20px] sm:text-[22px] font-medium leading-[1.2] tracking-[-0.01em] text-ink group-hover:text-teal transition-colors">
                          {r.title}
                        </h2>
                        <p className="font-serif text-[15.5px] text-ink-soft leading-[1.55] mt-2 max-w-[64ch]">
                          {r.description}
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                          <span>{r.publicationYear}</span>
                          {r.publisherShort && (
                            <>
                              <span className="text-line">·</span>
                              <span>{r.publisherShort}</span>
                            </>
                          )}
                          {r.language !== "english" && (
                            <>
                              <span className="text-line">·</span>
                              <span>{r.language}</span>
                            </>
                          )}
                          {themes.slice(0, 2).map((t) => (
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
                        {isExternal ? "↗" : "→"}
                      </span>
                    </div>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
