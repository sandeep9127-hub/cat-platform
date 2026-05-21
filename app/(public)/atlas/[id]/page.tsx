import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, ExternalLink, MapPin, Calendar, Building2 } from "lucide-react";
import {
  DISCOVERED_RECORDS,
  getDeepSourceUrl,
  getSourceLinkKind,
} from "@/lib/data/discovered-records";
import { ThemeChip } from "@/components/ui/ThemeChip";

export const dynamic = "force-static";
export const revalidate = 3600;

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

const STATE_NAMES: Record<string, string> = {
  AP: "Andhra Pradesh", AR: "Arunachal Pradesh", AS: "Assam", BR: "Bihar",
  CG: "Chhattisgarh", GA: "Goa", GJ: "Gujarat", HR: "Haryana",
  HP: "Himachal Pradesh", JK: "Jammu & Kashmir", JH: "Jharkhand",
  KA: "Karnataka", KL: "Kerala", MP: "Madhya Pradesh", MH: "Maharashtra",
  MN: "Manipur", ML: "Meghalaya", MZ: "Mizoram", NL: "Nagaland",
  OD: "Odisha", PB: "Punjab", RJ: "Rajasthan", SK: "Sikkim",
  TN: "Tamil Nadu", TG: "Telangana", TR: "Tripura", UP: "Uttar Pradesh",
  UK: "Uttarakhand", WB: "West Bengal", DL: "Delhi",
};

const PROVENANCE_LABEL: Record<string, string> = {
  government: "Government programme",
  ngo: "NGO-led programme",
  research: "Research initiative",
  federation: "Farmer federation",
  philanthropy: "Philanthropy-led",
};

function prettyTheme(slug: string): string {
  return slug
    .split("-")
    .map((w) => (w[0]?.toUpperCase() ?? "") + w.slice(1))
    .join(" ");
}

function humaniseScale(s?: string): string {
  switch (s) {
    case "pilot": return "Pilot";
    case "block": return "Block";
    case "district": return "District";
    case "multi_district": return "Multi-district";
    case "state": return "State";
    case "multi_state": return "Multi-state";
    case "national": return "National";
    default: return s ? s.replace(/_/g, " ") : "Multi-district";
  }
}

type Props = { params: Promise<{ id: string }> };

export async function generateStaticParams() {
  return DISCOVERED_RECORDS.filter((r) => r.destination === "atlas").map((r) => ({
    id: r.id,
  }));
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const record = DISCOVERED_RECORDS.find((r) => r.id === id && r.destination === "atlas");
  if (!record) return { title: "Atlas record not found" };
  return {
    title: record.title,
    description: record.summary.slice(0, 160),
  };
}

