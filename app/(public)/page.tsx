import {
  getOverviewCounts,
  getPublishedEntries,
} from "@/lib/db/queries";
import { AtlasSection } from "@/components/entries/AtlasSection";
import { listFactSheets, getCategoryCounts } from "@/lib/factsheet/generate";
import { CATEGORIES } from "@/lib/data/categories";
import { SectionHead } from "@/components/ui/SectionHead";
import {
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Globe2,
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
      {/* HERO — split: broadsheet type on cream (left), illustration framed
          (right). Text sits on solid cream, so it's fully legible with no scrim. */}
      <section className="relative overflow-hidden bg-cream">
        {/* Full-bleed still illustration. The artwork has an empty cream zone on
            the left — the text sits over it, so dark type stays legible. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero-still.png"
          alt="Hand-illustrated map of India's food landscapes"
          className="absolute inset-0 w-full h-full object-cover object-[62%_center] select-none pointer-events-none"
        />
        {/* Cream wash on the left for text legibility; fades to reveal the art. */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, var(--cream) 0%, rgba(243,241,234,0.94) 30%, rgba(243,241,234,0.6) 50%, rgba(243,241,234,0.0) 70%)",
          }}
        />
        {/* Soft bottom blend into the next band. */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-20 pointer-events-none"
          style={{ background: "linear-gradient(180deg, transparent, var(--cream))" }}
        />

        <div className="relative max-w-page mx-auto px-5 sm:px-7 lg:px-10 py-16 sm:py-20 lg:py-24 min-h-[540px] lg:min-h-[600px] flex items-center">
          <div className="max-w-[54ch]">
            <div className="flex items-center gap-3 mb-6 font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted reveal-stagger">
              <Sparkles size={12} strokeWidth={1.8} className="text-teal" aria-hidden />
              Vol. 01 · Edition 2026
              <span className="w-1 h-1 rounded-full bg-amber-deep" />
              Updated{" "}
              {lastUpdate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </div>

            <h1
              className="font-sans font-semibold text-ink tracking-[-0.04em] leading-[0.98] max-w-[15ch] text-[clamp(40px,5.6vw,84px)] reveal-stagger"
              style={{ animationDelay: "100ms" }}
            >
              What&apos;s actually working in India&apos;s food systems.
            </h1>

            <p
              className="mt-6 max-w-[48ch] text-[16.5px] sm:text-[18px] leading-[1.55] text-ink-soft tracking-[-0.01em] reveal-stagger"
              style={{ animationDelay: "240ms" }}
            >
              A living atlas of credible programmes from across the country, each compiled
              from public sources and checked before it goes up. What didn&apos;t work sits
              next to what did.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4 reveal-stagger" style={{ animationDelay: "380ms" }}>
              <Link
                href="/map"
                className="inline-flex items-center gap-2 text-[14px] font-medium px-6 py-3 rounded-full bg-deep-teal text-paper hover:bg-teal active:scale-[0.97] transition-[transform,background-color] duration-150 ease-out-expo"
              >
                Explore the Solutions Atlas
                <ArrowUpRight size={15} strokeWidth={2} aria-hidden />
              </Link>
              <Link
                href="/landscapes"
                className="text-[14px] text-ink underline underline-offset-4 decoration-line hover:decoration-ink transition-colors"
              >
                The 11 landscapes
              </Link>
            </div>

            <div className="mt-9 pt-6 border-t border-line/80 flex flex-wrap items-center gap-x-7 gap-y-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted reveal-stagger max-w-[44ch]" style={{ animationDelay: "480ms" }}>
              <span><strong className="text-ink text-[13px] font-semibold tabular-nums">{combinedTotal}</strong> solutions</span>
              <span><strong className="text-ink text-[13px] font-semibold tabular-nums">{combinedStateCount}</strong> states</span>
              <span><strong className="text-ink text-[13px] font-semibold tabular-nums">11</strong> landscapes</span>
              <span><strong className="text-ink text-[13px] font-semibold tabular-nums">{counts.organisations}</strong> organisations</span>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — soft cream band (tonal flow, no hard rule) */}
      <section className="relative bg-cream">
        <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 py-16 lg:py-20 grid grid-cols-1 sm:grid-cols-3 gap-y-8">
          {[
            {
              Icon: Sparkles,
              title: "Auto-compiled",
              body: "Each solution is built from public sources, then plotted on the map and made searchable.",
            },
            {
              Icon: ShieldCheck,
              title: "Source-verified",
              body: "Every figure is cited to where it came from. Unverifiable claims are refused, never guessed.",
            },
            {
              Icon: Globe2,
              title: "The whole sector",
              body: "Government missions, NGO programmes, farmer federations and markets across India, not just CAT's portfolio.",
            },
          ].map(({ Icon, title, body }, i) => (
            <div
              key={title}
              className={`flex items-start gap-3 ${i > 0 ? "sm:border-l sm:border-line/60 sm:pl-8" : ""}`}
            >
              <span
                className="w-7 h-7 rounded-[6px] inline-flex items-center justify-center text-paper shrink-0 mt-0.5"
                aria-hidden
                style={{
                  background: "linear-gradient(155deg, #2E7573 0%, #334B4A 100%)",
                  boxShadow:
                    "0 4px 12px -6px rgba(46,117,115,0.55), inset 0 1px 0 rgba(255,255,255,0.25)",
                }}
              >
                <Icon size={13} strokeWidth={1.8} />
              </span>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-teal font-semibold">
                  {title}
                </div>
                <p className="font-serif text-[13.5px] text-ink-soft leading-[1.5] mt-1.5 max-w-[42ch]">
                  {body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>


      {/* ATLAS */}
      <Reveal>
        <SectionHead title="Solutions" italic="Atlas" meta="Hover or tap a state to filter" />
        <p className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 text-[16px] sm:text-[17px] text-ink-soft leading-[1.6] max-w-[60ch] tracking-[-0.01em] mt-3 mb-6">
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

      {/* CATEGORIES — Equals "spreadsheet grid" of category cells on cream.
          Each category's colour IS its icon (a flat block). Counts pulled live
          from the Atlas; each cell deep-links into the filtered Atlas. */}
      <Reveal as="section" className="bg-cream mt-16 lg:mt-20 border-t border-line">
        <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-16 lg:pt-20 pb-9">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-deep mb-3">
            Ten intervention areas
          </div>
          <h2 className="font-sans font-semibold text-[clamp(32px,4vw,52px)] leading-[1.0] tracking-[-0.035em] text-ink max-w-[18ch]">
            Explore by what it does.
          </h2>
          <p className="mt-4 max-w-[60ch] text-[15px] leading-[1.6] text-ink-soft">
            Every solution in the Atlas is tagged to one or more of these ten categories.
            The counts update as the Atlas grows.
          </p>
        </div>
        <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pb-16 lg:pb-20">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-px bg-line border border-line">
            {categoryTiles.map((t) => (
              <Link
                key={t.slug}
                href={`/map?category=${t.slug}`}
                className="group bg-paper p-5 flex flex-col gap-3 min-h-[132px] hover:bg-cream transition-colors active:scale-[0.99]"
                style={{ transition: "background-color 150ms, transform 150ms" }}
              >
                {/* category icon, in the category colour */}
                <t.Icon size={24} strokeWidth={1.7} style={{ color: t.colourHex }} aria-hidden />
                <h3 className="font-sans text-[16px] font-semibold tracking-[-0.02em] text-ink leading-[1.18]">
                  {t.short}
                </h3>
                <span className="mt-auto font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                  <strong className="text-ink text-[13px] font-semibold tabular-nums">{t.count}</strong>{" "}
                  {t.count === 1 ? "solution" : "solutions"}
                </span>
              </Link>
            ))}
          </div>
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
