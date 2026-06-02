import Link from "next/link";
import { ArrowUpRight, Filter as FilterIcon } from "lucide-react";
import {
  DISCOVERED_RECORDS,
  type DiscoveredRecord,
  getDeepSourceUrl,
} from "@/lib/data/discovered-records";
import { SectionOpener } from "@/components/ui/SectionOpener";
import { Reveal } from "@/components/ui/Reveal";

// Reads ?window and ?theme search params for filters; must render per
// request so the chip clicks actually filter (force-static would cache
// the unfiltered build output and ignore the URL params).
export const dynamic = "force-dynamic";

export const metadata = {
  title: "News",
  description:
    "Dated updates from food-systems work in India. Each item links to its source — we summarise, never republish.",
};

const THEME_LABELS: Record<string, { name: string; colour: string }> = {
  "soil-and-land": { name: "Soil & land", colour: "#8C7A5C" },
  water: { name: "Water", colour: "#2C7BD0" },
  "seeds-and-biodiversity": { name: "Seeds & biodiversity", colour: "#5C8C2E" },
  "farmer-livelihoods": { name: "Farmer livelihoods", colour: "#C68C2E" },
  nutrition: { name: "Nutrition", colour: "#C24A2E" },
  "climate-resilience": { name: "Climate resilience", colour: "#2E7573" },
  "markets-and-value-chains": { name: "Markets & value chains", colour: "#2EA37A" },
  "policy-and-finance": { name: "Policy & finance", colour: "#334B4A" },
  "knowledge-and-capacity": { name: "Knowledge & capacity", colour: "#5C6796" },
  "women-and-collectives": { name: "Women & collectives", colour: "#929CC5" },
};

function themeLabel(slug: string): { name: string; colour: string } {
  return THEME_LABELS[slug] ?? { name: slug.replace(/-/g, " "), colour: "#334B4A" };
}

type Search = { theme?: string; window?: string };

function withinWindow(iso: string | undefined, days: number): boolean {
  if (!iso) return false;
  const d = Date.parse(iso);
  if (Number.isNaN(d)) return false;
  return Date.now() - d <= days * 24 * 60 * 60 * 1000;
}

function fmtDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDateShort(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const themeFilter = sp.theme ?? null;
  const windowDays = sp.window ? Number(sp.window) : null;

  const allNews: DiscoveredRecord[] = DISCOVERED_RECORDS.filter(
    (r) => r.destination === "news"
  );

  let news = allNews;
  if (themeFilter) {
    news = news.filter((r) => r.themes.includes(themeFilter));
  }
  if (windowDays) {
    news = news.filter((r) => withinWindow(r.publishedAt, windowDays));
  }

  news = news.slice().sort((a, b) => {
    const da = Date.parse(a.publishedAt ?? "1970-01-01");
    const db = Date.parse(b.publishedAt ?? "1970-01-01");
    return db - da;
  });

  // Theme counts for filter chips
  const themeCounts: Record<string, number> = {};
  for (const r of allNews) {
    for (const t of r.themes) {
      themeCounts[t] = (themeCounts[t] ?? 0) + 1;
    }
  }
  const themeChips = Object.entries(themeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([slug, count]) => ({ slug, count, ...themeLabel(slug) }));

  return (
    <>
      <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-12 sm:pt-16 lg:pt-20 pb-10">
        <SectionOpener number="LIVE FEED" label="From the field" />
        <h1 className="font-sans font-light text-[clamp(40px,4.8vw,72px)] tracking-[-0.025em] leading-[1.05] text-[color:var(--navy-teal)] mt-5 max-w-[18ch]">
          What&apos;s happening in <em className="italic text-teal not-italic" style={{ fontStyle: "italic" }}>food systems</em>.
        </h1>
        <p className="font-sans italic text-[17px] sm:text-[19px] text-ink-soft leading-[1.55] max-w-[58ch] mt-6 font-light">
          Short summaries with source links. We do not host long passages and we do not chase the news cycle.
          Listed when it changes the read of work we already track.
        </p>
      </section>

      {/* Filters */}
      <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pb-6">
        <Reveal>
          <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-line">
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-teal font-semibold mr-2">
              <FilterIcon size={11} strokeWidth={1.8} aria-hidden />
              Filter
            </span>
            <ChipLink active={!themeFilter && !windowDays} href="/news" label="All" />
            <ChipLink
              active={windowDays === 30}
              href={`/news?window=30${themeFilter ? `&theme=${themeFilter}` : ""}`}
              label="Last 30 days"
            />
            <ChipLink
              active={windowDays === 90}
              href={`/news?window=90${themeFilter ? `&theme=${themeFilter}` : ""}`}
              label="Last 90 days"
            />
            <ChipLink
              active={windowDays === 180}
              href={`/news?window=180${themeFilter ? `&theme=${themeFilter}` : ""}`}
              label="Last 6 months"
            />
            <span className="hidden sm:inline-block w-px h-4 bg-line mx-1" />
            {themeChips.map((t) => (
              <ChipLink
                key={t.slug}
                active={themeFilter === t.slug}
                href={`/news?theme=${t.slug}${windowDays ? `&window=${windowDays}` : ""}`}
                label={`${t.name}`}
                tint={t.colour}
                count={t.count}
              />
            ))}
            <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em] text-muted tabular-nums">
              {news.length} of {allNews.length}
            </span>
          </div>
        </Reveal>
      </section>

      {/* Feed */}
      <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pb-24">
        {news.length === 0 ? (
          <div className="mt-10 max-w-[52ch] py-8 px-6 rounded-[8px] border border-line bg-paper">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-amber-deep font-semibold">
              Nothing matches
            </span>
            <p className="font-sans text-[16px] text-ink leading-[1.55] mt-3">
              No news matches{" "}
              {windowDays && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] mx-1 text-[14px]"
                  style={{ background: "rgba(46,117,115,0.10)", color: "#2E7573" }}
                >
                  last {windowDays} days
                </span>
              )}
              {windowDays && themeFilter && " and "}
              {themeFilter && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] mx-1 text-[14px]"
                  style={{ background: "rgba(146,156,197,0.14)", color: "#5C6796" }}
                >
                  theme: {themeLabel(themeFilter).name}
                </span>
              )}
              .
            </p>
            <Link
              href="/news"
              className="mt-4 inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-teal hover:text-deep-teal transition-colors"
            >
              ← Clear filters
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 list-none p-0 m-0 mt-4">
            {news.map((item, i) => {
              const primaryTheme = item.themes[0]
                ? themeLabel(item.themes[0])
                : { name: "General", colour: "#5C6796" };
              return (
                <li
                  key={item.id}
                  className="reveal-stagger"
                  style={{ animationDelay: `${(i % 9) * 50}ms` }}
                >
                  <a
                    href={getDeepSourceUrl(item)}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative block rounded-[8px] border border-line bg-paper p-5 sm:p-6 h-full transition-colors duration-200 hover:border-teal/40"
                  >
                    <div className="relative flex items-center justify-between gap-3 mb-4 font-mono text-[10px] uppercase tracking-[0.14em]">
                      <span className="text-amber-deep font-semibold">{item.sourceName}</span>
                      <span className="text-muted tabular-nums">{fmtDateShort(item.publishedAt)}</span>
                    </div>

                    <h2 className="relative font-serif text-[19px] sm:text-[20px] font-medium leading-[1.25] tracking-[-0.012em] text-ink group-hover:text-teal transition-colors max-w-[34ch]">
                      {item.title}
                    </h2>
                    <p className="relative font-sans text-[14px] text-ink-soft leading-[1.6] mt-3 max-w-[44ch]">
                      {item.summary}
                    </p>

                    <div className="relative mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      {item.themes.slice(0, 2).map((slug) => {
                        const t = themeLabel(slug);
                        return (
                          <span
                            key={slug}
                            className="inline-flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em]"
                            style={{ color: t.colour }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ background: t.colour }}
                            />
                            {t.name}
                          </span>
                        );
                      })}
                    </div>

                    <span className="absolute top-5 right-5 text-muted transition-all duration-300 group-hover:text-teal group-hover:translate-x-0.5">
                      <ArrowUpRight size={16} strokeWidth={1.6} />
                    </span>

                    <span className="relative inline-block mt-5 font-mono text-[10px] uppercase tracking-[0.14em] text-teal">
                      Open at source ↗
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        )}

        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted mt-10 max-w-[68ch]">
          <span className="text-amber-deep">●</span> Every item links to its publisher. We host
          metadata and a short summary; we never republish. Editorial process explained on the{" "}
          <Link href="/editorial-process" className="text-teal hover:underline">
            editorial process
          </Link>{" "}
          page.
        </p>
      </section>
    </>
  );
}

function ChipLink({
  active,
  href,
  label,
  tint,
  count,
}: {
  active: boolean;
  href: string;
  label: string;
  tint?: string;
  count?: number;
}) {
  const accent = tint ?? "#2E7573";
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${
        active
          ? "text-paper font-semibold"
          : "text-ink-soft border border-line bg-paper hover:border-line-soft"
      }`}
      style={
        active
          ? { background: `linear-gradient(135deg, ${accent} 0%, ${accent}d0 100%)` }
          : undefined
      }
    >
      {tint && !active && (
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: tint }} />
      )}
      <span>{label}</span>
      {count !== undefined && (
        <span className="font-mono text-[9px] opacity-70 tabular-nums">{count}</span>
      )}
    </Link>
  );
}
