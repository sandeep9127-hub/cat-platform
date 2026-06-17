"use client";

import { useEffect, useRef, useState } from "react";
import { useCurrency, formatMoney } from "./currency";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

export type ClimateProps = {
  landscapeName: string;
  total: number;
  mitigation: number;
  adaptation: number;
  resilience: number;
  carbonTco2e: number;
  /** All-tracks 7-yr GHG (incl. co-benefit carbon) — the full footprint shown to a carbon buyer. */
  ghgTotalTco2e: number;
  /** Value the same interventions also generate in non-primary tracks; disclosed, not in the headline. */
  cobenefitInr: number;
  planCostInr: number;
  modelVersion: string | null;
};

// Western thousands grouping — the carbon tonnage is read by a global /
// carbon-market audience, so 42,973 (not Indian grouping).
function groupUS(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
function pct(part: number, whole: number): number {
  return whole ? Math.round((part / whole) * 100) : 0;
}

/** Fires once when the element first scrolls into view — used to grow the ratio bars. */
function useInView<T extends HTMLElement>(threshold = 0.3) {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && (setSeen(true), io.disconnect())),
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, seen] as const;
}

// The three climate tracks, in the official CAT palette.
const TRACKS = [
  { key: "resilience", label: "Resilience", colour: "#2E7573", note: "Income protected when a climate shock hits" },
  { key: "adaptation", label: "Adaptation", colour: "#5E6990", note: "Lower costs, better yields, healthier farms" },
  { key: "mitigation", label: "Carbon", colour: "#946616", note: "Greenhouse gas removed, reduced and avoided" },
] as const;

/**
 * "Climate value" — the climate counterpart to "Where the money goes". A
 * ratio-forward, interactive read of the modelled 7-year value: hover or tap a
 * track to focus it; the headline and bar respond. Reframes climate beyond
 * carbon — the story funders and a global audience need.
 */
