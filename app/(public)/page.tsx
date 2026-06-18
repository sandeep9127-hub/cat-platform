import { getOverviewCounts } from "@/lib/db/queries";
import { listFactSheets, getCategoryCounts } from "@/lib/factsheet/generate";
import { CATEGORIES } from "@/lib/data/categories";
import {
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Globe2,
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
import { IndiaMap } from "@/components/map/IndiaMap";
import { ApproachFilm } from "@/components/home/ApproachFilm";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { StaggerReveal } from "@/components/ui/StaggerReveal";
import { Reveal } from "@/components/ui/Reveal";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const revalidate = 60;

// Deterministic UTC date format ("14 May 2026") so server and client render the
// same string regardless of timezone/ICU — toLocaleDateString drifts across the
// hydration boundary (see the landscape toLocaleString hydration gotcha).
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtDateUTC(d: Date): string {
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export default async function LandingPage() {
  const [categoryCounts, counts] = await Promise.all([
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
  const allFactsheets = await listFactSheets();
  const publishedSheets = allFactsheets.filter((f) => f.status === "published");
  const factsheets = publishedSheets.filter(
    (f) => f.latitude != null && f.longitude != null
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


  // "Updated" syncs with the Atlas: the most recent published fact-sheet change.
  // (Previously read entries[0] from the retired `entries` table, so it never moved.)
  const lastUpdate = publishedSheets.reduce<Date>((max, f) => {
    const t = f.updated_at ? new Date(f.updated_at) : null;
    return t && !isNaN(t.getTime()) && t.getTime() > max.getTime() ? t : max;
  }, new Date(0));
  const hasLastUpdate = lastUpdate.getTime() > 0;

  return (
    <>
      {/* HERO — the living map: the Atlas itself (47 pins dropping in) beside a
          calm headline panel. The product is the hero; no scrim, no stock art. */}
      <section className="relative bg-cream">
        <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-10 sm:pt-14 lg:pt-16 pb-14 lg:pb-16 grid grid-cols-1 lg:grid-cols-[0.92fr_1.08fr] gap-12 lg:gap-16 items-center">
          {/* Left — headline panel */}
          <div className="order-2 lg:order-1">
            {hasLastUpdate && (
              <div className="flex items-center gap-2.5 mb-6 font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted reveal-stagger">
                <Sparkles size={12} strokeWidth={1.8} className="text-teal" aria-hidden />
                Updated {fmtDateUTC(lastUpdate)}
              </div>
            )}

            <h1
              className="font-sans font-semibold text-ink tracking-[-0.04em] leading-[1.06] max-w-[15ch] text-[clamp(38px,5vw,78px)] reveal-stagger"
              style={{ animationDelay: "100ms" }}
            >
              What&apos;s actually working in India&apos;s{" "}
              <span className="text-teal">food systems</span>
            </h1>

            <p
              className="mt-6 max-w-[50ch] text-[16.5px] sm:text-[18px] leading-[1.55] text-ink-soft tracking-[-0.01em] reveal-stagger"
              style={{ animationDelay: "240ms" }}
            >
              A living atlas of pioneer programmes from across the country, each compiled
              and verified from public sources before it goes up.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4 reveal-stagger" style={{ animationDelay: "380ms" }}>
              <Link
                href="/map"
                className="group inline-flex items-center gap-2 text-[14px] font-medium px-6 py-3 rounded-full bg-deep-teal text-paper hover:bg-teal active:scale-[0.97] transition-[transform,background-color] duration-150 ease-out-expo"
              >
                Explore the Solutions Atlas
                <ArrowUpRight
                  size={15}
                  strokeWidth={2}
                  className="transition-transform duration-200 ease-out-expo group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden
                />
              </Link>
              <Link
                href="/landscapes"
                className="inline-flex items-center gap-2 text-[14px] font-medium px-6 py-3 rounded-full border border-line text-ink hover:border-deep-teal hover:text-deep-teal active:scale-[0.97] transition-[transform,color,border-color] duration-150 ease-out-expo"
              >
                The 11 landscapes
              </Link>
            </div>
          </div>

          {/* Right — the live Solutions Atlas (pins animate in on load), with
              its stat ledger docked underneath so map + numbers read as one. */}
          <div className="order-1 lg:order-2 reveal-stagger" style={{ animationDelay: "200ms" }}>
            <IndiaMap
              entries={mapEntries}
              totalProgrammes={combinedTotal}
              totalStates={combinedStateCount}
              bare
            />
            <dl className="mt-5 pt-5 border-t border-line/80 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4">
              {[
                { n: combinedTotal, label: "Solutions" },
                { n: combinedStateCount, label: "States" },
                { n: 11, label: "Landscapes" },
                { n: counts.organisations, label: "Organisations" },
              ].map((s) => (
                <div key={s.label}>
                  <dt className="font-sans text-[23px] sm:text-[26px] font-semibold text-ink tabular-nums tracking-[-0.025em] leading-none">
                    <AnimatedNumber value={String(s.n)} />
                  </dt>
                  <dd className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted">
                    {s.label}
                  </dd>
                </div>
              ))}
            </dl>
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
              body: "Every figure is cited to where it came from.",
            },
            {
              Icon: Globe2,
              title: "The whole sector",
              body: "Government missions, NGO programmes, farmer federations and markets across India, and CAT's lighthouse landscapes.",
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

      {/* THE APPROACH — short film from the Consortium, lazy-loaded facade */}
      <Reveal as="section" className="bg-paper border-t border-line">
        <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 py-16 lg:py-20 grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-14 items-center">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-deep mb-3">
              The approach
            </div>
            <h2 className="font-sans font-semibold text-[clamp(28px,3.4vw,44px)] leading-[1.04] tracking-[-0.03em] text-ink max-w-[16ch]">
              Know more about the Consortium behind the Hub
            </h2>
            <p className="mt-4 max-w-[46ch] text-[15px] leading-[1.6] text-ink-soft">
              The Consortium for Agroecological Transformations works across India to put
              farming communities and the environment at the centre of food systems
              transformations. Watch the short film on what that looks like through a
              landscape-based approach.
            </p>
            <a
              href="https://www.agroecologyindia.org"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 text-[14px] text-ink underline underline-offset-4 decoration-line hover:decoration-ink transition-colors"
            >
              Visit agroecologyindia.org
              <ArrowUpRight size={15} strokeWidth={2} aria-hidden />
            </a>
          </div>
          <ApproachFilm />
        </div>
      </Reveal>

      {/* CATEGORIES — Equals "spreadsheet grid" of category cells on cream.
          Each category's colour IS its icon (a flat block). Counts pulled live
          from the Atlas; each cell deep-links into the filtered Atlas. */}
      <Reveal as="section" className="bg-cream mt-16 lg:mt-20 border-t border-line">
        <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-16 lg:pt-20 pb-9">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-deep mb-3">
            Ten themes
          </div>
          <h2 className="font-sans font-semibold text-[clamp(32px,4vw,52px)] leading-[1.0] tracking-[-0.035em] text-ink max-w-[18ch]">
            Explore solutions by theme
          </h2>
          <p className="mt-4 max-w-[60ch] text-[15px] leading-[1.6] text-ink-soft">
            Every solution in the Solutions Atlas is tagged to one or more of these ten
            themes. The counts update as the Atlas grows.
          </p>
        </div>
        <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pb-16 lg:pb-20">
          <StaggerReveal className="grid grid-cols-2 lg:grid-cols-5 gap-px bg-line border border-line">
            {categoryTiles.map((t) => (
              <Link
                key={t.slug}
                href={`/map?category=${t.slug}`}
                className="group relative overflow-hidden bg-paper p-5 flex flex-col gap-3 min-h-[132px] active:scale-[0.99]"
                style={{ transition: "transform 150ms" }}
              >
                {/* hover wash + top hairline in the theme's own colour */}
                <span
                  aria-hidden
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out pointer-events-none"
                  style={{ background: `linear-gradient(180deg, ${t.colourHex}1f 0%, ${t.colourHex}08 100%)` }}
                />
                <span
                  aria-hidden
                  className="absolute top-0 left-0 right-0 h-[2px] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out pointer-events-none"
                  style={{ background: t.colourHex }}
                />

                {/* category icon, in the category colour */}
                <t.Icon
                  size={24}
                  strokeWidth={1.7}
                  style={{ color: t.colourHex }}
                  className="relative transition-transform duration-200 ease-out-expo group-hover:-translate-y-0.5 group-hover:scale-110"
                  aria-hidden
                />
                <h3 className="relative font-sans text-[16px] font-semibold tracking-[-0.02em] text-ink leading-[1.18] group-hover:text-teal transition-colors">
                  {t.short}
                </h3>
                <span className="relative mt-auto flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                    <strong className="text-ink text-[13px] font-semibold tabular-nums">{t.count}</strong>{" "}
                    {t.count === 1 ? "solution" : "solutions"}
                  </span>
                  <span
                    aria-hidden
                    className="font-mono opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
                    style={{ color: t.colourHex }}
                  >
                    &rarr;
                  </span>
                </span>
              </Link>
            ))}
          </StaggerReveal>
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

