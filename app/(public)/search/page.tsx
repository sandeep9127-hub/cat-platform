import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { searchEntries, type SearchHit } from "@/lib/db/search";
import { EndorsementBadge } from "@/components/ui/EndorsementBadge";
import { Reveal } from "@/components/ui/Reveal";

export const dynamic = "force-dynamic";

export const revalidate = 30;
export const metadata = {
  title: "Search",
  description: "Search the library across programmes, themes, states, and years.",
};

const SCALE_OPTIONS = [
  { slug: "pilot", label: "Pilot" },
  { slug: "block", label: "Block" },
  { slug: "district", label: "District" },
  { slug: "multi_district", label: "Multi-district" },
  { slug: "state", label: "State" },
  { slug: "multi_state", label: "Multi-state" },
  { slug: "national", label: "National" },
];

type SearchParams = Promise<{
  q?: string;
  theme?: string | string[];
  state?: string | string[];
  scale?: string | string[];
  endorsement?: string;
  from?: string;
  to?: string;
}>;

function toArray(v?: string | string[]) {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

/**
 * Render a ts_headline string (with <mark> tags from Postgres) as plain text +
 * <mark> React nodes, with no dangerouslySetInnerHTML. The only HTML we trust
 * from ts_headline is the wrapping <mark>/</mark> tags it inserts itself.
 */
function renderHighlight(headline: string): React.ReactNode[] {
  if (!headline) return [];
  const parts: React.ReactNode[] = [];
  const segments = headline.split(/(<mark>.*?<\/mark>)/g);
  segments.forEach((seg, i) => {
    const match = seg.match(/^<mark>(.*?)<\/mark>$/);
    if (match) {
      parts.push(
        <mark key={i} className="bg-amber/40 text-ink rounded-[1px] px-0.5">
          {match[1]}
        </mark>
      );
    } else if (seg) {
      parts.push(seg);
    }
  });
  return parts;
}

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const themes = toArray(sp.theme);
  const states = toArray(sp.state);
  const scales = toArray(sp.scale);
  const endorsement =
    sp.endorsement === "cat_authored" || sp.endorsement === "cat_endorsed" || sp.endorsement === "cat_listed"
      ? sp.endorsement
      : undefined;
  const yearFrom = sp.from ? Number(sp.from) : undefined;
  const yearTo = sp.to ? Number(sp.to) : undefined;

  const [hits, allThemes] = await Promise.all([
    searchEntries({ q, themes, states, scales, endorsement, yearFrom, yearTo }),
    db.select().from(schema.themes).orderBy(asc(schema.themes.displayOrder)),
  ]);

  const totalLabel = q ? `${hits.length} matching "${q}"` : `${hits.length} programmes`;
  const hasAnyFilter = !!(q || themes.length || states.length || scales.length || endorsement);

  return (
    <>
      <Reveal as="section" className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-12 sm:pt-16 lg:pt-20 pb-8 reveal-stagger" delay={0}>
        <span className="eyebrow">Search the library</span>
        <h1 className="font-sans font-semibold tracking-[-0.035em] text-hero-xl text-ink mt-4">
          Ask the <span className="text-teal">library</span>.
        </h1>
        <p className="text-[17px] sm:text-[19px] text-ink-soft leading-[1.55] tracking-[-0.01em] max-w-[44ch] mt-5">
          Full-text search across every published entry. Filters narrow by theme, scale, and
          endorsement. The agent preview is on its own page.
        </p>

        <form
          method="GET"
          className="mt-10 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 items-stretch"
        >
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Try: millet procurement, soil organic carbon, FPO federation, what didn't work…"
            className="w-full px-5 py-4 bg-paper border border-line rounded-full font-sans text-[17px] text-ink placeholder:text-muted placeholder:font-sans placeholder:text-[14px] focus:outline-2 focus:outline-teal focus:bg-paper transition-colors shadow-[0_1px_2px_rgba(26,38,37,0.04),inset_0_1px_0_rgba(255,255,255,0.5)]"
            aria-label="Search entries"
            autoFocus
          />
          <button
            type="submit"
            className="group inline-flex items-center justify-center gap-2 px-6 py-4 font-mono text-[11px] uppercase tracking-[0.16em] font-semibold rounded-full text-paper transition-[transform,box-shadow,border-color,background-color,opacity] duration-200 ease-out hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(135deg, #2E7573 0%, #334B4A 100%)",
              boxShadow:
                "0 10px 24px -10px rgba(46,117,115,0.55), inset 0 1px 0 rgba(255,255,255,0.20)",
            }}
          >
            <span>Search</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              aria-hidden
            >
              <path d="M7 17L17 7M17 7H7M17 7v10" />
            </svg>
          </button>

          <div className="lg:col-span-2 mt-2 flex flex-wrap gap-x-6 gap-y-3 items-start">
            <FilterGroup label="Theme">
              {allThemes.map((t) => (
                <FilterChip
                  key={t.slug}
                  name="theme"
                  value={t.slug}
                  active={themes.includes(t.slug)}
                  colour={t.colourHex}
                >
                  {t.name}
                </FilterChip>
              ))}
            </FilterGroup>

            <FilterGroup label="Scale">
              {SCALE_OPTIONS.map((s) => (
                <FilterChip
                  key={s.slug}
                  name="scale"
                  value={s.slug}
                  active={scales.includes(s.slug)}
                >
                  {s.label}
                </FilterChip>
              ))}
            </FilterGroup>

            <FilterGroup label="Endorsement">
              {(["cat_authored", "cat_endorsed", "cat_listed"] as const).map((tier) => (
                <FilterChip
                  key={tier}
                  name="endorsement"
                  value={tier}
                  active={endorsement === tier}
                  radio
                >
                  {tier === "cat_authored" ? "Authored" : tier === "cat_endorsed" ? "Endorsed" : "Listed"}
                </FilterChip>
              ))}
            </FilterGroup>
          </div>
        </form>
      </Reveal>

      <Reveal as="section" className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pb-24 border-t border-line pt-6" delay={80}>
        <div className="flex items-baseline justify-between gap-4 mb-4 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
          <span>{totalLabel}</span>
          {hasAnyFilter && (
            <Link href="/search" className="text-deep-teal hover:text-teal font-semibold">
              Clear all ×
            </Link>
          )}
        </div>

        {hits.length === 0 ? (
          <p className="text-ink-soft leading-[1.55] tracking-[-0.01em] text-[18px] max-w-[44ch] mt-8">
            {q
              ? `No entries match "${q}" with the current filters. Try broader terms, or clear the filters.`
              : "No entries match the current filters."}
          </p>
        ) : (
          <ul className="flex flex-col list-none p-0">
            {hits.map((h, i) => (
              <SearchResult key={h.id} hit={h} index={i} />
            ))}
          </ul>
        )}
      </Reveal>
    </>
  );
}

