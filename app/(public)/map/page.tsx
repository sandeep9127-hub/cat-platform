import Link from "next/link";
import { AtlasSection } from "@/components/entries/AtlasSection";
import { listFactSheets } from "@/lib/factsheet/generate";
import { CATEGORIES, CATEGORY_BY_SLUG, categoryName } from "@/lib/data/categories";

export const dynamic = "force-dynamic";

export const revalidate = 60;
export const metadata = {
  title: "Solutions Atlas",
  description:
    "Every food-systems programme on the Hub, plotted on India. The open library, complementary to CAT's eleven focus landscapes.",
};

function themeColour(slug: string): string {
  return CATEGORY_BY_SLUG[slug]?.colourHex ?? "#334B4A";
}

function prettyTheme(slug: string): string {
  return CATEGORY_BY_SLUG[slug]?.short ?? categoryName(slug);
}

const STATE_NAMES: Record<string, string> = {
  AP: "Andhra Pradesh",
  AR: "Arunachal Pradesh",
  AS: "Assam",
  BR: "Bihar",
  CG: "Chhattisgarh",
  GA: "Goa",
  GJ: "Gujarat",
  HP: "Himachal Pradesh",
  HR: "Haryana",
  JH: "Jharkhand",
  JK: "Jammu & Kashmir",
  KA: "Karnataka",
  KL: "Kerala",
  MH: "Maharashtra",
  ML: "Meghalaya",
  MN: "Manipur",
  MP: "Madhya Pradesh",
  MZ: "Mizoram",
  NL: "Nagaland",
  OD: "Odisha",
  PB: "Punjab",
  RJ: "Rajasthan",
  SK: "Sikkim",
  TG: "Telangana",
  TN: "Tamil Nadu",
  TR: "Tripura",
  UK: "Uttarakhand",
  UP: "Uttar Pradesh",
  WB: "West Bengal",
};

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const sp = await searchParams;
  const activeCategory =
    sp.category && CATEGORY_BY_SLUG[sp.category] ? sp.category : null;

  const allFactsheets = await listFactSheets();
  // Published, geocoded fact sheets are the Atlas (decoupled engine).
  const publishedFactsheets = allFactsheets.filter(
    (f) => f.status === "published" && f.latitude != null && f.longitude != null
  );

  // Live per-category counts over the full published set (so chip counts are
  // stable regardless of the active filter), then apply the active filter.
  const categoryCounts: Record<string, number> = {};
  for (const f of publishedFactsheets)
    for (const t of f.themes ?? [])
      categoryCounts[t] = (categoryCounts[t] ?? 0) + 1;

  const factsheets = activeCategory
    ? publishedFactsheets.filter((f) => (f.themes ?? []).includes(activeCategory))
    : publishedFactsheets;

  // The Solutions Atlas is now the fact-sheet engine ONLY. Old hardcoded
  // records and CAT-authored DB entries are retired for uniformity — every
  // pin is an auto-compiled, cited fact sheet.
  const combinedTotal = factsheets.length;

  const factsheetMapEntries = factsheets.map((f) => ({
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

  const factsheetListEntries = factsheets.map((f, i) => ({
    id: f.slug,
    slug: f.slug,
    index: i + 1,
    total: combinedTotal,
    title: f.title,
    tagline: f.one_liner ?? f.summary ?? "",
    stateName: STATE_NAMES[f.state_code ?? ""] ?? f.district ?? f.state_code ?? "—",
    startYear: f.start_year ?? new Date(f.updated_at).getFullYear(),
    endYear: null,
    scaleBand: f.scale_band ?? "multi_district",
    catEndorsement: "none" as const,
    themes: (f.themes ?? []).slice(0, 2).map((t) => ({
      slug: t,
      name: prettyTheme(t),
      colourHex: themeColour(t),
    })),
    internalHref: `/factsheet/${f.slug}`,
    sourceName: f.source_name ?? "",
  }));

  const mapEntries = factsheetMapEntries;
  const listEntries = factsheetListEntries;

  const stateCount = new Set(factsheetMapEntries.map((e) => e.stateCode).filter(Boolean)).size;

  return (
    <>
      <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-12 sm:pt-16 lg:pt-20 pb-8 grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-10 lg:gap-16 items-end">
        <div className="reveal-stagger" style={{ animationDelay: "0ms" }}>
          <span className="eyebrow">The open library</span>
          <h1 className="font-serif font-normal text-hero-xl text-ink mt-4">
            Solutions{" "}
            <em className="hero-italic italic text-teal not-italic" style={{ fontStyle: "italic" }}>
              Atlas
            </em>
            .
          </h1>
          <p className="font-serif italic text-[17px] sm:text-[19px] text-ink-soft leading-[1.45] max-w-[52ch] mt-6 font-light">
            Every food-systems programme on the Hub, plotted on India. Each dot is an
            auto-compiled, source-verified fact sheet. This is the open library,
            complementary to CAT&apos;s eleven{" "}
            <Link href="/landscapes" className="text-teal hover:text-teal-soft underline-offset-2 hover:underline not-italic">
              focus landscapes
            </Link>
            .
          </p>
        </div>
        <aside className="lg:border-l lg:border-line lg:pl-7 lg:self-end lg:pb-2 border-t border-line pt-6 lg:border-t-0 lg:pt-0 reveal-stagger" style={{ animationDelay: "180ms" }}>
          <span className="eyebrow">In the Solutions Atlas</span>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
            <div>
              <dt>Programmes</dt>
              <dd className="font-serif text-[26px] text-deep-teal mt-1 leading-none tracking-[-0.02em] tabular-nums">
                {mapEntries.length}
              </dd>
            </div>
            <div>
              <dt>States</dt>
              <dd className="font-serif text-[26px] text-deep-teal mt-1 leading-none tracking-[-0.02em] tabular-nums">
                {stateCount}
              </dd>
            </div>
          </dl>
          <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted mt-4 leading-relaxed">
            <span className="text-amber-deep">●</span> includes routed discovery records:
            government, NGO and federation-led programmes pulled from public sources
          </p>
        </aside>
      </section>

      {/* Category filter — deep-linkable (?category=slug), live counts from the
          same fact-sheet themes that drive the landing tiles. */}
      <nav
        aria-label="Filter the Atlas by intervention category"
        className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pb-6"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted mr-1">
            Filter
          </span>
          <Link
            href="/map"
            aria-current={!activeCategory ? "true" : undefined}
            className={
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] border transition-colors " +
              (!activeCategory
                ? "bg-deep-teal text-paper border-deep-teal"
                : "bg-transparent text-ink-soft border-line hover:border-deep-teal hover:text-deep-teal")
            }
          >
            All
            <span className="font-mono text-[10px] tabular-nums opacity-70">
              {publishedFactsheets.length}
            </span>
          </Link>
          {CATEGORIES.map((c) => {
            const active = activeCategory === c.slug;
            const n = categoryCounts[c.slug] ?? 0;
            return (
              <Link
                key={c.slug}
                href={active ? "/map" : `/map?category=${c.slug}`}
                aria-current={active ? "true" : undefined}
                className={
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] border transition-colors " +
                  (active
                    ? "text-paper"
                    : n === 0
                      ? "text-muted border-line/70 opacity-60 hover:opacity-100"
                      : "text-ink-soft border-line hover:text-ink")
                }
                style={
                  active
                    ? { background: c.colourHex, borderColor: c.colourHex }
                    : { ["--c" as string]: c.colourHex } as React.CSSProperties
                }
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: active ? "rgba(255,255,255,0.85)" : c.colourHex }}
                  aria-hidden
                />
                {c.short}
                <span className="font-mono text-[10px] tabular-nums opacity-70">{n}</span>
              </Link>
            );
          })}
        </div>
        {activeCategory && (
          <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted">
            Showing {factsheets.length}{" "}
            {factsheets.length === 1 ? "solution" : "solutions"} in{" "}
            <span className="text-ink-soft">{categoryName(activeCategory)}</span>
          </p>
        )}
      </nav>

      <AtlasSection
        mapEntries={mapEntries}
        listEntries={listEntries}
        totalStates={stateCount}
        pageSize={10}
      />
    </>
  );
}
