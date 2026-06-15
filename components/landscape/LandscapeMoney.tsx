"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ArrowUpRight } from "lucide-react";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { useCurrency, formatMoney, CurrencyToggle } from "./currency";

export type MoneyProps = {
  slug: string;
  landscapeName: string;
  total: number;
  investment: number;
  govt: number;
  community: number;
  grants: number;
  returnable: number;
  outcome: number;
  debt: number;
  byPackage: { package: string; total: number }[];
  reach: { householdEngagements: number; hectares: number; lineCount: number };
};

function groupIN(n: number): string {
  const s = Math.round(Math.abs(n)).toString();
  const neg = n < 0 ? "-" : "";
  if (s.length <= 3) return neg + s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return neg + rest + "," + last3;
}
function pct(part: number, whole: number): number {
  return whole ? Math.round((part / whole) * 100) : 0;
}
// Reach counts (households, hectares, lines) are never currency-converted.
function compact(n: number): string {
  if (!n || !isFinite(n) || n <= 0) return "0";
  return groupIN(n);
}

// Funding instruments, in the official CAT palette (distinguishable tones).
const FUND_COLOURS: Record<string, string> = {
  Government: "#334b4a",
  Community: "#2e7573",
  Grants: "#946616",
  "Returnable grant": "#5e6990",
  "Outcome finance": "#929cc5",
  Debt: "#95b1af",
};

/**
 * "Where the money goes" — the page centrepiece for landscapes with an ingested
 * investment plan. Promotes the buried budget story: total plan, a who-pays
 * stacked bar, delivery-package bars that grow on scroll, and the reach strip
 * (engagements / hectares), with deep links into the Budget and Insights tabs.
 */
