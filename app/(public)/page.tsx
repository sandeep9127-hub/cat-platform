import {
  getOverviewCounts,
  getPublishedEntries,
  getThemesWithCounts,
} from "@/lib/db/queries";
import { AtlasSection } from "@/components/entries/AtlasSection";
import { DISCOVERED_RECORDS } from "@/lib/data/discovered-records";
import { StatStrip } from "@/components/ui/StatStrip";
import { SectionHead } from "@/components/ui/SectionHead";
import { ThemeIcon } from "@/components/ui/ThemeIcon";
import { EndorsementLegend } from "@/components/ui/EndorsementBadge";
import { Sparkles, ArrowUpRight, Feather, BookMarked } from "lucide-react";
import { Supporters } from "@/components/home/Supporters";
import { Sdgs } from "@/components/home/Sdgs";
import { ParallaxBanner } from "@/components/home/ParallaxBanner";
import { Reveal } from "@/components/ui/Reveal";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const revalidate = 60;

export default async function LandingPage() {
  const [entries, themes, counts] = await Promise.all([
    getPublishedEntries(),
    getThemesWithCounts(),
    getOverviewCounts(),
  ]);

  // ─── Merge DB entries with atlas-routed discovery records so the landing
  // page reflects the same library shape as /map. The right-rail list is
  // capped at 5 by AtlasSection (cap prop below) with a "Read more" CTA
  // linking to /map; the map itself shows all pins.
  const atlasRecords = DISCOVERED_RECORDS.filter((r) => r.destination === "atlas");

  const dbMapEntries = entries
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

  const atlasMapEntries = atlasRecords
    .filter((r) => r.latitude != null && r.longitude != null)
    .map((r) => ({
      id: r.id,
      slug: r.id,
      title: r.title,
      scaleBand: r.scaleBand ?? "multi_district",
      provenance: "sourced" as const,
      stateCode: r.stateCode ?? "",
      latitude: r.latitude!,
      longitude: r.longitude!,
      internalHref: `/atlas/${r.id}`,
    }));

  const mapEntries = [...dbMapEntries, ...atlasMapEntries];
  const combinedTotal = entries.length + atlasRecords.length;
  // Unique state count across the merged set — what the atlas top bar
  // actually shows. The stat strip + AtlasSection both read from this so
  // the numbers tally with /map.
  const combinedStateCount = new Set(
    mapEntries.map((e) => e.stateCode).filter(Boolean)
  ).size;

  const THEME_COLOURS_HOME: Record<string, string> = {
    "soil-and-land": "#8C7A5C",
    water: "#2C7BD0",
    "seeds-and-biodiversity": "#5C8C2E",
    "farmer-livelihoods": "#C68C2E",
    nutrition: "#C24A2E",
    "climate-resilience": "#2E7573",
    "markets-and-value-chains": "#2EA37A",
    "policy-and-finance": "#334B4A",
    "knowledge-and-capacity": "#5C6796",
    "women-and-collectives": "#929CC5",
  };
  const prettyThemeHome = (slug: string): string =>
    slug.split("-").map((w) => (w[0]?.toUpperCase() ?? "") + w.slice(1)).join(" ");

  const dbListEntries = entries.map((e, i) => ({
    id: e.id,
    slug: e.slug,
    index: i + 1,
    total: combinedTotal,
    title: e.title,
    tagline: e.tagline,
    stateName: e.primaryGeography.name,
    startYear: e.startYear,
    endYear: e.endYear,
    scaleBand: e.scaleBand,
    catEndorsement: e.catEndorsement,
    themes: e.themes,
  }));

  // Atlas records as list rows so the home right-rail reflects the full 35,
  // capped at 5 + a "Read more" CTA linking to /map.
  const atlasListEntries = atlasRecords.map((r, i) => ({
    id: r.id,
    slug: r.id,
    index: dbListEntries.length + i + 1,
    total: combinedTotal,
    title: r.title,
    tagline: r.summary,
    stateName: r.district ?? r.stateCode ?? "—",
    startYear: r.publishedAt ? Number(r.publishedAt.slice(0, 4)) : new Date().getFullYear(),
    endYear: null,
    scaleBand: r.scaleBand ?? "multi_district",
    catEndorsement: "cat_listed" as const,
    themes: r.themes.slice(0, 2).map((t) => ({
      slug: t,
      name: prettyThemeHome(t),
      colourHex: THEME_COLOURS_HOME[t] ?? "#334B4A",
    })),
    internalHref: `/atlas/${r.id}`,
    sourceName: r.sourceName,
  }));

  const listEntries = [...dbListEntries, ...atlasListEntries];

  const lastUpdate =
    entries[0]?.lastReviewedAt ?? entries[0]?.publishedDate ?? new Date();

  return (
    <>
      {/* HERO — looping video backdrop sits static-composed inside the
          frame so the full illustration reads. A tiny 0.06 strength
          gives just enough drift on scroll to feel alive without
          cropping the image. */}
      <ParallaxBanner
        videoSrc="/videos/hero-parallax.mp4"
        // Poster is critical: Chrome's autoplay policy pauses
        // "video-only background media" (muted with no audio track) to
        // save power, leaving the section blank. The poster guarantees
        // a frame of the illustration is always visible, regardless of
        // whether the browser allows autoplay.
        poster="/videos/hero-poster.jpg"
        alt="Looping illustration of Indian food systems and landscapes"
        strength={0.06}
        textStrength={0.05}
      >
        <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-20 sm:pt-28 lg:pt-32 pb-28 sm:pb-32 lg:pb-40 min-h-[520px] sm:min-h-[600px] lg:min-h-[660px] flex">
          <div className="max-w-[60ch] lg:max-w-[62ch]">
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
              Credible food systems work from across India, edited by people who actually
              read it. Every entry has been checked against its sources before it goes up,
              and what didn&apos;t work shows up next to what did. Run by the Consortium for
              Agroecological Transformations.
            </p>
            <div
              className="mt-8 flex flex-wrap gap-3 reveal-stagger"
              style={{ animationDelay: "440ms" }}
            >
              <Link
                href="/landscapes"
                className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] px-5 py-3 rounded-[4px] bg-amber text-deep-teal font-semibold hover:bg-amber-deep hover:text-paper transition-colors"
              >
                Browse the 11 landscapes
                <ArrowUpRight size={13} strokeWidth={2} aria-hidden />
              </Link>
              <Link
                href="/agent"
                className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] px-5 py-3 rounded-[4px] border border-paper/50 text-paper hover:border-amber hover:text-amber transition-colors"
              >
                Ask the assistant
              </Link>
            </div>
          </div>
        </div>
      </ParallaxBanner>

      {/* EDITOR'S NOTE — sits on paper, below the hero, never over the video */}
      <section
        className="relative border-b border-line"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(232,240,234,0.65) 0%, rgba(251,248,242,0.85) 45%, rgba(248,202,124,0.10) 100%)",
        }}
      >
        <span
          aria-hidden
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(46,117,115,0.45) 30%, rgba(248,202,124,0.55) 75%, transparent 100%)",
          }}
        />
        <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 py-6 grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] gap-x-8 gap-y-3 items-center">
          <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-teal font-semibold whitespace-nowrap">
            <span
              className="w-7 h-7 rounded-[6px] inline-flex items-center justify-center text-paper"
              aria-hidden
              style={{
                background:
                  "linear-gradient(155deg, #2E7573 0%, #334B4A 100%)",
                boxShadow:
                  "0 4px 12px -6px rgba(46,117,115,0.55), inset 0 1px 0 rgba(255,255,255,0.25)",
              }}
            >
              <Feather size={13} strokeWidth={1.8} />
            </span>
            Editor&apos;s note
          </span>
          <p className="font-serif text-[14.5px] text-ink-soft leading-[1.55] max-w-[80ch]">
            The Hub covers food systems work from across India, not just the Consortium&apos;s
            own portfolio. Government missions, NGO programmes, farmer federations, market
            infrastructure. Whatever&apos;s here is here because an editor read it and thought
            it was worth other people reading too.
          </p>
          <span className="hidden lg:inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-amber-deep whitespace-nowrap">
            <span className="w-5 h-px bg-gradient-to-r from-transparent via-amber-deep to-amber-deep" />
            Edited by hand
          </span>
        </div>
      </section>

      {/* STAT STRIP — uses the same merged counts the atlas top bar shows */}
      <Reveal>
        <StatStrip
          stats={[
            { label: "Programmes listed", value: String(combinedTotal), sup: "↗", delta: "across the atlas" },
            { label: "States covered", value: String(combinedStateCount), delta: "of 28 + 8 UTs" },
            { label: "Organisations", value: String(counts.organisations), delta: "across the system" },
            { label: "Resources", value: String(counts.resources), delta: "reports, briefs, datasets" },
          ]}
        />
      </Reveal>

      <Reveal delay={80}>
        <EndorsementLegend />
      </Reveal>

      {/* ATLAS */}
      <Reveal>
        <SectionHead title="Solutions" italic="Atlas" meta="Hover or tap a state to filter" />
        <p className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 font-sans italic text-[16.5px] sm:text-[17px] text-ink-soft leading-[1.6] max-w-[58ch] font-light -mt-2 mb-4">
          A national reading of credible food systems programmes. Each entry has been
          read against its sources before it lands here.
        </p>
        <AtlasSection
          mapEntries={mapEntries}
          listEntries={listEntries}
          totalStates={combinedStateCount}
          cap={4}
          readMoreHref="/map"
        />
      </Reveal>

      {/* THEMES — dark editorial feature band (Research-Journal direction) */}
      <Reveal as="section" className="mt-8 py-16 lg:py-24 bg-ink">
        <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 mb-9">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber mb-3">
            Eight working areas
          </div>
          <h2 className="font-serif text-[34px] sm:text-[42px] leading-[1.04] tracking-[-0.02em] text-paper">
            Read by <span className="italic font-normal text-amber">theme</span>.
          </h2>
        </div>
        <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {themes.map((t, i) => (
            <Link
              key={t.slug}
              href={`/theme/${t.slug}`}
              className="group relative flex flex-col gap-3.5 min-h-[190px] p-6 rounded-[8px] reveal-stagger transition-colors duration-200"
              style={{
                ["--c" as string]: t.colourHex,
                animationDelay: `${i * 60}ms`,
                background: "#22302e",
                border: "1px solid rgba(255,255,255,0.08)",
              } as React.CSSProperties}
            >
              {/* flat square icon tile — single theme colour, no gradient/glow */}
              <span
                className="w-[40px] h-[40px] rounded-[6px] flex items-center justify-center text-paper"
                style={{ background: t.colourHex }}
                aria-hidden
              >
                <ThemeIcon slug={t.slug} size={22} />
              </span>
              <h3 className="font-serif text-[21px] font-medium tracking-[-0.012em] text-paper leading-[1.16] max-w-[20ch]">
                {t.name}
              </h3>
              {/* metadata as a bare mono label — contrast lifted to clear WCAG AA */}
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-paper/75 mt-auto">
                <strong className="text-paper text-[13px] font-semibold">{t.entryCount}</strong>{" "}
                {t.entryCount === 1 ? "programme" : "programmes"}
              </span>
              <span
                className="absolute top-6 right-6 font-serif text-[18px] text-paper/55 transition-all duration-200 group-hover:translate-x-1 group-hover:text-[color:var(--c)]"
                aria-hidden
              >
                →
              </span>
            </Link>
          ))}
        </div>
      </Reveal>

      {/* SUPPORTERS */}
      <Reveal>
        <Supporters />
      </Reveal>

      {/* SDGS */}
      <Reveal>
        <Sdgs />
      </Reveal>

      {/* FEATURED ENTRY */}
      {entries[0] && (
        <Reveal>
          <FeaturedEntry entry={entries[0]} />
        </Reveal>
      )}
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
        className="relative overflow-hidden border border-line rounded-[8px] mt-2"
        style={{
          background:
            "linear-gradient(135deg, rgba(251,248,242,1) 0%, rgba(232,240,234,0.85) 60%, rgba(220,235,224,0.75) 100%)",
          boxShadow: "0 1px 2px rgba(26,38,37,0.04), 0 18px 40px -20px rgba(46,117,115,0.20)",
        }}
      >
        {/* Soft mint pool, lower-right corner */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 50% 60% at 110% 110%, rgba(159,184,166,0.30), transparent 60%)",
          }}
        />
        <div className="relative p-7 sm:p-10 lg:p-12">
          <div className="max-w-[64ch]">
            <div className="flex gap-2.5 items-center mb-5 font-mono text-[10.5px] uppercase tracking-mono-wide flex-wrap">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-paper font-semibold"
                style={{
                  background:
                    "linear-gradient(135deg, #2E7573 0%, #334B4A 100%)",
                  boxShadow:
                    "0 4px 12px -6px rgba(46,117,115,0.55), inset 0 1px 0 rgba(255,255,255,0.20)",
                }}
              >
                <BookMarked size={11} strokeWidth={1.9} aria-hidden />
                Featured programme
              </span>
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
              className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-mono-wide px-4 py-2.5 rounded-full text-deep-teal font-semibold transition-all hover:-translate-y-0.5"
              style={{
                background:
                  "linear-gradient(135deg, #F8CA7C 0%, #E0A65A 100%)",
                boxShadow:
                  "0 8px 20px -10px rgba(198,140,46,0.55), inset 0 1px 0 rgba(255,255,255,0.30)",
              }}
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
