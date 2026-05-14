type Props = { tier: "cat_authored" | "cat_endorsed" | "cat_listed" };

const LABELS: Record<Props["tier"], string> = {
  cat_authored: "CAT Authored",
  cat_endorsed: "CAT Endorsed",
  cat_listed: "CAT Listed",
};

export function EndorsementBadge({ tier }: Props) {
  const cls =
    tier === "cat_authored"
      ? "bg-deep-teal text-amber border-deep-teal"
      : tier === "cat_endorsed"
        ? "border-teal text-teal"
        : "border-line text-muted";
  return (
    <span
      className={`font-mono text-[9px] uppercase tracking-[0.16em] px-2.5 py-1 border rounded-[2px] whitespace-nowrap ${cls}`}
    >
      {LABELS[tier]}
    </span>
  );
}
