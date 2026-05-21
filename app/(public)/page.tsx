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
import { Sparkles, ArrowUpRight, Quote } from "lucide-react";
import { Supporters } from "@/components/home/Supporters";
import { Sdgs } from "@/components/home/Sdgs";
import { ParallaxBanner } from "@/components/home/ParallaxBanner";
import Link from "next/link";

export const dynamic = "force-dynamic";

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
      {/* IMMERSIVE HERO — looping video backdrop, parallaxed on scroll, text laid over with atmospheric flare */}
      <ParallaxBanner
        videoSrc="/videos/hero-parallax.mp4"
        alt="Seamless looping parallax animation, evoking the landscapes the Hub documents"
        strength={0.28}
      >
        <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-20 sm:pt-28 lg:pt-32 pb-28 sm:pb-32 lg:pb-40 grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-10 lg:gap-16 items-end min-h-[540px] sm:min-h-[620px] lg:min-h-[680px]">
          <div>
            <div
              className="flex items-center gap-3 sm:gap-4 mb-6 flex-wrap reveal-stagger"
              style={{ animationDelay: "0ms" }}
            >
              <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-paper/85 drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
                <Sparkles size={11} strokeWidth={1.8} className="text-amber" aria-hidden />
                Vol. 01 · Edition 2026
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber" />
              <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-paper/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
                Updated{" "}
                {lastUpdate.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
            <h1
              className="font-serif font-normal text-hero-xl text-paper drop-shadow-[0_2px_24px_rgba(0,0,0,0.35)] reveal-stagger"
              style={{ animationDelay: "120ms" }}
            >
              A dashboard for{" "}
              <em
                className="hero-italic italic text-amber not-italic"
                style={{ fontStyle: "italic" }}
              >
                sustainable
              </em>
              <br />
              food systems.
            </h1>
            <p
              className="font-serif italic text-[17px] sm:text-[19px] text-paper/85 leading-[1.5] max-w-[44ch] mt-6 sm:mt-7 font-light drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)] reveal-stagger"
              style={{ animationDelay: "300ms" }}
            >
              Find the work that is actually changing how India grows, eats, and sustains.
              Programmes are read, not pitched. Limitations sit beside achievements. The
              Transformation Hub is curated by the Consortium for Agroecological Transformations.
            </p>
            <div
              className="mt-8 flex flex-wrap gap-3 reveal-stagger"
              style={{ animationDelay: "440ms" }}
            >
              <Link
                href="/landscapes"
                className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] px-4 py-2.5 rounded-full bg-amber text-deep-teal font-semibold shadow-[0_8px_24px_-8px_rgba(248,202,124,0.55),inset_0_1px_0_rgba(255,255,255,0.30)] hover:bg-amber-deep hover:text-paper transition-all"
              >
                Browse the 11 landscapes
                <ArrowUpRight size={13} strokeWidth={2} aria-hidden />
              </Link>
              <Link
                href="/agent"
                className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] px-4 py-2.5 rounded-full border border-paper/40 text-paper backdrop-blur-sm bg-deep-teal/20 hover:border-amber hover:text-amber hover:bg-deep-teal/30 transition-colors"
              >
                Ask the assistant
              </Link>
            </div>
          </div>
          <aside
            className="lg:self-end lg:pb-1 reveal-stagger"
            style={{ animationDelay: "560ms" }}
          >
            <div className="bg-deep-teal/45 backdrop-blur-md border border-paper/15 rounded-[3px] p-5 lg:p-6 max-w-[40ch]">
              <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-amber font-semibold">
                Editor&apos;s note
              </span>
              <p className="text-[13.5px] text-paper/85 mt-3 leading-[1.55]">
                The Hub covers credible food systems work nationally, not only CAT&apos;s
                portfolio. Government missions, NGO programmes, federations, market infrastructure.
                The bar is honesty, not affiliation.
              </p>
              <div className="mt-4 flex gap-2.5 items-center">
                <span className="w-6 h-px bg-amber" />
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-paper/75">
                  Curated, not crowdsourced
                </span>
              </div>
            </div>
          </aside>
        </div>
      </ParallaxBanner>

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
      <SectionHead title="Solutions" italic="Atlas" meta="Hover or tap a state to filter" />
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

      {/* SUPPORTERS */}
      <Supporters />

      {/* SDGS */}
      <Sdgs />

      {/* FEATURED ENTRY */}
      {entries[0] && <FeaturedEntry entry={entries[0]} />}
    </>
  );
}

function FeaturedEntry({ entry }: { entry: Awaited<ReturnType<typeof getPublishedEntries>>[number] }) {
  const endorsement =
    entry.catEndorsement === "cat_authored"
      ? "CAT Authored"
      : entry.catEndorsement === "cat_endorsed"
        ? "CAT Endorsed"
        : "CAT Listed";

  return (
    <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 py-16 lg:py-24">
      <SectionHead title="Featured" italic="reading" meta={endorsement} />
      <article
        className="relative overflow-hidden border border-line rounded-[2px] mt-2"
        style={{
          background:
            "linear-gradient(135deg, rgba(251,248,242,1) 0%, rgba(248,243,232,1) 60%, rgba(244,237,221,1) 100%)",
        }}
      >
        {/* Soft teal pool, lower-right corner */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 50% 60% at 110% 110%, rgba(46,117,115,0.18), transparent 60%)",
          }}
        />
        <div className="relative grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8 lg:gap-12 p-7 sm:p-10 lg:p-12">
          <div className="hidden lg:block">
            <Quote
              size={64}
              strokeWidth={1.2}
              className="text-teal/35"
              aria-hidden
            />
          </div>
          <div className="max-w-[60ch]">
            <div className="flex gap-3.5 items-center mb-5 font-mono text-[10.5px] uppercase tracking-mono-wide">
              <span className="text-teal font-semibold">Featured programme</span>
              <span className="text-line">·</span>
              <span className="text-amber-deep">{endorsement}</span>
              <span className="text-line">·</span>
              <span className="text-muted">{entry.primaryGeography.name}</span>
            </div>
            <h2 className="font-serif text-[32px] sm:text-[40px] lg:text-[46px] font-normal text-ink mb-5 tracking-[-0.022em] leading-[1.05]">
              {entry.title}
            </h2>
            <p className="font-serif italic text-[18px] sm:text-[21px] text-teal leading-[1.45] mb-8 font-light">
              {entry.tagline}
            </p>
            <Link
              href={`/entry/${entry.slug}`}
              className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-mono-wide text-deep-teal border-b-2 border-amber pb-1 hover:border-amber-deep transition-colors"
            >
              Read the entry
              <ArrowUpRight size={13} strokeWidth={2} aria-hidden />
            </Link>
          </div>
        </div>
      </article>
    </section>
  );
}
