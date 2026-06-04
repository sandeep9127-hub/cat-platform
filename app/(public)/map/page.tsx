import Link from "next/link";
import { AtlasSection } from "@/components/entries/AtlasSection";
import { listFactSheets } from "@/lib/factsheet/generate";

export const dynamic = "force-dynamic";

export const revalidate = 60;
export const metadata = {
  title: "Solutions Atlas",
  description:
    "Every food-systems programme on the Hub, plotted on India. The open library, complementary to CAT's eleven focus landscapes.",
};

const THEME_COLOURS: Record<string, string> = {
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

function prettyTheme(slug: string): string {
  return slug
    .split("-")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
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

export default async function MapPage() {
  const allFactsheets = await listFactSheets();
  // Published, geocoded fact sheets are the Atlas (decoupled engine).
  const factsheets = allFactsheets.filter(
    (f) => f.status === "published" && f.latitude != null && f.longitude != null
  );

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
      colourHex: THEME_COLOURS[t] ?? "#334B4A",
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
            Every food-systems programme on the Hub, plotted on India. Each dot is a programme
            at the scale we have published it. Teal is self-submitted; amber is CAT-sourced.
            This is the open library, complementary to CAT&apos;s eleven{" "}
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

      <AtlasSection
        mapEntries={mapEntries}
        listEntries={listEntries}
        totalStates={stateCount}
        pageSize={10}
      />
    </>
  );
}
