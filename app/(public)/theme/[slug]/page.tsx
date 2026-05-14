import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { EntryListItem } from "@/components/entries/EntryListItem";
import { ThemeChip } from "@/components/ui/ThemeChip";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export default async function ThemePage({ params }: Props) {
  const { slug } = await params;

  const [theme] = await db
    .select()
    .from(schema.themes)
    .where(eq(schema.themes.slug, slug))
    .limit(1);
  if (!theme) notFound();

  const rows = await db
    .select({
      id: schema.entries.id,
      slug: schema.entries.slug,
      title: schema.entries.title,
      tagline: schema.entries.tagline,
      scaleBand: schema.entries.scaleBand,
      startYear: schema.entries.startYear,
      endYear: schema.entries.endYear,
      catEndorsement: schema.entries.catEndorsement,
      stateName: schema.geographies.name,
    })
    .from(schema.entries)
    .innerJoin(
      schema.geographies,
      eq(schema.geographies.id, schema.entries.primaryGeographyId)
    )
    .where(
      and(
        eq(schema.entries.primaryThemeId, theme.id),
        eq(schema.entries.editorialStatus, "published")
      )
    );

  return (
    <>
      <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-16 pb-10">
        <div className="flex items-center gap-3 mb-6">
          <span
            className="w-3 h-3 rounded-full"
            style={{ background: theme.colourHex }}
            aria-hidden
          />
          <span className="font-mono text-[10.5px] uppercase tracking-mono-wide text-teal font-semibold">
            Theme
          </span>
        </div>
        <h1 className="font-serif text-[clamp(40px,5vw,72px)] font-normal leading-[1.05] tracking-[-0.025em] text-ink max-w-[20ch]">
          {theme.name}
        </h1>
        <p className="font-serif italic text-[19px] text-ink-soft leading-[1.5] max-w-[58ch] mt-6 font-light">
          {theme.description}
        </p>
        <div className="mt-8 flex gap-4 items-center font-mono text-[10.5px] uppercase tracking-mono-mid text-muted">
          <span>
            <strong className="text-deep-teal text-[13px] font-semibold mr-1">{rows.length}</strong>
            programmes published
          </span>
        </div>
      </section>

      <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pb-24">
        {rows.length === 0 ? (
          <p className="font-serif italic text-ink-soft text-[18px] max-w-[44ch] mt-10">
            No programmes published under this theme yet. The library grows as CAT editors approve
            drafts from the ingestion queue.
          </p>
        ) : (
          <div className="flex flex-col">
            {rows.map((r, i) => (
              <EntryListItem
                key={r.id}
                data={{
                  id: r.id,
                  slug: r.slug,
                  index: i + 1,
                  total: rows.length,
                  title: r.title,
                  tagline: r.tagline,
                  stateName: r.stateName,
                  startYear: r.startYear,
                  endYear: r.endYear,
                  scaleBand: r.scaleBand,
                  catEndorsement: r.catEndorsement,
                  themes: [{ slug: theme.slug, name: theme.name, colourHex: theme.colourHex }],
                }}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
