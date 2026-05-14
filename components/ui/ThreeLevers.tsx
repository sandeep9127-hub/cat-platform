/**
 * The three CAT levers: Policy, Markets, Finance. Used on /about,
 * /editorial-process, and landscape detail pages to surface the strategic frame.
 */
export function ThreeLevers() {
  const levers = [
    {
      name: "Policy",
      colour: "var(--deep-teal)",
      body:
        "Schemes that work for smallholders. Regulation that opens space for agroecology. Institutions that hold the system together over many years.",
    },
    {
      name: "Markets",
      colour: "var(--teal)",
      body:
        "Procurement at fair prices. Processing and aggregation that earn the producer a margin. Traceability protocols that survive contact with the broker chain.",
    },
    {
      name: "Finance",
      colour: "var(--amber-deep)",
      body:
        "Patient capital. Blended financing for landscape-scale work. Working-capital instruments built around farmer-collective realities, not just commercial banking norms.",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-line-soft border border-line-soft">
      {levers.map((l, i) => (
        <div
          key={l.name}
          className="bg-paper p-6 sm:p-7 relative reveal-stagger"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="flex items-center gap-3 mb-3">
            <span
              className="w-7 h-7 rounded-full flex items-center justify-center font-mono text-[11px] font-semibold text-paper"
              style={{ background: l.colour }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3
              className="font-serif text-[22px] font-medium tracking-[-0.01em]"
              style={{ color: l.colour }}
            >
              {l.name}
            </h3>
          </div>
          <p className="font-serif text-[15.5px] leading-[1.55] text-ink-soft">{l.body}</p>
        </div>
      ))}
    </div>
  );
}
