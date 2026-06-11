import Link from "next/link";
import { AtlasSection } from "@/components/entries/AtlasSection";
import { listFactSheets } from "@/lib/factsheet/generate";
import { CATEGORIES, CATEGORY_BY_SLUG, categoryName } from "@/lib/data/categories";
import { PRINCIPLES, getPrincipleBySlug, principleTitle } from "@/lib/data/principles";
import { Layers, Compass, MapPin } from "lucide-react";
import { categoryIconFor } from "@/components/ui/CategoryIcon";

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
  const activeCategory =
    sp.category && CATEGORY_BY_SLUG[sp.category] ? sp.category : null;
  const activePrinciple =
    sp.principle && getPrincipleBySlug(sp.principle) ? sp.principle : null;

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
  // Multi-select states (comma-separated codes), validated against the codes
  // that actually exist in the data (not the name map) + de-duped.
  const activeStates = [
    ...new Set(
      (sp.state ?? "")
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter((s) => s && stateCounts[s] != null),
    ),
  ];

  // Two axes, intersected: category (what it does) AND principle (which
  // agroecology principles it advances).
  const factsheets = publishedFactsheets.filter(
    (f) =>
      (!activeCategory || (f.themes ?? []).includes(activeCategory)) &&
      (!activePrinciple || (f.principle_alignment ?? []).includes(activePrinciple)) &&
      (activeStates.length === 0 || activeStates.includes(f.state_code ?? ""))
  );

  // Helper to build an href that preserves the *other* axes.
  const hrefWith = (next: {
    category?: string | null;
    principle?: string | null;
    states?: string[];
  }) => {
    const cat = next.category !== undefined ? next.category : activeCategory;
    const pri = next.principle !== undefined ? next.principle : activePrinciple;
    const sts = next.states !== undefined ? next.states : activeStates;
    const qs = new URLSearchParams();
    if (cat) qs.set("category", cat);
    if (pri) qs.set("principle", pri);
    if (sts && sts.length) qs.set("state", sts.join(","));
    const s = qs.toString();
    return s ? `/map?${s}` : "/map";
  };

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

      {/* Two-axis filter — deep-linkable, with live counts. Axis 1: the 10
          intervention categories (what it does). Axis 2: the 13 agroecology
          principles (what it advances). The axes intersect. Both share the
          fact-sheet data that drives the landing tiles, so numbers always tally. */}
      <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pb-7 space-y-4">
        {/* Axis 1 — categories */}
        <nav aria-label="Filter the Atlas by intervention category">
          <div className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted mb-2.5 inline-flex items-center gap-1.5">
            <Layers size={11} strokeWidth={1.8} aria-hidden />
            By intervention
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={hrefWith({ category: null })}
              aria-current={!activeCategory ? "true" : undefined}
              className={
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] border active:scale-[0.97] transition-[transform,background-color,border-color,color] duration-150 ease-out-expo " +
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
              const Icon = categoryIconFor(c.slug);
              return (
                <Link
                  key={c.slug}
                  href={hrefWith({ category: active ? null : c.slug })}
                  aria-current={active ? "true" : undefined}
                  className={
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] border active:scale-[0.97] transition-[transform,background-color,border-color,color] duration-150 ease-out-expo " +
                    (active
                      ? "text-paper"
                      : n === 0
                        ? "text-muted border-line/70 opacity-60 hover:opacity-100"
                        : "text-ink-soft border-line hover:text-ink")
                  }
                  style={
                    active
                      ? { background: c.colourHex, borderColor: c.colourHex }
                      : ({ ["--c" as string]: c.colourHex } as React.CSSProperties)
                  }
                >
                  <Icon
                    size={13}
                    strokeWidth={1.8}
                    className="shrink-0"
                    style={{ color: active ? "rgba(255,255,255,0.92)" : c.colourHex }}
                    aria-hidden
                  />
                  {c.short}
                  <span className="font-mono text-[10px] tabular-nums opacity-70">{n}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Axis 2 — agroecology principles */}
        <nav aria-label="Filter the Atlas by agroecology principle">
          <div className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted mb-2.5 inline-flex items-center gap-1.5">
            <Compass size={11} strokeWidth={1.8} aria-hidden />
            By agroecology principle
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {PRINCIPLES.map((p) => {
              const active = activePrinciple === p.slug;
              const n = principleCounts[p.slug] ?? 0;
              const tint = p.level === "agro" ? "#5f8d3e" : "#b5793a";
              return (
                <Link
                  key={p.slug}
                  href={hrefWith({ principle: active ? null : p.slug })}
                  aria-current={active ? "true" : undefined}
                  className={
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] border active:scale-[0.97] transition-[transform,background-color,border-color,color] duration-150 ease-out-expo " +
                    (active
                      ? "text-paper"
                      : n === 0
                        ? "text-muted border-line/70 opacity-60 hover:opacity-100"
                        : "text-ink-soft border-line hover:text-ink")
                  }
                  style={active ? { background: tint, borderColor: tint } : undefined}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/images/principle-icons/p${p.n}.png?v=4`}
                    alt=""
                    width={16}
                    height={16}
                    className={
                      "shrink-0 w-4 h-4 object-contain " +
                      (active ? "rounded-full bg-paper/95 p-[1px]" : "")
                    }
                    aria-hidden
                  />
                  {p.title}
                  <span className="font-mono text-[10px] tabular-nums opacity-70">{n}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Axis 3 — states (multi-select). Solves clicking overlapping map dots. */}
        <nav aria-label="Filter the Atlas by state">
          <div className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted mb-2.5 inline-flex items-center gap-1.5">
            <MapPin size={11} strokeWidth={1.8} aria-hidden />
            By state
            {activeStates.length > 0 ? (
              <span className="text-deep-teal normal-case tracking-normal">
                · {activeStates.length} selected
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={hrefWith({ states: [] })}
              aria-current={activeStates.length === 0 ? "true" : undefined}
              className={
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] border active:scale-[0.97] transition-[transform,background-color,border-color,color] duration-150 ease-out-expo " +
                (activeStates.length === 0
                  ? "bg-deep-teal text-paper border-deep-teal"
                  : "bg-transparent text-ink-soft border-line hover:border-deep-teal hover:text-deep-teal")
              }
            >
              All states
              <span className="font-mono text-[10px] tabular-nums opacity-70">
                {statesWithCounts.length}
              </span>
            </Link>
            {statesWithCounts.map((code) => {
              const active = activeStates.includes(code);
              const n = stateCounts[code] ?? 0;
              const nextStates = active
                ? activeStates.filter((c) => c !== code)
                : [...activeStates, code];
              return (
                <Link
                  key={code}
                  href={hrefWith({ states: nextStates })}
                  aria-current={active ? "true" : undefined}
                  className={
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] border active:scale-[0.97] transition-[transform,background-color,border-color,color] duration-150 ease-out-expo " +
                    (active
                      ? "bg-deep-teal text-paper border-deep-teal"
                      : "bg-transparent text-ink-soft border-line hover:text-ink hover:border-deep-teal")
                  }
                >
                  {STATE_NAMES[code] ?? code}
                  <span className="font-mono text-[10px] tabular-nums opacity-70">{n}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {(activeCategory || activePrinciple || activeStates.length > 0) && (
          <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted pt-1">
            Showing {factsheets.length} {factsheets.length === 1 ? "solution" : "solutions"}
            {activeCategory && (
              <>
                {" "}in <span className="text-ink-soft">{categoryName(activeCategory)}</span>
              </>
            )}
            {activePrinciple && (
              <>
                {" "}advancing{" "}
                <span className="text-ink-soft">{principleTitle(activePrinciple)}</span>
              </>
            )}
            {activeStates.length > 0 && (
              <>
                {" "}across{" "}
                <span className="text-ink-soft">
                  {activeStates.map((c) => STATE_NAMES[c] ?? c).join(", ")}
                </span>
              </>
            )}
            {" · "}
            <Link href="/map" className="text-deep-teal hover:underline">
              clear
            </Link>
          </p>
        )}
      </div>

      <AtlasSection
        mapEntries={mapEntries}
        listEntries={listEntries}
        totalStates={stateCount}
        pageSize={10}
      />
    </>
  );
}
