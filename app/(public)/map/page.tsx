import Link from "next/link";
import { AtlasSection } from "@/components/entries/AtlasSection";
import { MapFilterBar } from "@/components/entries/MapFilterBar";
import { IndiaMap } from "@/components/map/IndiaMap";
import { listFactSheets } from "@/lib/factsheet/generate";
import { CATEGORIES, CATEGORY_BY_SLUG, categoryName } from "@/lib/data/categories";
import { PRINCIPLES, getPrincipleBySlug } from "@/lib/data/principles";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

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
  // Union Territories
  AN: "Andaman & Nicobar",
  CH: "Chandigarh",
  DH: "Dadra & Nagar Haveli and Daman & Diu",
  DL: "Delhi",
  LA: "Ladakh",
  LD: "Lakshadweep",
  PY: "Puducherry",
};

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; principle?: string; state?: string }>;
}) {
  const sp = await searchParams;

  const allFactsheets = await listFactSheets();
  // Published, geocoded fact sheets are the Atlas (decoupled engine).
  const publishedFactsheets = allFactsheets.filter(
    (f) => f.status === "published" && f.latitude != null && f.longitude != null
  );

  // Live per-axis counts over the full published set (so chip counts stay
  // stable regardless of the active filter), then apply the active filters.
  const categoryCounts: Record<string, number> = {};
  const principleCounts: Record<string, number> = {};
  const stateCounts: Record<string, number> = {};
  for (const f of publishedFactsheets) {
    for (const t of f.themes ?? []) categoryCounts[t] = (categoryCounts[t] ?? 0) + 1;
    for (const p of f.principle_alignment ?? [])
      principleCounts[p] = (principleCounts[p] ?? 0) + 1;
    const sc = f.state_code ?? "";
    if (sc) stateCounts[sc] = (stateCounts[sc] ?? 0) + 1;
  }
  // Only states that actually have fact sheets, named + alphabetised. This is
  // data-driven: a fact sheet in a brand-new state makes its chip appear here
  // automatically, with a readable name (falling back to the code if unmapped).
  const statesWithCounts = Object.keys(stateCounts).sort((a, b) =>
    (STATE_NAMES[a] ?? a).localeCompare(STATE_NAMES[b] ?? b),
  );
  // All three axes are multi-select (comma-separated in the URL), validated and
  // de-duped. Within an axis the values are OR'd; the three axes intersect (AND).
  const parseList = (v: string | undefined) =>
    [...new Set((v ?? "").split(",").map((s) => s.trim()).filter(Boolean))];
  const activeCategories = parseList(sp.category).filter((s) => CATEGORY_BY_SLUG[s]);
  const activePrinciples = parseList(sp.principle).filter((s) => getPrincipleBySlug(s));
  const activeStates = parseList(sp.state)
    .map((s) => s.toUpperCase())
    .filter((s) => stateCounts[s] != null);

  const factsheets = publishedFactsheets.filter(
    (f) =>
      (activeCategories.length === 0 ||
        (f.themes ?? []).some((t) => activeCategories.includes(t))) &&
      (activePrinciples.length === 0 ||
        (f.principle_alignment ?? []).some((p) => activePrinciples.includes(p))) &&
      (activeStates.length === 0 || activeStates.includes(f.state_code ?? ""))
  );

  // Options for the multi-select dropdown filter bar (counts are over the full
  // published set so they stay stable).
  const categoryOpts = CATEGORIES.map((c) => ({
    value: c.slug,
    label: c.short,
    count: categoryCounts[c.slug] ?? 0,
  }));
  const principleOpts = PRINCIPLES.map((p) => ({
    value: p.slug,
    label: p.title,
    count: principleCounts[p.slug] ?? 0,
    n: p.n,
  }));
  const stateOpts = statesWithCounts.map((code) => ({
    value: code,
    label: STATE_NAMES[code] ?? code,
    count: stateCounts[code] ?? 0,
  }));
  const totalActive = activeCategories.length + activePrinciples.length + activeStates.length;

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
          <h1 className="font-sans font-semibold text-[clamp(40px,5.4vw,76px)] tracking-[-0.04em] leading-[0.98] text-ink mt-4">
            Solutions <span className="text-teal">Atlas</span>
          </h1>
          <p className="text-[16.5px] sm:text-[18px] text-ink-soft leading-[1.55] tracking-[-0.01em] max-w-[54ch] mt-6">
            Every food-systems programme on the Hub, plotted on India. Each dot is an
            auto-compiled, source-verified fact sheet. This is the open library,
            complementary to CAT&apos;s eleven{" "}
            <Link href="/landscapes" className="text-teal hover:text-teal-soft underline-offset-2 hover:underline not-italic">
              focus landscapes
            </Link>
            .
          </p>
          <p className="text-[15px] text-ink-soft leading-[1.55] tracking-[-0.01em] max-w-[54ch] mt-4">
            Explore the whole library at once, or use the filters below to view related solutions
            and programmes.
          </p>
        </div>
        <aside className="lg:border-l lg:border-line lg:pl-7 lg:self-end lg:pb-2 border-t border-line pt-6 lg:border-t-0 lg:pt-0 reveal-stagger" style={{ animationDelay: "180ms" }}>
          <span className="eyebrow">In the Solutions Atlas</span>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
            <div>
              <dt>Programmes</dt>
              <dd className="font-serif text-[26px] text-deep-teal mt-1 leading-none tracking-[-0.02em] tabular-nums">
                <AnimatedNumber value={String(mapEntries.length)} />
              </dd>
            </div>
            <div>
              <dt>States</dt>
              <dd className="font-serif text-[26px] text-deep-teal mt-1 leading-none tracking-[-0.02em] tabular-nums">
                <AnimatedNumber value={String(stateCount)} />
              </dd>
            </div>
          </dl>
          <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted mt-4 leading-relaxed">
            <span className="text-amber-deep">●</span> includes routed discovery records:
            government, NGO and federation-led programmes pulled from public sources
          </p>
        </aside>
      </section>

      {/* Filter bar — three multi-select dropdowns, right-aligned (Intervention
          · Principle · State). Selections live in the URL (deep-linkable). */}
      <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
          Showing{" "}
          <span className="text-deep-teal font-semibold tabular-nums">{factsheets.length}</span>
          {totalActive > 0 ? (
            <>
              {" "}of <span className="tabular-nums">{publishedFactsheets.length}</span>
            </>
          ) : null}{" "}
          {factsheets.length === 1 ? "solution" : "solutions"}
        </p>
        <MapFilterBar
          categories={categoryOpts}
          principles={principleOpts}
          states={stateOpts}
        />
      </div>

      {/* Results list (left) + a bigger India map pinned on the right. Five rows
          per page keeps the list height close to the map's, so they line up. */}
      <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pb-16 lg:pb-20 grid grid-cols-1 lg:grid-cols-[minmax(0,42fr)_minmax(0,58fr)] gap-8 lg:gap-12 items-start">
        <div className="min-w-0">
          <AtlasSection
            layout="list"
            mapEntries={mapEntries}
            listEntries={listEntries}
            totalStates={stateCount}
            pageSize={5}
          />
        </div>
        <div className="lg:sticky lg:top-24 lg:self-start">
          <IndiaMap
            entries={mapEntries}
            totalProgrammes={mapEntries.length}
            totalStates={stateCount}
          />
        </div>
      </div>
    </>
  );
}