export function LandscapeClimate(props: ClimateProps) {
  const { currency } = useCurrency();
  const segs = [
    { ...TRACKS[0], value: props.resilience },
    { ...TRACKS[1], value: props.adaptation },
    { ...TRACKS[2], value: props.mitigation },
  ].filter((s) => s.value > 0);
  const total = props.total || 1;
  const ratio = props.planCostInr ? props.total / props.planCostInr : 0;
  const ratioLabel = ratio >= 10 ? `${Math.round(ratio)}×` : `${ratio.toFixed(1).replace(/\.0$/, "")}×`;

  // Interactive focus: hover previews a track, click locks it (tap again to release).
  const [hover, setHover] = useState<string | null>(null);
  const [locked, setLocked] = useState<string | null>(null);
  const focus = hover ?? locked;
  const focusSeg = segs.find((s) => s.key === focus) ?? null;
  const displayValue = focusSeg ? focusSeg.value : props.total;
  const focusFns = (key: string) => ({
    role: "button" as const,
    tabIndex: 0,
    onMouseEnter: () => setHover(key),
    onMouseLeave: () => setHover(null),
    onFocus: () => setHover(key),
    onBlur: () => setHover(null),
    onClick: () => setLocked((l) => (l === key ? null : key)),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setLocked((l) => (l === key ? null : key));
      }
    },
  });

  const planPct = total ? Math.max(4, Math.round((props.planCostInr / props.total) * 100)) : 0;
  const [barRef, barsSeen] = useInView<HTMLDivElement>();

  return (
    <section className="mt-16 lg:mt-20 max-w-page mx-auto px-5 sm:px-7 lg:px-10">
      <div
        className="rounded-[14px] border border-line bg-paper overflow-hidden"
        style={{ boxShadow: "0 1px 2px rgba(26,38,37,0.04), 0 18px 40px -28px rgba(26,38,37,0.25)" }}
      >
        <span aria-hidden className="block h-[3px]" style={{ background: "linear-gradient(90deg,#2E7573,#5E6990,#946616)" }} />
        <div className="p-6 sm:p-8 lg:p-9">
          {/* Header + headline */}
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            <div>
              <span className="eyebrow">The climate case</span>
              <h2 className="font-sans font-semibold text-[clamp(24px,3vw,38px)] tracking-[-0.03em] leading-[1.05] text-ink mt-2 max-w-[20ch]">
                What the plan is worth to the climate
              </h2>
              <p className="font-sans text-[14.5px] text-ink-soft leading-[1.55] mt-3 max-w-[54ch]">
                Modelled over seven years — protected income, healthier farms and stored carbon. A sense of
                scale, not cash in hand.
              </p>
            </div>
            <div className="lg:text-right shrink-0">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                {focusSeg ? `${focusSeg.label} value · 7 years` : "Climate value · 7 years"}
              </div>
              <div
                className="font-serif text-[clamp(36px,5vw,60px)] leading-none tracking-[-0.02em] tabular-nums mt-1 transition-colors"
                style={{ color: focusSeg ? focusSeg.colour : "var(--teal, #2E7573)" }}
              >
                {formatMoney(displayValue, currency)}
              </div>
              <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted mt-2">
                {focusSeg ? `${pct(focusSeg.value, total)}% of the headline` : "across all three tracks"}
              </div>
            </div>
          </div>

          {/* Investment-to-return hero — the headline comparison, animated on scroll */}
          {ratio > 0 && (
            <div ref={barRef} className="mt-7 rounded-[12px] border border-line bg-line-soft p-5 sm:p-6">
              <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
                <div className="font-serif text-[clamp(40px,7vw,68px)] leading-none text-teal tracking-[-0.03em]">
                  <AnimatedNumber value={ratioLabel} duration={1100} />
                </div>
                <div className="min-w-[16ch] flex-1">
                  <p className="font-sans text-[15px] sm:text-[16px] text-ink leading-[1.4]">
                    Every <strong className="text-deep-teal">{formatMoney(props.planCostInr, currency)}</strong> invested
                    models about <strong className="text-deep-teal">{formatMoney(props.total, currency)}</strong> of
                    climate value.
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-amber-deep mt-2">
                    ≈ ₹{Math.round(ratio)} of modelled value for every ₹1, over 7 years
                  </p>
                </div>
              </div>
              {/* Two proportional bars: the plan, and what it returns */}
              <div className="mt-5 space-y-3">
                {[
                  { lab: "What it costs · the plan", w: planPct, val: props.planCostInr, c: "#5E6990" },
                  { lab: "What it's worth · climate value", w: 100, val: props.total, c: "#2E7573" },
                ].map((r) => (
                  <div key={r.lab}>
                    <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-muted mb-1.5">
                      <span>{r.lab}</span>
                      <span className="tabular-nums text-ink-soft">{formatMoney(r.val, currency)}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-paper border border-line overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: barsSeen ? `${r.w}%` : "0%",
                          background: r.c,
                          transition: "width 1.1s cubic-bezier(0.22,1,0.36,1)",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interactive stacked bar */}
          <div className="mt-8">
            <div className="flex h-3.5 rounded-full overflow-hidden border border-line/60">
              {segs.map((s) => (
                <div
                  key={s.key}
                  {...focusFns(s.key)}
                  aria-label={`${s.label} · ${pct(s.value, total)}% — ${formatMoney(s.value, currency)}`}
                  className="cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
                  style={{
                    width: `${(s.value / total) * 100}%`,
                    background: s.colour,
                    opacity: focus && focus !== s.key ? 0.3 : 1,
                    transition: "opacity 0.25s ease",
                  }}
                  title={`${s.label} · ${pct(s.value, total)}%`}
                />
              ))}
            </div>
            <p className="font-mono text-[9.5px] uppercase tracking-[0.13em] text-muted mt-2">
              Hover or tap a track to focus it
            </p>
          </div>

          {/* Three track cards — interactive, linked to the bar + headline */}
          <ul className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-px bg-line rounded-[10px] overflow-hidden border border-line list-none p-0">
            {segs.map((s) => {
              const active = focus === s.key;
              const dimmed = focus && !active;
              return (
                <li
                  key={s.key}
                  {...focusFns(s.key)}
                  className="bg-paper p-5 cursor-pointer outline-none transition-all focus-visible:ring-2 focus-visible:ring-inset"
                  style={{
                    opacity: dimmed ? 0.55 : 1,
                    boxShadow: active ? `inset 0 0 0 2px ${s.colour}` : "none",
                  }}
                >
                  <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: s.colour }}>
                    <span className="inline-block w-2 h-2 rounded-full" style={{ background: s.colour }} />
                    {s.label}
                    <span className="ml-auto tabular-nums text-muted">{pct(s.value, total)}%</span>
                  </div>
                  <div className="font-serif text-[22px] sm:text-[24px] text-deep-teal tabular-nums tracking-[-0.015em] mt-2.5">
                    {formatMoney(s.value, currency)}
                  </div>
                  <div className="font-sans text-[12.5px] text-ink-soft leading-[1.45] mt-1.5">{s.note}</div>
                </li>
              );
            })}
          </ul>

          {/* Co-benefit disclosure — value the same interventions throw off in their
              NON-primary tracks. Kept out of the headline to avoid double-counting. */}
          {props.cobenefitInr > 0 && (
            <div className="mt-6 rounded-[10px] border border-line bg-line-soft px-5 py-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                Also generated · not in the headline
              </div>
              <p className="font-sans text-[13px] text-ink-soft leading-[1.55] mt-1.5 max-w-[82ch]">
                The same interventions generate a further{" "}
                <span className="font-serif text-deep-teal text-[16px] tabular-nums">
                  ≈ {formatMoney(props.cobenefitInr, currency)}
                </span>{" "}
                in tracks other than their main one — a goat also protects income and stores carbon, for
                example. We show it, but keep it out of the headline so nothing is counted twice.
              </p>
            </div>
          )}

          {/* Carbon footprint callout */}
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-5 border-t border-line">
            {props.ghgTotalTco2e > 0 && (
              <div className="flex items-baseline gap-4 flex-wrap">
                <div>
                  <span className="font-serif text-[20px] text-ink tabular-nums">{groupUS(props.ghgTotalTco2e)}</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted ml-1.5">tCO₂e · 7 yr · all tracks</span>
                </div>
                <span className="font-sans text-[12.5px] text-muted italic">the full greenhouse-gas footprint</span>
              </div>
            )}
            <p className="font-mono text-[9.5px] uppercase tracking-[0.13em] text-muted sm:text-right">
              Modelled climate valuation
              <br className="hidden sm:block" /> Evidence-tiered: local → national → IPCC
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
