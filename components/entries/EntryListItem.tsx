import Link from "next/link";
import { categoryIconFor } from "@/components/ui/CategoryIcon";

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
  catEndorsement?: "cat_authored" | "cat_endorsed" | "cat_listed" | "none";
  themes: { slug: string; name: string; colourHex: string }[];
  /**
   * Optional internal route to use instead of the default `/entry/{slug}`.
   * Used by atlas-routed discovery records that have their own description
   * page at `/atlas/{id}` rather than a full Hub entry.
   */
  internalHref?: string;
  /**
   * Legacy: when set and no `internalHref` is provided, the row links to
   * this external URL in a new tab. Kept for backwards compatibility with
   * any caller that hasn't migrated yet; atlas records now use internalHref.
   */
  externalUrl?: string;
  /** Optional short source label, e.g. "RySS" or "Sikkim Dept of Agriculture". */
  sourceName?: string;
};

export function EntryListItem({ data }: { data: EntryListItemData }) {
  const yearRange = data.endYear ? `${data.startYear} → ${data.endYear}` : `${data.startYear} → ongoing`;
  const wrapperClass =
    "block group border-b border-line transition-colors hover:bg-[#e1ede8]/45 focus-visible:bg-[#e1ede8]/45 focus-visible:outline-none";
  const body = (
    <article className="grid grid-cols-[40px_minmax(0,1fr)] sm:grid-cols-[80px_minmax(0,1fr)_auto] gap-x-5 sm:gap-x-7 py-7 sm:py-8 items-start">
        {/* Index — "No." sits on the eyebrow line, the numeral aligns to the title */}
        <div className="font-mono tracking-mono-mid text-muted flex flex-col gap-[5px] pt-[3px]">
          <span className="hidden sm:inline text-[9px]">No.</span>
          <span className="text-amber-deep font-semibold text-[11px] tabular-nums leading-none">
            {String(data.index).padStart(2, "0")}
            <span className="text-muted/70 font-normal"> / {data.total}</span>
          </span>
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap gap-x-2 gap-y-1 items-center font-mono text-[10px] sm:text-[10.5px] uppercase tracking-mono-wide text-teal font-semibold">
            <span>State</span>
            <span className="text-line">/</span>
            <span className="text-ink-soft normal-case font-normal tracking-mono-mid">
              {data.stateName}
            </span>
            <span className="text-line">·</span>
            <span className="font-normal tracking-mono-mid">{yearRange}</span>
          </div>
          <h3 className="font-sans text-[20px] sm:text-[23px] font-semibold leading-[1.14] tracking-[-0.025em] text-ink mt-2.5 group-hover:text-teal transition-colors">
            {data.title}
          </h3>
          <p className="text-[14.5px] text-ink-soft leading-[1.55] max-w-[60ch] tracking-[-0.01em] mt-2">
            {data.tagline}
          </p>
          <div className="flex gap-x-4 gap-y-1.5 mt-4 items-center flex-wrap font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted">
            {data.themes.slice(0, 2).map((t) => {
              const Icon = categoryIconFor(t.slug);
              return (
                <span key={t.slug} className="inline-flex items-center gap-1.5">
                  <Icon size={13} strokeWidth={1.8} style={{ color: t.colourHex }} aria-hidden />
                  {t.name}
                </span>
              );
            })}
            <span className="text-muted/80">{humaniseScale(data.scaleBand)}</span>
          </div>
        </div>
        {/* Category icon(s), in the category colour. Top icon aligns with the
            eyebrow; the hover arrow pins to the bottom of the row. */}
        <div className="hidden sm:flex flex-col gap-2.5 items-end self-stretch pt-[2px]">
          {data.themes.slice(0, 3).map((t) => {
            const Icon = categoryIconFor(t.slug);
            return <Icon key={t.slug} size={18} strokeWidth={1.7} style={{ color: t.colourHex }} aria-label={t.name} />;
          })}
          <span
            aria-hidden
            className="mt-auto font-mono text-teal text-[15px] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
          >
            &rarr;
          </span>
        </div>
      </article>
  );

  // Priority: explicit internalHref (atlas description page) > externalUrl
  // (legacy, opens in new tab) > default /entry/{slug}.
  if (data.internalHref) {
    return (
      <Link href={data.internalHref} className={wrapperClass}>
        {body}
      </Link>
    );
  }

  if (data.externalUrl) {
    return (
      <a
        href={data.externalUrl}
        target="_blank"
        rel="noreferrer"
        className={wrapperClass}
      >
        {body}
      </a>
    );
  }

  return (
    <Link href={`/entry/${data.slug}`} className={wrapperClass}>
      {body}
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