function SearchResult({ hit, index }: { hit: SearchHit; index: number }) {
  return (
    <li
      className="reveal-stagger border-b border-line-soft"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <Link
        href={`/entry/${hit.slug}`}
        className="group block py-6 hover:bg-teal-wash/40 transition-colors"
      >
        <div className="grid grid-cols-[44px_minmax(0,1fr)] sm:grid-cols-[74px_minmax(0,1fr)_auto] gap-x-4 sm:gap-x-6 gap-y-3 items-start">
          <div className="font-mono text-[10.5px] text-muted tracking-mono-mid pt-1 flex flex-col gap-1.5">
            <span className="hidden sm:inline">No.</span>
            <span className="text-amber-deep font-semibold">
              {String(index + 1).padStart(2, "0")}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap gap-x-2 gap-y-1 items-center mb-2 font-mono text-[10px] sm:text-[10.5px] uppercase tracking-mono-wide text-teal font-semibold">
              <span>{hit.themeName}</span>
              <span className="text-line">/</span>
              <span className="text-ink-soft normal-case font-normal tracking-mono-mid">
                {hit.stateName}
              </span>
              <span className="text-line">·</span>
              <span className="font-normal tracking-mono-mid">
                {hit.endYear ? `${hit.startYear} → ${hit.endYear}` : `${hit.startYear} → ongoing`}
              </span>
            </div>
            <h3 className="font-sans font-semibold text-[20px] sm:text-[22px] leading-[1.18] tracking-[-0.02em] text-ink mb-2 group-hover:text-teal transition-colors">
              {hit.title}
            </h3>
            {hit.highlight ? (
              <p className="text-[15px] text-ink-soft leading-[1.5] max-w-[68ch]">
                {renderHighlight(hit.highlight)}…
              </p>
            ) : (
              <p className="text-[15px] text-ink-soft leading-[1.55] tracking-[-0.01em] max-w-[64ch]">
                {hit.tagline}
              </p>
            )}
          </div>
          <div className="hidden sm:block">
            <EndorsementBadge tier={hit.catEndorsement} />
          </div>
        </div>
      </Link>
    </li>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2 min-w-0">
      <legend className="mono-label">{label}</legend>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </fieldset>
  );
}

function FilterChip({
  name,
  value,
  active,
  children,
  colour,
  radio,
}: {
  name: string;
  value: string;
  active: boolean;
  children: React.ReactNode;
  colour?: string;
  radio?: boolean;
}) {
  return (
    <label
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border cursor-pointer font-mono text-[10px] uppercase tracking-[0.12em] transition-colors ${
        active
          ? "bg-deep-teal text-paper border-deep-teal"
          : "bg-cream text-ink-soft border-line hover:border-teal"
      }`}
    >
      <input
        type={radio ? "radio" : "checkbox"}
        name={name}
        value={value}
        defaultChecked={active}
        className="sr-only"
      />
      {colour && !active && (
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: colour }} aria-hidden />
      )}
      {children}
    </label>
  );
}
