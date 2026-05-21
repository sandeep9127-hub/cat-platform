type Tier = "cat_authored" | "cat_endorsed" | "cat_listed";

const LABELS: Record<Tier, string> = {
  cat_authored: "CAT Authored",
  cat_endorsed: "CAT Endorsed",
  cat_listed: "CAT Listed",
};

const EXPLAINER: Record<Tier, string> = {
  cat_authored:
    "CAT researched and wrote this entry from public sources. CAT vouches for the prose.",
  cat_endorsed:
    "Self-submitted by the lead organisation, reviewed and endorsed by CAT.",
  cat_listed:
    "Listed because the programme exists. CAT does not vouch for the description.",
};

export function EndorsementBadge({ tier }: { tier: Tier }) {
  const cls =
    tier === "cat_authored"
      ? "bg-deep-teal text-amber border-deep-teal"
      : tier === "cat_endorsed"
        ? "border-teal text-teal bg-paper"
        : "border-line text-muted bg-paper";
  return (
    <span
      className={`group relative font-mono text-[9px] uppercase tracking-[0.16em] px-2.5 py-1 border rounded-[3px] whitespace-nowrap cursor-help inline-block ${cls}`}
      tabIndex={0}
      aria-describedby={`tier-${tier}`}
    >
      {LABELS[tier]}
      <span
        id={`tier-${tier}`}
        role="tooltip"
        className="pointer-events-none absolute right-0 bottom-full z-[60] mb-2.5 w-[260px] text-left normal-case font-sans font-normal text-[12.5px] leading-[1.5] tracking-normal text-paper rounded-[6px] px-3.5 py-3 opacity-0 translate-y-1 transition-all duration-200 ease-out group-hover:opacity-100 group-hover:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:translate-y-0"
        style={{
          background:
            "linear-gradient(135deg, #1A2625 0%, #2C4544 60%, #334B4A 100%)",
          boxShadow:
            "0 16px 36px -10px rgba(26,38,37,0.55), 0 4px 10px rgba(26,38,37,0.22), inset 0 1px 0 rgba(255,255,255,0.10)",
        }}
      >
        {EXPLAINER[tier]}
        {/* Pointer arrow below the tooltip */}
        <span
          aria-hidden
          className="absolute right-3 top-full w-3 h-3 -translate-y-1.5 rotate-45"
          style={{
            background: "#334B4A",
            boxShadow: "2px 2px 4px -2px rgba(26,38,37,0.30)",
          }}
        />
      </span>
    </span>
  );
}

type LegendItem = {
  label: string;
  copy: string;
  bar: string;
  soft: string;
  glow: string;
  iconBg: string;
  iconFg: string;
};

const LEGEND_ITEMS: LegendItem[] = [
  {
    label: "CAT Authored",
    copy: "Researched and written by CAT editors. Highest editorial weight.",
    bar: "#C68C2E",
    soft: "rgba(248,202,124,0.14)",
    glow: "rgba(248,202,124,0.26)",
    iconBg: "rgba(248,202,124,0.22)",
    iconFg: "#C68C2E",
  },
  {
    label: "CAT Endorsed",
    copy: "Self-submitted by the lead organisation, reviewed and endorsed.",
    bar: "#2E7573",
    soft: "rgba(46,117,115,0.10)",
    glow: "rgba(46,117,115,0.18)",
    iconBg: "rgba(46,117,115,0.12)",
    iconFg: "#2E7573",
  },
  {
    label: "CAT Listed",
    copy: "The programme is documented. CAT has not done deep editorial work.",
    bar: "#929CC5",
    soft: "rgba(146,156,197,0.10)",
    glow: "rgba(146,156,197,0.20)",
    iconBg: "rgba(146,156,197,0.14)",
    iconFg: "#5C6796",
  },
];

/** Inline editorial footnote explaining all three tiers, as floating tiles. */
export function EndorsementLegend({ className }: { className?: string }) {
  return (
    <aside
      className={`max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-8 ${className ?? ""}`}
      aria-label="Endorsement tier legend"
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
        Endorsement tiers
      </span>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {LEGEND_ITEMS.map((it) => (
          <div
            key={it.label}
            className="group relative overflow-hidden rounded-[6px] border border-line bg-paper p-4 transition-all duration-300 ease-out hover:-translate-y-0.5"
            style={{
              boxShadow: `0 1px 2px rgba(26,38,37,0.04), 0 6px 16px -10px ${it.glow}`,
              backgroundImage: `linear-gradient(180deg, rgba(251,248,242,1) 0%, ${it.soft} 100%)`,
            }}
          >
            <span
              aria-hidden
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{
                background: `linear-gradient(90deg, ${it.bar} 0%, ${it.bar}cc 60%, transparent 100%)`,
              }}
            />
            <div className="relative flex items-center gap-2 mb-2">
              <span
                aria-hidden
                className="w-5 h-5 rounded-[3px] inline-flex items-center justify-center font-mono text-[10px] font-bold"
                style={{ background: it.iconBg, color: it.iconFg }}
              >
                {it.label.split(" ")[1]?.[0] ?? "·"}
              </span>
              <span
                className="font-mono text-[10.5px] uppercase tracking-[0.16em] font-semibold"
                style={{ color: it.iconFg }}
              >
                {it.label}
              </span>
            </div>
            <p className="relative font-sans text-[12.5px] text-ink-soft leading-[1.5] max-w-[36ch]">
              {it.copy}
            </p>
          </div>
        ))}
      </div>
    </aside>
  );
}
