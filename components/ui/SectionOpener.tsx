/**
 * Editorial section opener — small-caps numeral + label on a soft sage wash.
 * Matches the agroecologyindia.org "OUR SUPPORTERS / OUR COMMITMENT" pattern.
 * Sits above a section's headline, never replaces it.
 */
type Props = {
  /** A roman or arabic numeral, e.g. "01" or "I". */
  number?: string;
  /** The label, e.g. "Programme scale". Rendered uppercase. */
  label: string;
  /** Optional centred variant for section heroes. Default left-aligned. */
  align?: "left" | "centre";
};

export function SectionOpener({ number, label, align = "left" }: Props) {
  const justify = align === "centre" ? "justify-center" : "justify-start";
  return (
    <div className={`flex items-center gap-3 ${justify}`}>
      <span
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
        style={{
          background:
            "linear-gradient(135deg, rgba(232,240,234,0.85) 0%, rgba(232,240,234,0.55) 100%)",
          border: "1px solid rgba(159,184,166,0.35)",
        }}
      >
        {number && (
          <span className="font-mono text-[10px] tabular-nums tracking-[0.18em] text-[color:var(--sage)] font-semibold">
            {number}
          </span>
        )}
        {number && (
          <span
            aria-hidden
            className="w-3 h-px"
            style={{ background: "rgba(122,150,131,0.55)" }}
          />
        )}
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--navy-teal)] font-semibold">
          {label}
        </span>
      </span>
    </div>
  );
}