export function LandscapeMoney(props: MoneyProps) {
  const { currency, rates, ratesLive } = useCurrency();
  const sources = [
    { label: "Government", value: props.govt },
    { label: "Community", value: props.community },
    { label: "Grants", value: props.grants },
    { label: "Returnable grant", value: props.returnable },
    { label: "Outcome finance", value: props.outcome },
    { label: "Debt", value: props.debt },
  ].filter((s) => s.value > 0);
  const fundTotal = sources.reduce((a, s) => a + s.value, 0) || 1;

  const pkgs = props.byPackage.filter((x) => x.total > 0).slice(0, 8);
  const maxPkg = Math.max(...pkgs.map((p) => p.total), 1);

  const barsWrap = useRef<HTMLDivElement | null>(null);
  const barRefs = useRef<Array<HTMLDivElement | null>>([]);
  useEffect(() => {
    const els = barRefs.current.filter(Boolean) as HTMLDivElement[];
    if (!els.length || !barsWrap.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      els.forEach((e) => (e.style.transform = "scaleX(1)"));
      return;
    }
    els.forEach((e) => (e.style.transform = "scaleX(0)"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            io.disconnect();
            gsap.to(els, { scaleX: 1, duration: 1.1, ease: "power3.out", stagger: 0.09 });
          }
        }
      },
      { threshold: 0.3 },
    );
    io.observe(barsWrap.current);
    return () => io.disconnect();
  }, [pkgs.length]);

  return (
    <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 mt-14 lg:mt-20">
      <div
        className="relative overflow-hidden rounded-[16px] border border-line"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 100% 0%, rgba(248,202,124,0.12), transparent 60%), linear-gradient(180deg, rgba(251,248,242,1) 0%, rgba(244,237,221,0.6) 100%)",
          boxShadow: "0 1px 2px rgba(26,38,37,0.04), 0 22px 50px -34px rgba(26,38,37,0.30)",
        }}
      >
        <div className="p-6 sm:p-9 lg:p-11">
          {/* Header + total */}
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            <div>
              <span className="eyebrow">The investment plan</span>
              <h2 className="font-sans font-semibold text-[clamp(26px,3.4vw,40px)] tracking-[-0.03em] leading-[1.05] text-ink mt-2 max-w-[18ch]">
                Where the money goes
              </h2>
              <div className="mt-4 flex items-center gap-2.5 flex-wrap">
                <CurrencyToggle />
                {currency !== "INR" && (
                  <span className="font-mono text-[9px] uppercase tracking-[0.13em] text-muted">
                    {ratesLive ? "Live" : "Indicative"} · 1 {currency} ≈ ₹{rates[currency]}
                  </span>
                )}
              </div>
            </div>
            <div className="lg:text-right">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Total plan size · 7-year horizon</div>
              <div className="font-serif text-[clamp(40px,6vw,68px)] leading-none text-teal tracking-[-0.02em] tabular-nums mt-1">
                <AnimatedNumber key={currency} value={formatMoney(props.total, currency)} />
              </div>
              <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-amber-deep mt-2">
                {formatMoney(props.investment, currency)} external investment · {pct(props.investment, props.total)}% of plan
              </div>
            </div>
          </div>

          {/* Who pays — single stacked bar + legend */}
          <div className="mt-8">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-teal font-semibold mb-3">Who pays</div>
            <div className="flex w-full h-3.5 rounded-full overflow-hidden border border-line/60">
              {sources.map((s) => (
                <div
                  key={s.label}
                  title={`${s.label} · ${formatMoney(s.value, currency)} · ${pct(s.value, fundTotal)}%`}
                  style={{ width: `${(s.value / fundTotal) * 100}%`, background: FUND_COLOURS[s.label] ?? "#95b1af" }}
                />
              ))}
            </div>
            <ul className="mt-3.5 flex flex-wrap gap-x-6 gap-y-2 list-none p-0 m-0">
              {sources.map((s) => (
                <li key={s.label} className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                  <span className="inline-block w-2.5 h-2.5 rounded-[2px]" style={{ background: FUND_COLOURS[s.label] ?? "#95b1af" }} />
                  {s.label}
                  <span className="text-muted">· {pct(s.value, fundTotal)}%</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Delivery packages — bars grow on scroll */}
          <div ref={barsWrap} className="mt-9 pt-7 border-t border-line">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-teal font-semibold mb-1.5">Delivery packages by share of plan</div>
            <p className="font-sans text-[12.5px] text-muted leading-[1.5] mb-4 max-w-[58ch]">
              A package bundles related interventions into one costed workstream — the unit the plan is financed and delivered in.
            </p>
            <ul className="list-none p-0 m-0 flex flex-col gap-3.5">
              {pkgs.map((p, i) => (
                <li key={p.package} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4">
                  <div className="min-w-0">
                    <div className="font-sans text-[13.5px] text-ink leading-tight truncate">{p.package}</div>
                    <div className="mt-1.5 h-[7px] bg-line-soft rounded-full overflow-hidden">
                      <div
                        ref={(el) => { barRefs.current[i] = el; }}
                        className="h-full origin-left rounded-full"
                        style={{ width: `${(p.total / maxPkg) * 100}%`, transform: "scaleX(0)", background: "linear-gradient(90deg, #2e7573, #334b4a)" }}
                      />
                    </div>
                  </div>
                  <div className="font-serif text-[14px] text-deep-teal font-medium tabular-nums whitespace-nowrap">
                    {formatMoney(p.total, currency)} <span className="font-mono text-[10px] text-muted tracking-[0.1em]">· {pct(p.total, props.total)}%</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Reach strip */}
          <div className="mt-9 pt-7 border-t border-line grid grid-cols-3 gap-x-6">
            {[
              { n: props.reach.householdEngagements, label: "Household engagements", sub: "across interventions" },
              { n: props.reach.hectares, label: "Hectares", sub: "area touched" },
              { n: props.reach.lineCount, label: "Costed interventions", sub: "in the plan" },
            ].map((m) => (
              <div key={m.label}>
                <div className="font-serif text-[clamp(22px,3vw,32px)] leading-none text-deep-teal font-medium tabular-nums tracking-[-0.02em]">
                  <AnimatedNumber value={compact(m.n)} />
                </div>
                <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted mt-2.5">{m.label}</div>
                <div className="font-serif italic text-[12px] text-muted mt-0.5">{m.sub}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.13em] text-muted">
            Engagements are summed across interventions, not unique households.
          </p>

          {/* Deep links */}
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href={`/landscape/${props.slug}/budget`}
              className="group inline-flex items-center gap-2 rounded-full bg-deep-teal text-paper px-5 py-2.5 text-[13px] font-medium hover:bg-teal transition-colors"
            >
              Full budget breakdown
              <ArrowUpRight size={14} strokeWidth={2} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
            </Link>
            <Link
              href={`/landscape/${props.slug}/insights`}
              className="group inline-flex items-center gap-2 rounded-full border border-line text-ink px-5 py-2.5 text-[13px] font-medium hover:border-deep-teal hover:text-deep-teal transition-colors"
            >
              Insights & charts
              <ArrowUpRight size={14} strokeWidth={2} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
