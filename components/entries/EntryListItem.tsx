import Link from "next/link";
import { EndorsementBadge } from "@/components/ui/EndorsementBadge";
import { ThemeChip } from "@/components/ui/ThemeChip";

export type EntryListItemData = {
  id: string;
  slug: string;
  index: number;
  total: number;
  title: string;
  tagline: string;
  stateName: string;
  startYear: number;
  endYear: number | null;
  scaleBand: string;
  catEndorsement: "cat_authored" | "cat_endorsed" | "cat_listed";
  themes: { slug: string; name: string; colourHex: string }[];
};

export function EntryListItem({ data }: { data: EntryListItemData }) {
  const yearRange = data.endYear ? `${data.startYear} → ${data.endYear}` : `${data.startYear} → ongoing`;
  return (
    <Link
      href={`/entry/${data.slug}`}
      className="block group border-b border-line-soft transition-colors hover:bg-teal-wash/40 focus-visible:bg-teal-wash/40 focus-visible:outline-none"
    >
      <article className="grid grid-cols-[44px_minmax(0,1fr)] sm:grid-cols-[74px_minmax(0,1fr)_auto] gap-x-4 sm:gap-x-6 gap-y-3 py-6 items-start">
        <div className="font-mono text-[10.5px] sm:text-[11px] text-muted tracking-mono-mid pt-1 flex flex-col gap-1.5">
          <span className="hidden sm:inline">No.</span>
          <span className="text-amber-deep font-semibold">
            {String(data.index).padStart(2, "0")}<span className="text-muted font-normal"> / {data.total}</span>
          </span>
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap gap-x-2 gap-y-1 items-center mb-2 font-mono text-[10px] sm:text-[10.5px] uppercase tracking-mono-wide text-teal font-semibold">
            <span>State</span>
            <span className="text-line">/</span>
            <span className="text-ink-soft normal-case font-normal tracking-mono-mid">
              {data.stateName}
            </span>
            <span className="text-line">·</span>
            <span className="font-normal tracking-mono-mid">{yearRange}</span>
          </div>
          <h3 className="font-serif text-[20px] sm:text-[22px] font-medium leading-[1.18] tracking-[-0.01em] text-ink mb-2 group-hover:text-teal transition-colors">
            {data.title}
          </h3>
          <p className="font-serif italic text-[15px] text-ink-soft leading-[1.45] max-w-[54ch] font-light">
            {data.tagline}
          </p>
          <div className="flex gap-2 sm:gap-3.5 mt-3.5 items-center flex-wrap">
            {data.themes.slice(0, 2).map((t) => (
              <ThemeChip key={t.slug} slug={t.slug} name={t.name} colourHex={t.colourHex} asLink={false} />
            ))}
            <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted">
              · {humaniseScale(data.scaleBand)}
            </span>
          </div>
          <div className="sm:hidden mt-3">
            <EndorsementBadge tier={data.catEndorsement} />
          </div>
        </div>
        <div className="hidden sm:block">
          <EndorsementBadge tier={data.catEndorsement} />
        </div>
      </article>
    </Link>
  );
}

function humaniseScale(s: string): string {
  switch (s) {
    case "pilot": return "Pilot";
    case "block": return "Block";
    case "district": return "District";
    case "multi_district": return "Multi-district";
    case "state": return "State";
    case "multi_state": return "Multi-state";
    case "national": return "National";
    default: return s.replace(/_/g, " ");
  }
}
