"use client";

import { useRef } from "react";
import {
  Layers,
  MapPin,
  Building2,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

type Stat = {
  label: string;
  value: string;
  sup?: string;
  delta?: string;
};

const ACCENTS = [
  {
    bar: "#2E7573",
    soft: "rgba(46,117,115,0.08)",
    glow: "rgba(46,117,115,0.18)",
    iconBg: "rgba(46,117,115,0.10)",
    iconFg: "#2E7573",
  },
  {
    bar: "#C68C2E",
    soft: "rgba(248,202,124,0.16)",
    glow: "rgba(248,202,124,0.30)",
    iconBg: "rgba(248,202,124,0.22)",
    iconFg: "#C68C2E",
  },
  {
    bar: "#929CC5",
    soft: "rgba(146,156,197,0.12)",
    glow: "rgba(146,156,197,0.22)",
    iconBg: "rgba(146,156,197,0.16)",
    iconFg: "#5C6796",
  },
  {
    bar: "#334B4A",
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
      {stats.map((s, i) => (
        <StatCard key={s.label} stat={s} accent={ACCENTS[i % ACCENTS.length]} Icon={ICONS[i % ICONS.length]} />
      ))}
    </div>
  );
}

function StatCard({
  stat,
  accent,
  Icon,
}: {
  stat: Stat;
  accent: (typeof ACCENTS)[number];
  Icon: LucideIcon;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "touch") return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
    el.style.setProperty("--spot-opacity", "1");
  }

  function onPointerLeave() {
    const el = ref.current;
    if (el) el.style.setProperty("--spot-opacity", "0");
  }

  return (
    <div
      ref={ref}
      className="group relative overflow-hidden rounded-[8px] border border-line bg-paper p-5 sm:p-6 transition-all duration-300 ease-out hover:-translate-y-0.5"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      style={{
        boxShadow: `0 1px 2px rgba(26,38,37,0.04), 0 8px 24px -12px ${accent.glow}`,
        backgroundImage: `linear-gradient(180deg, rgba(251,248,242,1) 0%, ${accent.soft} 100%)`,
        ["--spot-opacity" as string]: 0,
      }}
    >
      {/* Accent bar */}
      <span
        aria-hidden
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{
          background: `linear-gradient(90deg, ${accent.bar} 0%, ${accent.bar}cc 60%, transparent 100%)`,
        }}
      />
      {/* Cursor-following spotlight bloom */}
      <span
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(260px circle at var(--mx, 50%) var(--my, 50%), ${accent.glow}, transparent 60%)`,
          opacity: "var(--spot-opacity, 0)" as unknown as number,
          transition: "opacity 220ms ease-out",
        }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted leading-tight max-w-[18ch]">
          {stat.label}
        </span>
        <span
          className="shrink-0 w-8 h-8 rounded-[6px] inline-flex items-center justify-center"
          style={{ background: accent.iconBg, color: accent.iconFg }}
          aria-hidden
        >
          <Icon size={14} strokeWidth={1.7} />
        </span>
      </div>

      <div className="relative font-serif text-[40px] sm:text-[44px] font-medium leading-none tracking-[-0.022em] mt-4 text-deep-teal tabular-nums">
        <AnimatedNumber value={stat.value} />
        {stat.sup && (
          <sup className="text-[14px] text-amber-deep font-normal align-super ml-1 italic">
            {stat.sup}
          </sup>
        )}
      </div>

      {stat.delta && (
        <div className="relative mt-3 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em]">
          <span className="inline-block w-3 h-px" style={{ background: accent.bar }} />
          <span style={{ color: accent.iconFg }}>{stat.delta}</span>
        </div>
      )}
    </div>
  );
}
