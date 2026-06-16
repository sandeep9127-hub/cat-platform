"use client";

import { useCurrency, formatMoney } from "./currency";

export type ClimateProps = {
  landscapeName: string;
  total: number;
  mitigation: number;
  adaptation: number;
  resilience: number;
  carbonTco2e: number;
  carbonUsd: number;
  planCostInr: number;
  modelVersion: string | null;
};

// Western thousands grouping — the carbon tonnage and USD value are read by a
// global / carbon-market audience, so 685,805 (not 6,85,805).
function groupUS(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
function pct(part: number, whole: number): number {
  return whole ? Math.round((part / whole) * 100) : 0;
}

// The three climate tracks, in the official CAT palette (distinct from the
// "who pays" instruments above, but the same visual register).
const TRACKS = [
  { key: "resilience", label: "Resilience", colour: "#2E7573", note: "Household income protected against climate shocks" },
  { key: "adaptation", label: "Adaptation", colour: "#5E6990", note: "Input savings, yield uplift and margin expansion" },
  { key: "mitigation", label: "Carbon", colour: "#946616", note: "Verified greenhouse-gas removal, reduction and avoidance" },
] as const;

/**
 * "Climate value" — the climate counterpart to "Where the money goes". Shows the
 * C-GEM modelled 7-year climate value of the plan, split across resilience,
 * adaptation and carbon, with a carbon-investor callout. Reframes climate beyond
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

  return (
    <section className="mt-16 lg:mt-20 max-w-page mx-auto px-5 sm:px-7 lg:px-10">
      <div className="rounded-[14px] border border-line bg-paper overflow-hidden"
        style={{ boxShadow: "0 1px 2px rgba(26,38,37,0.04), 0 18px 40px -28px rgba(26,38,37,0.25)" }}>
        <span aria-hidden className="block h-[3px]" style={{ background: "linear-gradient(90deg,#2E7573,#5E6990,#946616)" }} />
        <div className="p-6 sm:p-8 lg:p-9">
          {/* Header + headline */}
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            <div>
              <span className="eyebrow">The climate case</span>
              <h2 className="font-sans font-semibold text-[clamp(24px,3vw,38px)] tracking-[-0.03em] leading-[1.05] text-ink mt-2 max-w-[20ch]">
                What the plan is worth to the climate
              </h2>
              <p className="font-sans text-[14.5px] text-ink-soft leading-[1.55] mt-3 max-w-[58ch]">
                Modelled climate value over the seven-year plan — avoided losses, protected income and
                verified carbon, not a cash return.
              </p>
            </div>
            <div className="lg:text-right shrink-0">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Climate value · 7 years</div>
              <div className="font-serif text-[clamp(36px,5vw,60px)] leading-none text-teal tracking-[-0.02em] tabular-nums mt-1">
                {formatMoney(props.total, currency)}
              </div>
              {ratio > 0 && (
                <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-amber-deep mt-2">
                  ≈ {ratioLabel} the {formatMoney(props.planCostInr, currency)} plan
                </div>
              )}
            </div>
          </div>

          {/* Stacked bar */}
          <div className="mt-8">
            <div className="flex h-3 rounded-full overflow-hidden">
              {segs.map((s) => (
                <div key={s.key} style={{ width: `${(s.value / total) * 100}%`, background: s.colour }} title={`${s.label} · ${pct(s.value, total)}%`} />
              ))}
            </div>
          </div>

          {/* Three track cards */}
          <ul className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-px bg-line rounded-[10px] overflow-hidden border border-line list-none p-0">
            {segs.map((s) => (
              <li key={s.key} className="bg-paper p-5">
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
            ))}
          </ul>

          {/* Carbon callout + evidence */}
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-5 border-t border-line">
            {props.carbonTco2e > 0 && (
              <div className="flex items-baseline gap-4 flex-wrap">
                <div>
                  <span className="font-serif text-[20px] text-ink tabular-nums">{groupUS(props.carbonTco2e)}</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted ml-1.5">tCO₂e · 7 yr</span>
                </div>
                {props.carbonUsd > 0 && (
                  <div>
                    <span className="font-serif text-[20px] text-ink tabular-nums">${groupUS(props.carbonUsd)}</span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted ml-1.5">carbon value</span>
                  </div>
                )}
                <span className="font-sans text-[12.5px] text-muted italic">the tradeable, verified slice</span>
              </div>
            )}
            <p className="font-mono text-[9.5px] uppercase tracking-[0.13em] text-muted sm:text-right">
              Valued with the C-GEM model{props.modelVersion ? ` · ${props.modelVersion}` : ""}
              <br className="hidden sm:block" /> Evidence-tiered: local → national → IPCC
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
