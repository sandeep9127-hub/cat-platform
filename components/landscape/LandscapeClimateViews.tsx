"use client";

import { useCurrency, formatMoney } from "./currency";
import type { ClimateViewLine } from "@/lib/db/landscape-kb";

type Props = {
  carbon: ClimateViewLine[];
  adaptation: ClimateViewLine[];
  resilience: ClimateViewLine[];
};

const LENSES = [
  {
    key: "resilience" as const,
    label: "Resilience donor",
    colour: "#2E7573",
    blurb: "Household income protected against climate shocks — the safety net the plan builds.",
    valueLabel: "Income protected · 7 yr",
  },
  {
    key: "adaptation" as const,
    label: "Adaptation finance",
    colour: "#5E6990",
    blurb: "Input savings, yield uplift and margin expansion that make farms productive under a changing climate.",
    valueLabel: "Adaptation value · 7 yr",
  },
  {
    key: "carbon" as const,
    label: "Carbon investor",
    colour: "#946616",
    blurb: "Verified greenhouse-gas removal, reduction and avoidance — the tradeable carbon, at benchmark prices.",
    valueLabel: "Carbon value · 7 yr",
  },
];

function groupUS(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * The three funder lenses, each a ranked table of the interventions that drive
 * that climate track. A carbon buyer, an adaptation fund and a resilience donor
 * each see their own value, evidence-tier and per-intervention detail.
 */
export function LandscapeClimateViews({ carbon, adaptation, resilience }: Props) {
  const { currency } = useCurrency();
  const data = { carbon, adaptation, resilience };

  return (
    <section className="mt-14 lg:mt-16 max-w-page mx-auto px-5 sm:px-7 lg:px-10">
      <div className="mb-7">
        <span className="eyebrow">By funder lens</span>
        <h2 className="font-sans font-semibold text-[clamp(24px,3vw,36px)] tracking-[-0.03em] leading-[1.05] text-ink mt-2">
          Three ways to read the value
        </h2>
        <p className="font-sans text-[15px] text-ink-soft leading-[1.55] mt-3 max-w-[64ch]">
          The same plan, valued through three lenses. Each intervention is counted once, in the
          track it primarily serves; the carbon figures carry the tradeable tonnage.
        </p>
      </div>

      <div className="flex flex-col gap-8">
        {LENSES.map((lens) => {
          const lines = data[lens.key].filter((l) => l.value7yrInr > 0);
          if (lines.length === 0) return null;
          const total = lines.reduce((s, l) => s + l.value7yrInr, 0);
          const totalTco2e = lines.reduce((s, l) => s + (l.tco2e7yr ?? 0), 0);
          return (
            <div
              key={lens.key}
              className="rounded-[12px] border border-line bg-paper overflow-hidden"
              style={{ boxShadow: "0 1px 2px rgba(26,38,37,0.04)" }}
            >
              <div className="p-5 sm:p-6 border-b border-line" style={{ background: `${lens.colour}0a` }}>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: lens.colour }} />
                    <h3 className="font-sans text-[18px] font-semibold tracking-[-0.01em] text-ink">{lens.label}</h3>
                  </div>
                  <div className="font-serif text-[22px] tabular-nums tracking-[-0.015em]" style={{ color: lens.colour }}>
                    {formatMoney(total, currency)}
                  </div>
                </div>
                <p className="font-sans text-[13px] text-ink-soft leading-[1.5] mt-2 max-w-[70ch]">{lens.blurb}</p>
                {lens.key === "carbon" && totalTco2e > 0 && (
                  <p className="font-mono text-[10px] uppercase tracking-[0.13em] text-amber-deep mt-2">
                    {groupUS(totalTco2e)} tCO₂e over 7 years
                  </p>
                )}
              </div>
              <ul className="list-none p-0 m-0 divide-y divide-line/70">
                {lines.map((l, i) => (
                  <li key={i} className="px-5 sm:px-6 py-3.5 grid grid-cols-[1fr_auto] gap-x-4 items-baseline">
                    <div className="min-w-0">
                      <div className="font-sans text-[14px] text-ink leading-snug">{l.subIntervention}</div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {l.metric && (
                          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">{l.metric}</span>
                        )}
                        {l.tco2e7yr ? (
                          <span className="font-mono text-[10px] uppercase tracking-[0.1em]" style={{ color: lens.colour }}>
                            {groupUS(l.tco2e7yr)} tCO₂e
                          </span>
                        ) : null}
                        {l.tier && (
                          <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted border border-line rounded px-1 py-0.5">
                            {l.tier}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="font-serif text-[15px] text-deep-teal tabular-nums whitespace-nowrap">
                      {formatMoney(l.value7yrInr, currency)}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <p className="font-mono text-[9.5px] uppercase tracking-[0.13em] text-muted mt-7">
        Evidence tiers · T1 local programme data · T2 national / ICAR · T3 IPCC &amp; global methods
      </p>
    </section>
  );
}
