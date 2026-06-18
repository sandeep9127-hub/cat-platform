import { Scale, ShoppingCart, Wallet, type LucideIcon } from "lucide-react";

/**
 * The three CAT levers: Policy, Markets, Finance. Used on /about and landscape
 * detail pages to surface the strategic frame.
 * Floating tile treatment with brand-rotated accents.
 */
export function ThreeLevers() {
  const levers: Array<{
    name: string;
    Icon: LucideIcon;
    bar: string;
    soft: string;
    glow: string;
    chipBg: string;
    chipFg: string;
    body: string;
  }> = [
    {
      name: "Policy",
      Icon: Scale,
      bar: "#334B4A",
      soft: "rgba(51,75,74,0.07)",
      glow: "rgba(51,75,74,0.18)",
      chipBg: "rgba(51,75,74,0.10)",
      chipFg: "#334B4A",
      body:
        "Schemes that work for smallholders. Regulation that opens space for agroecology. Institutions that hold the system together over many years.",
    },
    {
      name: "Markets",
      Icon: ShoppingCart,
      bar: "#2E7573",
      soft: "rgba(46,117,115,0.08)",
      glow: "rgba(46,117,115,0.20)",
      chipBg: "rgba(46,117,115,0.12)",
      chipFg: "#2E7573",
      body:
        "Procurement at fair prices. Processing and aggregation that earn the producer a margin. Traceability protocols that survive contact with the broker chain. Consumer demand that creates a strong pull for agroecological produce.",
    },
    {
      name: "Finance",
      Icon: Wallet,
      bar: "#C68C2E",
      soft: "rgba(248,202,124,0.16)",
      glow: "rgba(248,202,124,0.30)",
      chipBg: "rgba(248,202,124,0.22)",
      chipFg: "#C68C2E",
      body:
        "Patient capital. Blended financing for landscape-scale work. Working-capital instruments built around farmer-collective realities.",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
      {levers.map((l, i) => {
        const Icon = l.Icon;
        return (
          <article
            key={l.name}
            className="group relative overflow-hidden rounded-[8px] border border-line bg-paper p-6 sm:p-7 reveal-stagger transition-all duration-300 ease-out hover:-translate-y-0.5"
            style={{
              animationDelay: `${i * 80}ms`,
              boxShadow: `0 1px 2px rgba(26,38,37,0.04), 0 12px 28px -16px ${l.glow}`,
              backgroundImage: `linear-gradient(180deg, rgba(251,248,242,1) 0%, ${l.soft} 100%)`,
            }}
          >
            <span
              aria-hidden
              className="absolute top-0 left-0 right-0 h-[3px]"
              style={{
                background: `linear-gradient(90deg, ${l.bar} 0%, ${l.bar}cc 60%, transparent 100%)`,
              }}
            />
            <div className="relative flex items-center gap-3.5 mb-4">
              <span
                aria-hidden
                className="w-11 h-11 rounded-[8px] inline-flex items-center justify-center"
                style={{
                  background: `linear-gradient(155deg, ${l.bar}, ${l.bar}d0)`,
                  boxShadow: `0 6px 16px -8px ${l.glow}, inset 0 1px 0 rgba(255,255,255,0.30)`,
                  color: "#FBF8F2",
                }}
              >
                <Icon size={20} strokeWidth={1.7} />
              </span>
              <div className="flex-1 min-w-0">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted tabular-nums">
                  {String(i + 1).padStart(2, "0")} · The lever
                </span>
                <h3
                  className="font-sans text-[24px] font-medium tracking-[-0.015em] leading-tight"
                  style={{ color: l.chipFg }}
                >
                  {l.name}
                </h3>
              </div>
            </div>
            <p className="relative font-sans text-[14.5px] leading-[1.6] text-ink-soft max-w-[36ch]">
              {l.body}
            </p>
          </article>
        );
      })}
    </div>
  );
}
