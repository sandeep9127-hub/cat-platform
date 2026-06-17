"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
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
    blurb: "The safety net — household income protected when a climate shock hits.",
  },
  {
    key: "adaptation" as const,
    label: "Adaptation finance",
    colour: "#5E6990",
    blurb: "The farm economy — lower costs, better yields, steadier margins.",
  },
  {
    key: "carbon" as const,
    label: "Carbon investor",
    colour: "#946616",
    blurb: "The tradeable carbon — greenhouse gas removed, reduced and avoided.",
  },
];

function groupUS(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
function pct(part: number, whole: number): number {
  return whole ? Math.round((part / whole) * 100) : 0;
}

/**
 * The three funder lenses as an accordion — each headline value and share stays
 * visible; open one to see the ranked interventions behind it (with an inline
 * value bar). The carbon lens also carries the marketability split. One open at
 * a time; the largest opens by default.
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

  const lensData = LENSES.map((lens) => {
    const lines = data[lens.key]
      .filter((l) => l.value7yrInr > 0)
      .sort((a, b) => b.value7yrInr - a.value7yrInr);
    const total = lines.reduce((s, l) => s + l.value7yrInr, 0);
    const max = lines.reduce((m, l) => Math.max(m, l.value7yrInr), 0) || 1;
    return { ...lens, lines, total, max };
  }).filter((l) => l.lines.length > 0);

  const grand = lensData.reduce((s, l) => s + l.total, 0) || 1;
  const [open, setOpen] = useState<string>(lensData[0]?.key ?? "");
  const [methodOpen, setMethodOpen] = useState(false);

  const creditablePct = ghgTotalTco2e ? Math.round((carbonCreditableTco2e / ghgTotalTco2e) * 100) : 0;
  const shadowPct = ghgTotalTco2e ? 100 - creditablePct : 0;

  return (
    <section className="mt-14 lg:mt-16 max-w-page mx-auto px-5 sm:px-7 lg:px-10">
      <div className="mb-6">
        <span className="eyebrow">By funder lens</span>
        <h2 className="font-sans font-semibold text-[clamp(24px,3vw,36px)] tracking-[-0.03em] leading-[1.05] text-ink mt-2">
          Three ways to read the value
        </h2>
        <p className="font-sans text-[15px] text-ink-soft leading-[1.55] mt-3 max-w-[58ch]">
          The same plan, read by the three funders who care about it. Open one to see what drives it.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {lensData.map((lens) => {
          const isOpen = open === lens.key;
          return (
            <div
              key={lens.key}
              className="rounded-[12px] border border-line bg-paper overflow-hidden transition-shadow"
              style={{ boxShadow: isOpen ? "0 1px 2px rgba(26,38,37,0.04), 0 14px 34px -26px rgba(26,38,37,0.3)" : "0 1px 2px rgba(26,38,37,0.04)" }}
            >
              {/* Always-visible header — name, share, value, toggle */}
              <button
                type="button"
                onClick={() => setOpen(isOpen ? "" : lens.key)}
                aria-expanded={isOpen}
                className="w-full text-left p-5 sm:p-6 flex items-center gap-4 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset"
                style={{ background: isOpen ? `${lens.colour}0a` : "transparent" }}
              >
                <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ background: lens.colour }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2.5 flex-wrap">
                    <h3 className="font-sans text-[17px] sm:text-[18px] font-semibold tracking-[-0.01em] text-ink">{lens.label}</h3>
                    <span className="font-mono text-[10px] uppercase tracking-[0.13em] text-muted tabular-nums">
                      {pct(lens.total, grand)}% of value
                    </span>
                  </div>
                  <p className="font-sans text-[12.5px] text-ink-soft leading-[1.45] mt-1 max-w-[64ch]">{lens.blurb}</p>
                </div>
                <div className="font-serif text-[20px] sm:text-[23px] tabular-nums tracking-[-0.015em] shrink-0" style={{ color: lens.colour }}>
                  {formatMoney(lens.total, currency)}
                </div>
                <ChevronDown
                  size={18}
                  className="shrink-0 text-muted transition-transform duration-300"
                  style={{ transform: isOpen ? "rotate(180deg)" : "none" }}
                  aria-hidden
                />
              </button>

              {/* Collapsible body — animates via grid-template-rows 0fr → 1fr */}
              <div
                className="grid transition-[grid-template-rows] duration-300 ease-out"
                style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <div className="border-t border-line">
                    {/* Carbon lens: marketability split */}
                    {lens.key === "carbon" && ghgTotalTco2e > 0 && (
                      <div className="px-5 sm:px-6 py-4 border-b border-line bg-line-soft/40">
                        <p className="font-mono text-[10px] uppercase tracking-[0.13em] text-amber-deep">
                          {groupUS(ghgTotalTco2e)} tCO₂e over 7 years · all tracks
                        </p>
                        {carbonCreditableTco2e > 0 && (
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
                              Only the {creditablePct}% on a registry pathway is creditable today. The rest is real
                              greenhouse-gas impact with no smallholder MRV pathway yet — a chance for early funders to
                              help build the method that turns it into creditable supply.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Ranked interventions, each with an inline value bar */}
                    <ul className="list-none p-0 m-0 divide-y divide-line/70">
                      {lens.lines.map((l, i) => (
                        <li key={i} className="px-5 sm:px-6 py-3.5 grid grid-cols-[1fr_auto] gap-x-4 items-baseline">
                          <div className="min-w-0">
                            <div className="font-sans text-[14px] text-ink leading-snug">{l.subIntervention}</div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
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
                            <div className="mt-1.5 h-1 rounded-full bg-line overflow-hidden max-w-[240px]">
                              <div className="h-full rounded-full" style={{ width: `${pct(l.value7yrInr, lens.max)}%`, background: lens.colour, opacity: 0.5 }} />
                            </div>
                          </div>
                          <div className="font-serif text-[15px] text-deep-teal tabular-nums whitespace-nowrap">
                            {formatMoney(l.value7yrInr, currency)}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* How the value is graded — collapsed by default to keep the page light */}
      <div className="mt-10 rounded-[12px] border border-line bg-paper overflow-hidden">
        <button
          type="button"
          onClick={() => setMethodOpen((o) => !o)}
          aria-expanded={methodOpen}
          className="w-full text-left px-5 sm:px-6 py-4 flex items-center gap-3 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset"
        >
          <div className="flex-1">
            <span className="eyebrow">Evidence &amp; method</span>
            <h3 className="font-sans font-semibold text-[18px] tracking-[-0.01em] text-ink mt-0.5">How the value is graded</h3>
          </div>
          <ChevronDown
            size={18}
            className="shrink-0 text-muted transition-transform duration-300"
            style={{ transform: methodOpen ? "rotate(180deg)" : "none" }}
            aria-hidden
          />
        </button>
        <div className="grid transition-[grid-template-rows] duration-300 ease-out" style={{ gridTemplateRows: methodOpen ? "1fr" : "0fr" }}>
          <div className="overflow-hidden">
            <div className="px-5 sm:px-6 pb-6 border-t border-line pt-5">
              <p className="font-sans text-[14px] text-ink-soft leading-[1.55] max-w-[68ch]">
                Each intervention is counted once, in the track it mainly serves — so nothing is double-counted.
                Carbon is priced at benchmark rates. Every figure carries an evidence grade:
              </p>
              <ul className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-px bg-line rounded-[10px] overflow-hidden border border-line list-none p-0">
                {[
                  { tier: "T1", label: "Primary · local", body: "Programme data, baseline surveys and impact evaluations from the landscape itself — the strongest evidence." },
                  { tier: "T2", label: "Secondary · national", body: "ICAR institutes, government datasets and peer-reviewed Indian studies — used where local data isn't available yet." },
                  { tier: "T3", label: "Global · methodological", body: "IPCC Guidelines & AR6, FAO and international methods — for emission factors and standard conversions." },
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
                A tag like “T1+T2” combines a local figure with a national factor. All values are modelled — not a
                cash return.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
