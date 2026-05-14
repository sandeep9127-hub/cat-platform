import {
  getOverviewCounts,
  getPublishedEntries,
  getThemesWithCounts,
} from "@/lib/db/queries";
import { AtlasSection } from "@/components/entries/AtlasSection";
import { StatStrip } from "@/components/ui/StatStrip";
import { SectionHead } from "@/components/ui/SectionHead";
import { ThemeIcon } from "@/components/ui/ThemeIcon";
import { EndorsementLegend } from "@/components/ui/EndorsementBadge";
import Link from "next/link";

export const revalidate = 60;

export default async function LandingPage() {
  const [entries, themes, counts] = await Promise.all([
    getPublishedEntries(),
    getThemesWithCounts(),
    getOverviewCounts(),
  ]);

  const mapEntries = entries
    .filter((e) => e.primaryGeography.latitude && e.primaryGeography.longitude)
    .map((e) => ({
      id: e.id,
      slug: e.slug,
      title: e.title,
      scaleBand: e.scaleBand,
      provenance: e.provenance,
      stateCode: e.primaryGeography.stateCode ?? "",
      latitude: e.primaryGeography.latitude,
      longitude: e.primaryGeography.longitude,
    }));

  const listEntries = entries.map((e, i) => ({
    id: e.id,
    slug: e.slug,
    index: i + 1,
    total: entries.length,
    title: e.title,
    tagline: e.tagline,
    stateName: e.primaryGeography.name,
    startYear: e.startYear,
    endYear: e.endYear,
    scaleBand: e.scaleBand,
    catEndorsement: e.catEndorsement,
    themes: e.themes,
  }));

  const lastUpdate =
    entries[0]?.lastReviewedAt ?? entries[0]?.publishedDate ?? new Date();

  return (
    <>
      {/* HERO */}
      <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-12 sm:pt-16 lg:pt-18 pb-10 grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-10 lg:gap-16 items-end">
        <div>
          <div className="flex items-center gap-3 sm:gap-4 mb-5 sm:mb-6 flex-wrap reveal-stagger" style={{ animationDelay: "0ms" }}>
            <span className="mono-label">Vol. 01 · Edition 2026</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-deep" />
            <span className="mono-label">
              Updated {lastUpdate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
          <h1 className="font-serif font-normal text-hero-xl text-ink reveal-stagger" style={{ animationDelay: "120ms" }}>
            A dashboard for{" "}
            <em className="hero-italic italic text-teal not-italic" style={{ fontStyle: "italic" }}>
              sustainable
            </em>
            <br />
            food systems.
          </h1>
          <p className="font-serif italic text-[17px] sm:text-[19px] text-ink-soft leading-[1.45] max-w-[42ch] mt-6 sm:mt-7 font-light reveal-stagger" style={{ animationDelay: "300ms" }}>
            Find the work that is actually changing how India grows, eats, and sustains.
            Programmes are read, not pitched. Limitations sit beside achievements. Curated by
            CAT, open to anyone serious about food.
          </p>
        </div>
        <aside className="lg:border-l lg:border-line lg:pl-7 lg:self-end lg:pb-2 border-t border-line pt-6 lg:border-t-0 lg:pt-0 reveal-stagger" style={{ animationDelay: "460ms" }}>
          <span className="eyebrow">Editor&apos;s note</span>
          <p className="text-[14px] text-ink-soft max-w-[40ch] mt-3.5">
            The Platform covers credible food systems work nationally, not only CAT&apos;s
            portfolio. Government missions, NGO programmes, federations, market infrastructure.
            The bar is honesty, not affiliation.
          </p>
          <div className="mt-4 flex gap-2.5 items-center">
            <span className="w-6 h-px bg-amber-deep" />
            <span className="font-mono text-[10.5px] uppercase tracking-mono-mid text-ink-soft">
              Curated, not crowdsourced
            </span>
          </div>
        </aside>
      </section>

      {/* STAT STRIP */}
      <StatStrip
        stats={[
          { label: "Programmes listed", value: String(counts.programmes || entries.length), sup: counts.programmes ? "↗" : undefined, delta: counts.programmes ? "live count" : "seed data" },
          { label: "States covered", value: String(counts.states), delta: "of 28 + 8 UTs" },
          { label: "Organisations", value: String(counts.organisations), delta: "across the system" },
          { label: "Resources", value: String(counts.resources), delta: "reports, briefs, datasets" },
        ]}
      />

      <EndorsementLegend />

      {/* ATLAS */}
      <SectionHead title="The" italic="atlas" meta="Hover or tap a state to filter" />
      <AtlasSection
        mapEntries={mapEntries}
        listEntries={listEntries}
        totalStates={counts.states}
      />

      {/* THEMES */}
      <section className="bg-cream border-y border-line py-12 lg:py-16 mt-8">
        <SectionHead title="Read by" italic="theme" meta="Eight working areas" />
        <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-line-soft border border-line-soft">
          {themes.map((t, i) => (
            <Link
              key={t.slug}
              href={`/theme/${t.slug}`}
              className="group bg-cream hover:bg-paper transition-colors duration-300 p-6 flex flex-col gap-3.5 min-h-[170px] relative reveal-stagger overflow-hidden"
              style={{
                ["--c" as string]: t.colourHex,
                animationDelay: `${i * 70}ms`,
              } as React.CSSProperties}
            >
              <span
                className="w-[44px] h-[44px] rounded-[2px] relative flex items-center justify-center text-paper transition-transform duration-500 group-hover:scale-110 group-hover:rotate-[-2deg]"
                style={{ background: t.colourHex }}
                aria-hidden
              >
                <ThemeIcon slug={t.slug} size={24} />
              </span>
              <h3 className="font-serif text-[21px] font-medium tracking-[-0.01em] text-ink leading-[1.15] transition-colors duration-300 group-hover:text-[color:var(--c)]">
                {t.name}
              </h3>
              <span className="font-mono text-[10px] uppercase tracking-mono-mid text-muted mt-auto flex gap-2 items-center">
                <strong className="text-deep-teal text-[13px] font-semibold tracking-[0.04em]">
                  {t.entryCount}
                </strong>{" "}
                programmes
              </span>
              <span className="absolute top-5 right-5 font-serif text-[18px] text-muted transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-0.5 group-hover:text-[color:var(--c)]">
                →
              </span>
              {/* Subtle colour wash on hover */}
              <span
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at 90% 110%, ${t.colourHex}14 0%, transparent 60%)`,
                }}
                aria-hidden
              />
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED ENTRY */}
      {entries[0] && <FeaturedEntry entry={entries[0]} />}
    </>
  );
}

function FeaturedEntry({ entry }: { entry: Awaited<ReturnType<typeof getPublishedEntries>>[number] }) {
  return (
    <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-10 lg:gap-16 items-start">
      <div className="relative aspect-[4/5] border border-line overflow-hidden bg-[radial-gradient(ellipse_at_30%_20%,rgba(248,202,124,0.55),transparent_50%),radial-gradient(ellipse_at_70%_80%,rgba(46,117,115,0.4),transparent_55%),linear-gradient(135deg,#c4a87a_0%,#6b8b6a_50%,#2c4544_100%)]">
        <div className="absolute bottom-4 left-5 right-5 text-paper flex justify-between items-end font-mono text-[10px] uppercase tracking-mono-mid z-10">
          <span className="font-serif italic normal-case tracking-normal text-[14px] text-amber">
            {entry.primaryGeography.name}, monsoon paddy fields
          </span>
          <span>Photo · 2024</span>
        </div>
      </div>
      <div>
        <div className="flex gap-3.5 items-center mb-4 font-mono text-[10.5px] uppercase tracking-mono-wide text-teal font-semibold">
          <span>Featured programme</span>
          <span className="text-line">·</span>
          <span className="text-amber-deep">
            {entry.catEndorsement === "cat_authored"
              ? "CAT Authored"
              : entry.catEndorsement === "cat_endorsed"
                ? "CAT Endorsed"
                : "CAT Listed"}
          </span>
        </div>
        <h2 className="font-serif text-[34px] sm:text-[40px] lg:text-[46px] font-normal text-ink mb-4 tracking-[-0.022em] leading-[1.05]">
          {entry.title}
        </h2>
        <p className="font-serif italic text-[18px] sm:text-[20px] text-teal leading-[1.45] mb-7 font-light max-w-[52ch]">
          {entry.tagline}
        </p>
        <Link
          href={`/entry/${entry.slug}`}
          className="inline-block font-mono text-[11px] uppercase tracking-mono-wide text-deep-teal border-b-2 border-amber pb-1 hover:border-amber-deep transition-colors"
        >
          Read the entry →
        </Link>
      </div>
    </section>
  );
}
