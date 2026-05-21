import Link from "next/link";
import { ArrowUpRight, FileText, Sheet, Database, BookOpen, Wrench, Filter as FilterIcon } from "lucide-react";
import {
  DISCOVERED_RECORDS,
  type DiscoveredRecord,
  type ResourceType,
} from "@/lib/data/discovered-records";
import { SectionOpener } from "@/components/ui/SectionOpener";
import { Reveal } from "@/components/ui/Reveal";

export const dynamic = "force-static";
export const revalidate = 1800;

export const metadata = {
  title: "Resources",
  description:
    "Reports, briefs, papers, datasets and toolkits on food systems work in India. We link out to the source.",
};

const TYPE_META: Record<
  ResourceType,
  { label: string; Icon: typeof FileText; tint: string }
> = {
  report: { label: "Report", Icon: FileText, tint: "#2E7573" },
  brief: { label: "Brief", Icon: BookOpen, tint: "#5C6796" },
  paper: { label: "Paper", Icon: FileText, tint: "#334B4A" },
  dataset: { label: "Dataset", Icon: Database, tint: "#C68C2E" },
  toolkit: { label: "Toolkit", Icon: Wrench, tint: "#8C7A5C" },
  case_study: { label: "Case study", Icon: Sheet, tint: "#2C7BD0" },
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

function yearOf(iso: string | undefined): string {
  if (!iso) return "—";
  return iso.slice(0, 4);
}

type Search = { type?: ResourceType; theme?: string };

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const typeFilter: ResourceType | null = sp.type ?? null;
  const themeFilter = sp.theme ?? null;

  const allResources: DiscoveredRecord[] = DISCOVERED_RECORDS.filter(
    (r) => r.destination === "resource"
  );

  let resources = allResources;
  if (typeFilter) resources = resources.filter((r) => r.resourceType === typeFilter);
  if (themeFilter) resources = resources.filter((r) => r.themes.includes(themeFilter));
  resources = resources.slice().sort((a, b) => {
    const da = Date.parse(a.publishedAt ?? "1970-01-01");
    const db = Date.parse(b.publishedAt ?? "1970-01-01");
    return db - da;
  });

  // Counts per type and theme
  const typeCounts: Record<string, number> = {};
  for (const r of allResources) {
    const t = r.resourceType ?? "report";
    typeCounts[t] = (typeCounts[t] ?? 0) + 1;
  }
  const typesAvailable = (Object.keys(TYPE_META) as ResourceType[]).filter(
    (t) => (typeCounts[t] ?? 0) > 0
  );

  const themeCounts: Record<string, number> = {};
  for (const r of allResources) {
    for (const t of r.themes) themeCounts[t] = (themeCounts[t] ?? 0) + 1;
  }
  const themeChips = Object.entries(themeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([slug, count]) => ({ slug, count, ...themeLabel(slug) }));

  return (
    <>
      <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-12 sm:pt-16 lg:pt-20 pb-10">
        <SectionOpener number="LIBRARY" label="Reports · Briefs · Datasets" />
        <h1 className="font-sans font-light text-[clamp(40px,4.8vw,72px)] tracking-[-0.025em] leading-[1.05] text-[color:var(--navy-teal)] mt-5 max-w-[20ch]">
          The <em className="italic text-teal not-italic" style={{ fontStyle: "italic" }}>reference</em> library.
        </h1>
        <p className="font-sans italic text-[17px] sm:text-[19px] text-ink-soft leading-[1.55] max-w-[58ch] mt-6 font-light">
          Citable reports, briefs, papers, datasets and toolkits relevant to food systems work in
          India. We host metadata and a short summary. The source document stays with its
          publisher.
        </p>
      </section>

      {/* Filters */}
      <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pb-6">
        <Reveal>
          <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-line">
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-teal font-semibold mr-2">
              <FilterIcon size={11} strokeWidth={1.8} aria-hidden />
              By type
            </span>
            <ChipLink active={!typeFilter && !themeFilter} href="/resources" label="All" />
            {typesAvailable.map((t) => (
              <ChipLink
                key={t}
                active={typeFilter === t}
                href={`/resources?type=${t}${themeFilter ? `&theme=${themeFilter}` : ""}`}
                label={TYPE_META[t].label}
                tint={TYPE_META[t].tint}
                count={typeCounts[t]}
              />
            ))}
            <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em] text-muted tabular-nums">
              {resources.length} of {allResources.length}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-4">
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-teal font-semibold mr-2">
              By theme
            </span>
            {themeChips.map((t) => (
              <ChipLink
                key={t.slug}
                active={themeFilter === t.slug}
                href={`/resources?theme=${t.slug}${typeFilter ? `&type=${typeFilter}` : ""}`}
                label={t.name}
                tint={t.colour}
                count={t.count}
              />
            ))}
          </div>
        </Reveal>
      </section>

      {/* Library */}
      <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pb-24">
        {resources.length === 0 ? (
          <p className="font-sans italic text-ink-soft text-[18px] max-w-[44ch] mt-10 leading-[1.6]">
            No resources match these filters. Try a different type or theme.
          </p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 list-none p-0 m-0 mt-4">
            {resources.map((item, i) => {
              const typeKey = (item.resourceType ?? "report") as ResourceType;
              const meta = TYPE_META[typeKey];
              const Icon = meta.Icon;
              return (
                <li
                  key={item.id}
                  className="reveal-stagger"
                  style={{ animationDelay: `${(i % 9) * 50}ms` }}
                >
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative overflow-hidden block rounded-[8px] border border-line bg-paper p-5 sm:p-6 h-full transition-all duration-300 ease-out hover:-translate-y-0.5"
                    style={{
                      boxShadow: `0 1px 2px rgba(26,38,37,0.04), 0 10px 24px -14px ${meta.tint}55`,
                      backgroundImage:
                        "linear-gradient(180deg, rgba(251,248,242,1) 0%, rgba(248,243,232,0.30) 100%)",
                    }}
                  >
                    <span
                      aria-hidden
                      className="absolute top-0 right-0 w-9 h-9 pointer-events-none"
                      style={{
                        background: `linear-gradient(225deg, ${meta.tint}33 50%, transparent 50%)`,
                        borderTopRightRadius: 8,
                      }}
                    />
                    <span
                      aria-hidden
                      className="absolute top-0 left-0 right-9 h-[2px]"
                      style={{
                        background: `linear-gradient(90deg, ${meta.tint} 0%, ${meta.tint}cc 60%, transparent 100%)`,
                      }}
                    />

                    <div className="relative flex items-start gap-3 mb-4">
                      <span
                        className="shrink-0 w-9 h-9 rounded-[6px] inline-flex items-center justify-center"
                        style={{ background: `${meta.tint}1f`, color: meta.tint }}
                        aria-hidden
                      >
                        <Icon size={16} strokeWidth={1.7} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <span
                          className="font-mono text-[9.5px] uppercase tracking-[0.16em] font-semibold"
                          style={{ color: meta.tint }}
                        >
                          {meta.label} · {yearOf(item.publishedAt)}
                        </span>
                        <h2 className="font-sans text-[16px] sm:text-[17px] font-medium leading-[1.3] tracking-[-0.012em] text-[color:var(--navy-teal)] mt-1.5 max-w-[28ch]">
                          {item.title}
                        </h2>
                      </div>
                    </div>

                    <p className="relative font-sans text-[13.5px] text-ink-soft leading-[1.55] max-w-[44ch]">
                      {item.summary}
                    </p>

                    <div className="relative mt-4 flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                      <span className="font-semibold text-ink-soft truncate">
                        {item.sourceName}
                      </span>
                      <span className="inline-flex items-center gap-1 text-teal">
                        Open ↗
                      </span>
                    </div>
                  </a>
                </li>
              );
            })}
          </ul>
        )}

        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted mt-10 max-w-[68ch]">
          <span className="text-amber-deep">●</span> We link out, never republish. Editorial process
          on the{" "}
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
