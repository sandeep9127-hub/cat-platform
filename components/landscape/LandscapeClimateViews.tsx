"use client";

import { useCurrency, formatMoney } from "./currency";
import type { ClimateViewLine } from "@/lib/db/landscape-kb";

type Props = {
  carbon: ClimateViewLine[];
  adaptation: ClimateViewLine[];
  resilience: ClimateViewLine[];
  /** All-tracks 7-yr GHG footprint (tCO₂e) — denominator for marketability. */
  ghgTotalTco2e?: number;
  /** Tonnes on a registry pathway today; the rest is shadow-priced. */
  carbonCreditableTco2e?: number;
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
export function LandscapeClimateViews({
  carbon,
  adaptation,
  resilience,
  ghgTotalTco2e = 0,
  carbonCreditableTco2e = 0,
}: Props) {
  const { currency } = useCurrency();
  const data = { carbon, adaptation, resilience };
  const creditablePct = ghgTotalTco2e ? Math.round((carbonCreditableTco2e / ghgTotalTco2e) * 100) : 0;
  const shadowPct = ghgTotalTco2e ? 100 - creditablePct : 0;

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
                {lens.key === "carbon" && (ghgTotalTco2e || totalTco2e) > 0 && (
                  <div className="mt-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.13em] text-amber-deep">
                      {groupUS(ghgTotalTco2e || totalTco2e)} tCO₂e over 7 years · all tracks
                    </p>
                    {ghgTotalTco2e > 0 && carbonCreditableTco2e > 0 && (
                      <div className="mt-3 max-w-[72ch]">
                        <div className="flex h-2.5 rounded-full overflow-hidden border border-line">
                          <div style={{ width: `${creditablePct}%`, background: lens.colour }} title={`Creditable today · ${creditablePct}%`} />
                          <div style={{ width: `${shadowPct}%`, background: `${lens.colour}33` }} title={`Shadow price · ${shadowPct}%`} />
                        </div>
                        <div className="flex items-center gap-4 mt-2 font-mono text-[10px] uppercase tracking-[0.1em]">
                          <span className="flex items-center gap-1.5" style={{ color: lens.colour }}>
                            <span className="inline-block w-2 h-2 rounded-sm" style={{ background: lens.colour }} />
                            {creditablePct}% creditable today
                          </span>
                          <span className="flex items-center gap-1.5 text-muted">
                            <span className="inline-block w-2 h-2 rounded-sm" style={{ background: `${lens.colour}33` }} />
                            {shadowPct}% shadow price
                          </span>
                        </div>
                        <p className="font-sans text-[12.5px] text-ink-soft leading-[1.5] mt-2">
                          Only the {creditablePct}% on a registry pathway is creditable today. The remaining {shadowPct}%
                          is genuine greenhouse-gas impact with no smallholder MRV pathway yet — an opportunity for early
                          funders to help build the methodology that turns it into creditable supply.
                        </p>
                      </div>
                    )}
                  </div>
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

      {/* Evidence & method — explains the tier grades on each line above */}
      <div className="mt-12 pt-8 border-t border-line">
        <span className="eyebrow">Evidence &amp; method</span>
        <h3 className="font-sans font-semibold text-[clamp(20px,2.4vw,28px)] tracking-[-0.025em] leading-[1.1] text-ink mt-2">
          How the value is graded
        </h3>
        <p className="font-sans text-[14px] text-ink-soft leading-[1.55] mt-3 max-w-[68ch]">
          Each intervention is assigned the single climate track it primarily serves, then valued over
          the seven-year plan — so nothing is counted twice. Carbon is priced at benchmark removal,
          reduction and avoidance rates. Every figure carries an evidence grade by the strength of its
          source:
        </p>
        <ul className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-px bg-line rounded-[10px] overflow-hidden border border-line list-none p-0">
          {[
            {
              tier: "T1",
              label: "Primary · local",
              body: "Programme documents, baseline surveys and impact evaluations from the landscape itself — the strongest, most place-specific evidence.",
            },
            {
              tier: "T2",
              label: "Secondary · national",
              body: "ICAR institutes, government datasets and peer-reviewed Indian studies — applied where local data is not yet available.",
            },
            {
              tier: "T3",
              label: "Global · methodological",
              body: "IPCC Guidelines & AR6, FAO and international methods — used for emission factors and standardised conversions.",
            },
          ].map((t) => (
            <li key={t.tier} className="bg-paper p-5">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[12px] font-semibold tracking-[0.08em] text-deep-teal">{t.tier}</span>
                <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted">{t.label}</span>
              </div>
              <p className="font-sans text-[13px] text-ink-soft leading-[1.5] mt-2">{t.body}</p>
            </li>
          ))}
        </ul>
        <p className="font-sans text-[12.5px] text-muted italic leading-[1.5] mt-4 max-w-[68ch]">
          Lines tagged e.g. “T1+T2” combine a local figure with a national factor. All values are
          modelled — avoided losses, protected income and verified carbon — not a cash return.
        </p>
      </div>
    </section>
  );
}
