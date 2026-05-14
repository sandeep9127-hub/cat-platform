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
      className={`group relative font-mono text-[9px] uppercase tracking-[0.16em] px-2.5 py-1 border rounded-[2px] whitespace-nowrap cursor-help ${cls}`}
      tabIndex={0}
      aria-describedby={`tier-${tier}`}
    >
      {LABELS[tier]}
      <span
        id={`tier-${tier}`}
        role="tooltip"
        className="pointer-events-none absolute right-0 top-full z-30 mt-2 w-[240px] text-left normal-case font-sans font-normal text-[12px] leading-[1.45] tracking-normal bg-deep-teal text-cream border border-deep-teal px-3 py-2.5 opacity-0 translate-y-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:translate-y-0"
      >
        {EXPLAINER[tier]}
      </span>
    </span>
  );
}

/** Inline editorial footnote explaining all three tiers. */
export function EndorsementLegend({ className }: { className?: string }) {
  return (
    <aside
      className={`max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-5 ${className ?? ""}`}
      aria-label="Endorsement tier legend"
    >
      <div className="border-l-2 border-amber-deep pl-4 py-1 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
        <span>
          <strong className="text-amber-deep font-semibold mr-1.5">CAT Authored</strong>
          <span className="normal-case tracking-normal font-sans text-[12px] text-ink-soft">
            researched + written by CAT
          </span>
        </span>
        <span>
          <strong className="text-teal font-semibold mr-1.5">CAT Endorsed</strong>
          <span className="normal-case tracking-normal font-sans text-[12px] text-ink-soft">
            self-submitted, reviewed by CAT
          </span>
        </span>
        <span>
          <strong className="text-muted font-semibold mr-1.5">CAT Listed</strong>
          <span className="normal-case tracking-normal font-sans text-[12px] text-ink-soft">
            present, but not vouched for
          </span>
        </span>
      </div>
    </aside>
  );
}