export default async function AtlasRecordPage({ params }: Props) {
  const { id } = await params;
  const record = DISCOVERED_RECORDS.find(
    (r) => r.id === id && r.destination === "atlas"
  );
  if (!record) notFound();

  const deepSourceUrl = getDeepSourceUrl(record);
  const sourceLinkKind = getSourceLinkKind(record);
  const sourceCtaLabel =
    sourceLinkKind === "article" ? "View original source" : "Find on publisher";

  const stateName = STATE_NAMES[record.stateCode ?? ""] ?? record.stateCode ?? "—";
  const startYear = record.publishedAt
    ? Number(record.publishedAt.slice(0, 4))
    : null;
  const primaryThemeColour =
    THEME_COLOURS[record.themes[0] ?? ""] ?? "#334B4A";
  const provenanceLabel = record.provenance
    ? PROVENANCE_LABEL[record.provenance] ?? record.provenance
    : "Listed programme";

  return (
    <article className="relative z-10">
      {/* Provenance banner — explains what this page is */}
      <div
        className="border-y border-line"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(248,202,124,0.18) 0%, rgba(251,248,242,0.85) 50%, rgba(248,202,124,0.10) 100%)",
        }}
      >
        <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-amber-deep">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-deep" aria-hidden />
          <span className="font-semibold">CAT-sourced atlas record</span>
          <span className="text-line">·</span>
          <span className="font-normal text-ink-soft tracking-mono-mid normal-case">
            Routed by the editors from public sources. Full material at the publisher below.
          </span>
        </div>
      </div>

      <header className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-10 sm:pt-14 lg:pt-16 pb-8 lg:pb-10 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 lg:gap-12 items-start">
        <div>
          <div className="flex flex-wrap gap-3 items-center font-mono text-[10.5px] uppercase tracking-mono-wide text-teal font-semibold mb-5">
            <span
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full"
              style={{
                background: `${primaryThemeColour}18`,
                color: primaryThemeColour,
              }}
            >
              {prettyTheme(record.themes[0] ?? "general")}
            </span>
            <span className="text-line">/</span>
            <span className="inline-flex items-center gap-1.5 text-ink-soft normal-case font-normal tracking-mono-mid">
              <MapPin size={11} strokeWidth={1.8} aria-hidden />
              {record.district ? `${record.district}, ${stateName}` : stateName}
            </span>
            {startYear != null && (
              <>
                <span className="text-line">·</span>
                <span className="inline-flex items-center gap-1.5 font-normal tracking-mono-mid">
                  <Calendar size={11} strokeWidth={1.8} aria-hidden />
                  Since {startYear}
                </span>
              </>
            )}
            <span className="text-line">·</span>
            <span className="font-normal tracking-mono-mid">
              {humaniseScale(record.scaleBand)}
            </span>
          </div>
          <h1 className="font-serif text-[clamp(32px,4.2vw,54px)] font-normal leading-[1.06] tracking-[-0.022em] text-ink">
            {record.title}
          </h1>
          <p className="font-serif italic text-[19px] sm:text-[21px] text-ink-soft leading-[1.5] mt-6 max-w-[58ch] font-light">
            {record.summary}
          </p>

          {/* Primary CTA — view the original source */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href={deepSourceUrl}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-2.5 px-5 py-3 rounded-full font-mono text-[11px] uppercase tracking-[0.16em] font-semibold text-deep-teal transition-all hover:-translate-y-0.5"
              style={{
                background:
                  "linear-gradient(135deg, #F8CA7C 0%, #E0A65A 100%)",
                boxShadow:
                  "0 10px 26px -12px rgba(198,140,46,0.55), inset 0 1px 0 rgba(255,255,255,0.30)",
              }}
            >
              <span>{sourceCtaLabel}</span>
              <span className="font-normal normal-case tracking-normal text-amber-deep/80">
                {record.sourceName}
              </span>
              <ExternalLink
                size={13}
                strokeWidth={2}
                className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden
              />
            </a>
            <Link
              href="/map"
              className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-teal border-b-2 border-line-soft pb-0.5 hover:border-teal transition-colors"
            >
              ← Back to the Atlas
            </Link>
          </div>
        </div>

        <aside className="lg:border-l lg:border-line lg:pl-7 flex flex-col gap-6 border-t border-line pt-6 lg:pt-0 lg:border-t-0">
          <div>
            <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted font-semibold">
              Programme type
            </span>
            <div className="mt-2 inline-flex items-center gap-2 font-serif text-[15px] text-deep-teal">
              <Building2 size={14} strokeWidth={1.7} aria-hidden className="text-teal" />
              {provenanceLabel}
            </div>
          </div>

          <div>
            <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted font-semibold">
              Published by
            </span>
            <div className="mt-2 font-serif text-[15px] text-ink leading-tight">
              {record.sourceName}
            </div>
            <a
              href={deepSourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-amber-deep hover:text-deep-teal transition-colors break-all max-w-full"
            >
              <span className="truncate max-w-[28ch]">{prettyHost(record.sourceUrl)}</span>
              <ArrowUpRight size={11} strokeWidth={2} aria-hidden />
            </a>
            {sourceLinkKind === "search" && (
              <p className="mt-2 font-sans text-[11.5px] text-ink-soft leading-[1.4] italic max-w-[28ch]">
                Opens a publisher-restricted search so you land on the actual article, not the homepage.
              </p>
            )}
          </div>

          {record.organisation && (
            <div>
              <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted font-semibold">
                Implementer
              </span>
              <div className="mt-2 font-serif text-[15px] text-ink leading-tight">
                {record.organisation}
              </div>
            </div>
          )}

          <div>
            <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted font-semibold">
              Themes
            </span>
            <div className="mt-3 flex flex-wrap gap-2">
              {record.themes.map((slug) => (
                <ThemeChip
                  key={slug}
                  slug={slug}
                  name={prettyTheme(slug)}
                  colourHex={THEME_COLOURS[slug] ?? "#334B4A"}
                  asLink={false}
                />
              ))}
            </div>
          </div>
        </aside>
      </header>

      {/* Editorial note — what this kind of page is, why CAT routes it */}
      <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pb-16 lg:pb-20">
        <div
          className="relative overflow-hidden rounded-[10px] border border-line p-6 sm:p-8 max-w-[68ch]"
          style={{
            boxShadow:
              "0 1px 2px rgba(26,38,37,0.04), 0 14px 36px -20px rgba(46,117,115,0.18)",
            backgroundImage:
              "linear-gradient(180deg, rgba(251,248,242,1) 0%, rgba(232,240,234,0.55) 100%)",
          }}
        >
          <span
            aria-hidden
            className="absolute top-0 left-0 right-0 h-[2px]"
            style={{
              background:
                "linear-gradient(90deg, #2E7573 0%, rgba(46,117,115,0.6) 60%, transparent 100%)",
            }}
          />
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-teal font-semibold">
            Why this is on the Hub
          </span>
          <p className="font-serif text-[16px] text-ink-soft leading-[1.65] mt-3 max-w-[60ch]">
            The Transformation Hub lists credible food-systems programmes from
            across India, not only the Consortium&apos;s own portfolio. This entry
            was identified from a public source and routed to the Atlas by the
            editors. The short description above is written for quick reading;
            the full programme material lives at the publisher. Self-submitted
            programmes go through the same editorial check before they appear.
          </p>
          <div className="mt-5 flex flex-wrap gap-3 items-center font-mono text-[10px] uppercase tracking-[0.14em]">
            <Link
              href="/editorial-process"
              className="inline-flex items-center gap-1.5 text-teal border-b border-line-soft pb-0.5 hover:border-teal transition-colors"
            >
              How entries are written
              <ArrowUpRight size={11} strokeWidth={1.8} aria-hidden />
            </Link>
            <span className="text-line">·</span>
            <Link
              href="/contribute"
              className="inline-flex items-center gap-1.5 text-amber-deep border-b border-line-soft pb-0.5 hover:border-amber-deep transition-colors"
            >
              Submit a programme
              <ArrowUpRight size={11} strokeWidth={1.8} aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <footer className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-6 pb-12 border-t border-line">
        <div className="flex flex-wrap gap-x-8 gap-y-3 font-mono text-[10px] uppercase tracking-mono-mid text-muted">
          <span>
            Provenance: <span className="text-ink-soft">CAT-sourced</span>
          </span>
          <span>
            Endorsement: <span className="text-ink-soft">CAT Listed</span>
          </span>
          {record.publishedAt && (
            <span>
              Source published:{" "}
              <span className="text-ink-soft">
                {new Date(record.publishedAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </span>
          )}
        </div>
      </footer>
    </article>
  );
}

function prettyHost(url: string): string {
  try {
    const u = new URL(url);
    return u.host.replace(/^www\./, "") + (u.pathname && u.pathname !== "/" ? u.pathname : "");
  } catch {
    return url;
  }
}
