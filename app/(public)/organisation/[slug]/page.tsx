import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, sql, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { EntryListItem } from "@/components/entries/EntryListItem";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

const ROLE_LABELS: Record<string, string> = {
  lead_implementer: "Lead implementer",
  supporting_implementer: "Supporting implementer",
  funder: "Funder",
  knowledge_partner: "Knowledge partner",
  government_counterpart: "Government counterpart",
  research_collaborator: "Research collaborator",
};

export default async function OrganisationPage({ params }: Props) {
  const { slug } = await params;

  const [org] = await db
    .select()
    .from(schema.organisations)
    .where(eq(schema.organisations.slug, slug))
    .limit(1);
  if (!org) notFound();

  // Compute roles_held at query time, never stored.
  const rolesAgg = await db
    .select({
      role: schema.entryOrganisations.role,
      n: sql<number>`count(distinct ${schema.entryOrganisations.entryId})`.mapWith(Number),
    })
    .from(schema.entryOrganisations)
    .where(eq(schema.entryOrganisations.organisationId, org.id))
    .groupBy(schema.entryOrganisations.role);

  const entryIds = await db
    .select({ id: schema.entryOrganisations.entryId })
    .from(schema.entryOrganisations)
    .where(eq(schema.entryOrganisations.organisationId, org.id));

  const ids = entryIds.map((r) => r.id);
  const rows = ids.length
    ? await db
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
          themeSlug: schema.themes.slug,
          themeName: schema.themes.name,
          themeColour: schema.themes.colourHex,
        })
        .from(schema.entries)
        .innerJoin(
          schema.geographies,
          eq(schema.geographies.id, schema.entries.primaryGeographyId)
        )
        .innerJoin(schema.themes, eq(schema.themes.id, schema.entries.primaryThemeId))
        .where(
          sql`${schema.entries.id} = ANY(${ids}) AND ${schema.entries.editorialStatus} = 'published'`
        )
    : [];

  return (
    <>
      <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-16 pb-10 grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-12 items-end">
        <div>
          <span className="font-mono text-[10.5px] uppercase tracking-mono-wide text-teal font-semibold">
            Organisation · {org.type.replace("_", " ")}
          </span>
          <h1 className="font-serif text-[clamp(40px,5vw,72px)] font-normal leading-[1.05] tracking-[-0.025em] text-ink mt-4 max-w-[22ch]">
            {org.name}
          </h1>
          {org.shortName && (
            <span className="font-mono text-[12px] uppercase tracking-mono-mid text-muted mt-3 block">
              Known as {org.shortName}
            </span>
          )}
          <p className="font-serif text-[17px] text-ink-soft leading-[1.6] max-w-[58ch] mt-6">
            {org.description}
          </p>
          <div className="flex gap-6 mt-6 font-mono text-[10.5px] uppercase tracking-mono-mid text-muted flex-wrap">
            {org.foundedYear && <span>Founded {org.foundedYear}</span>}
            {org.website && (
              <a
                href={org.website}
                target="_blank"
                rel="noreferrer"
                className="text-teal hover:text-teal-soft"
              >
                {new URL(org.website).hostname.replace("www.", "")} ↗
              </a>
            )}
          </div>
        </div>
        <aside className="border-l border-line pl-7">
          <span className="mono-label">Roles held</span>
          <ul className="mt-4 flex flex-col gap-2.5 list-none p-0">
            {rolesAgg.map((r) => (
              <li
                key={r.role}
                className="flex justify-between items-baseline border-b border-line-soft pb-2"
              >
                <span className="font-serif text-[15px] text-ink">
                  {ROLE_LABELS[r.role] ?? r.role}
                </span>
                <span className="font-mono text-[12px] text-deep-teal font-semibold tracking-[0.04em]">
                  ×{r.n}
                </span>
              </li>
            ))}
            {rolesAgg.length === 0 && (
              <li className="font-serif italic text-muted text-[14px]">
                Not yet linked to any programme.
              </li>
            )}
          </ul>
        </aside>
      </section>

      <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pb-24">
        <span className="mono-label">Programmes ({rows.length})</span>
        <div className="flex flex-col mt-4">
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
                themes: [
                  { slug: r.themeSlug, name: r.themeName, colourHex: r.themeColour },
                ],
              }}
            />
          ))}
        </div>
      </section>
    </>
  );
}
