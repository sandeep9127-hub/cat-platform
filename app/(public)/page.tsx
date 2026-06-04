import {
  getOverviewCounts,
  getPublishedEntries,
} from "@/lib/db/queries";
import { AtlasSection } from "@/components/entries/AtlasSection";
import { listFactSheets, getCategoryCounts } from "@/lib/factsheet/generate";
import { CATEGORIES } from "@/lib/data/categories";
import { StatStrip } from "@/components/ui/StatStrip";
import { SectionHead } from "@/components/ui/SectionHead";
import {
  Sparkles,
  ArrowUpRight,
  Feather,
  BookMarked,
  Sprout,
  Trees,
  Beef,
  Fish,
  Droplets,
  Flower2,
  Apple,
  Store,
  Zap,
  GraduationCap,
  type LucideIcon,
} from "lucide-react";
import { Supporters } from "@/components/home/Supporters";
import { Sdgs } from "@/components/home/Sdgs";
import { ParallaxBanner } from "@/components/home/ParallaxBanner";
import { Reveal } from "@/components/ui/Reveal";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const revalidate = 60;

export default async function LandingPage() {
  const [entries, categoryCounts, counts] = await Promise.all([
    getPublishedEntries(),
    getCategoryCounts(),
    getOverviewCounts(),
  ]);

  // The 10 intervention categories, each carrying its live Atlas count. Both
  // these tiles and the Atlas filter read from the same fact-sheet themes, so
  // the numbers always tally with /map. Sorted by populated-first.
  const CATEGORY_ICON: Record<string, LucideIcon> = {
    "agri-horti-agroforestry": Sprout,
    "forestry-ntfp": Trees,
    livestock: Beef,
    fisheries: Fish,
    nrm: Droplets,
    biodiversity: Flower2,
    nutrition: Apple,
    market: Store,
    energy: Zap,
    "technical-assistance": GraduationCap,
  };
  const categoryTiles = CATEGORIES.map((c) => ({
    ...c,
    count: categoryCounts[c.slug] ?? 0,
    Icon: CATEGORY_ICON[c.slug] ?? Sprout,
  })).sort((a, b) => b.count - a.count);

  // ─── Merge DB entries with atlas-routed discovery records so the landing
  // page reflects the same library shape as /map. The right-rail list is
  // capped at 5 by AtlasSection (cap prop below) with a "Read more" CTA
  // linking to /map; the map itself shows all pins.
  // The Atlas is the fact-sheet engine only (uniformity) — same as /map.
  const factsheets = (await listFactSheets()).filter(
    (f) => f.status === "published" && f.latitude != null && f.longitude != null
  );

  const mapEntries = factsheets.map((f) => ({
    id: f.slug,
    slug: f.slug,
    title: f.title,
    scaleBand: f.scale_band ?? "multi_district",
    provenance: "sourced" as const,
    stateCode: f.state_code ?? "",
    latitude: f.latitude!,
    longitude: f.longitude!,
    internalHref: `/factsheet/${f.slug}`,
  }));
  const combinedTotal = factsheets.length;
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

  const listEntries = factsheets.map((f, i) => ({
    id: f.slug,
    slug: f.slug,
    index: i + 1,
    total: combinedTotal,
    title: f.title,
    tagline: f.one_liner ?? f.summary ?? "",
    stateName: f.district ?? f.state_code ?? "—",
    startYear: f.start_year ?? new Date(f.updated_at).getFullYear(),
    endYear: null,
    scaleBand: f.scale_band ?? "multi_district",
    catEndorsement: "none" as const,
    themes: (f.themes ?? []).slice(0, 2).map((t) => ({
      slug: t,
      name: prettyThemeHome(t),
      colourHex: THEME_COLOURS_HOME[t] ?? "#334B4A",
    })),
    internalHref: `/factsheet/${f.slug}`,
    sourceName: f.source_name ?? "",
  }));

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
              <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#fbf8f2d9] drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
                <Sparkles size={11} strokeWidth={1.8} className="text-amber" aria-hidden />
                Vol. 01 · Edition 2026
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber" />
              <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#fbf8f2cc] drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
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
              className="font-serif italic text-[17px] sm:text-[19px] text-[#fbf8f2d9] leading-[1.5] max-w-[44ch] mt-6 sm:mt-7 font-light drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)] reveal-stagger"
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
                className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] px-5 py-3 rounded-[4px] border border-[#fbf8f280] text-paper hover:border-amber hover:text-amber transition-colors"
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
            { label: "Landscapes", value: "11", delta: "CAT focus geographies" },
          ]}
        />
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

      {/* CATEGORIES — dark editorial feature band. The 10 CAT intervention
          categories; each count is pulled live from the Atlas fact sheets and
          each tile deep-links into the filtered Solutions Atlas. */}
      <Reveal as="section" className="mt-8 py-16 lg:py-24 bg-ink">
        <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 mb-9">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber mb-3">
            Ten intervention areas
          </div>
          <h2 className="font-serif text-[34px] sm:text-[42px] leading-[1.04] tracking-[-0.02em] text-paper">
            Explore by <span className="italic font-normal text-amber">what it does</span>.
          </h2>
          <p className="mt-3 max-w-[58ch] text-[14.5px] leading-[1.6] text-[#fbf8f2bf]">
            Every solution in the Atlas is tagged to one or more of these ten
            categories. The counts update as the Atlas grows.
          </p>
        </div>
        <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
          {categoryTiles.map((t, i) => (
            <Link
              key={t.slug}
              href={`/map?category=${t.slug}`}
              className="group relative flex flex-col gap-3.5 min-h-[176px] p-5 rounded-[10px] reveal-stagger transition-all duration-200 hover:-translate-y-0.5"
              style={{
                ["--c" as string]: t.colourHex,
                animationDelay: `${i * 50}ms`,
                background: "var(--ink-2)",
                border: "1px solid rgba(255,255,255,0.08)",
              } as React.CSSProperties}
            >
              {/* gradient icon chip in the category colour */}
              <span
                className="w-[42px] h-[42px] rounded-[9px] flex items-center justify-center text-paper shadow-[0_6px_16px_-8px_var(--c)]"
                style={{
                  background:
                    "linear-gradient(140deg, color-mix(in oklch, var(--c) 92%, white) 0%, var(--c) 55%, color-mix(in oklch, var(--c) 78%, black) 100%)",
                }}
                aria-hidden
              >
                <t.Icon size={21} strokeWidth={1.75} />
              </span>
              <h3 className="font-serif text-[18.5px] font-medium tracking-[-0.012em] text-paper leading-[1.18] max-w-[18ch]">
                {t.short}
              </h3>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#fbf8f2bf] mt-auto">
                <strong className="text-paper text-[13px] font-semibold">{t.count}</strong>{" "}
                {t.count === 1 ? "solution" : "solutions"}
              </span>
              <span
                className="absolute top-5 right-5 transition-all duration-200 text-[#fbf8f28c] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[color:var(--c)]"
                aria-hidden
              >
                <ArrowUpRight size={17} strokeWidth={2} />
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
