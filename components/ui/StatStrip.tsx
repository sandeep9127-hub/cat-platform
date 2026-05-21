import {
  Layers,
  MapPin,
  Building2,
  BookOpen,
  type LucideIcon,
} from "lucide-react";

type Stat = {
  label: string;
  value: string;
  sup?: string;
  delta?: string;
};

/**
 * Brand accent assigned per tile position. Stat cards rotate through these
 * so the strip reads as one composition, not four monotone boxes.
 */
const ACCENTS = [
  {
    bar: "#2E7573", // teal
    soft: "rgba(46,117,115,0.08)",
    glow: "rgba(46,117,115,0.18)",
    iconBg: "rgba(46,117,115,0.10)",
    iconFg: "#2E7573",
  },
  {
    bar: "#C68C2E", // amber-deep
    soft: "rgba(248,202,124,0.16)",
    glow: "rgba(248,202,124,0.30)",
    iconBg: "rgba(248,202,124,0.22)",
    iconFg: "#C68C2E",
  },
  {
    bar: "#929CC5", // periwinkle
    soft: "rgba(146,156,197,0.12)",
    glow: "rgba(146,156,197,0.22)",
    iconBg: "rgba(146,156,197,0.16)",
    iconFg: "#5C6796",
  },
  {
    bar: "#334B4A", // deep teal
    soft: "rgba(51,75,74,0.06)",
    glow: "rgba(51,75,74,0.16)",
    iconBg: "rgba(51,75,74,0.10)",
    iconFg: "#334B4A",
  },
];

const ICONS: LucideIcon[] = [Layers, MapPin, Building2, BookOpen];

export function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <div className="max-w-page mx-auto mt-14 mb-2 px-5 sm:px-7 lg:px-10 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {stats.map((s, i) => {
        const a = ACCENTS[i % ACCENTS.length];
        const Icon = ICONS[i % ICONS.length];
        return (
          <div
            key={s.label}
            className="group relative overflow-hidden rounded-[8px] border border-line bg-paper p-5 sm:p-6 transition-all duration-300 ease-out hover:-translate-y-0.5"
            style={{
              boxShadow: `0 1px 2px rgba(26,38,37,0.04), 0 8px 24px -12px ${a.glow}`,
              backgroundImage: `linear-gradient(180deg, rgba(251,248,242,1) 0%, ${a.soft} 100%)`,
            }}
          >
            <span
              aria-hidden
              className="absolute top-0 left-0 right-0 h-[3px]"
              style={{
                background: `linear-gradient(90deg, ${a.bar} 0%, ${a.bar}cc 60%, transparent 100%)`,
              }}
            />
            <span
              aria-hidden
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{
                background: `radial-gradient(ellipse 80% 90% at 100% 100%, ${a.glow}, transparent 65%)`,
              }}
            />

            <div className="relative flex items-start justify-between gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted leading-tight max-w-[18ch]">
                {s.label}
              </span>
              <span
                className="shrink-0 w-8 h-8 rounded-[6px] inline-flex items-center justify-center"
                style={{ background: a.iconBg, color: a.iconFg }}
                aria-hidden
              >
                <Icon size={14} strokeWidth={1.7} />
              </span>
            </div>

            <div className="relative font-serif text-[40px] sm:text-[44px] font-medium leading-none tracking-[-0.022em] mt-4 text-deep-teal">
              {s.value}
              {s.sup && (
                <sup className="text-[14px] text-amber-deep font-normal align-super ml-1 italic">
                  {s.sup}
                </sup>
              )}
            </div>

            {s.delta && (
              <div className="relative mt-3 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em]">
                <span className="inline-block w-3 h-px" style={{ background: a.bar }} />
                <span style={{ color: a.iconFg }}>{s.delta}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
