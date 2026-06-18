"use client";

import { useMemo, useState } from "react";
import type { BudgetLine, BudgetSummary } from "@/lib/db/landscape-kb";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { SectionOpener } from "@/components/ui/SectionOpener";
import { useCurrency, formatMoney, countIN, CurrencyToggle, type Currency } from "./currency";
import {
  Wallet,
  Landmark,
  HandHeart,
  TrendingUp,
  Home,
  Trees,
  Beef,
  Filter,
  X as XIcon,
} from "lucide-react";

// Currency-aware money formatter (precise: 2-decimal budget detail).
const inrFor = (cur: Currency) => (n: number | string | null | undefined) =>
  formatMoney(Number(n ?? 0), cur, true);

function pct(part: number, whole: number): string {
  if (!whole) return "0%";
  return `${((part / whole) * 100).toFixed(1)}%`;
}

type Accent = {
  bar: string;
  soft: string;
  glow: string;
  iconBg: string;
  iconFg: string;
};

const ACCENTS = {
  amber: {
    bar: "#C68C2E",
    soft: "rgba(248,202,124,0.14)",
    glow: "rgba(248,202,124,0.30)",
    iconBg: "rgba(248,202,124,0.22)",
    iconFg: "#C68C2E",
  } as Accent,
  teal: {
    bar: "#2E7573",
    soft: "rgba(46,117,115,0.08)",
    glow: "rgba(46,117,115,0.20)",
    iconBg: "rgba(46,117,115,0.12)",
    iconFg: "#2E7573",
  } as Accent,
  periwinkle: {
    bar: "#929CC5",
    soft: "rgba(146,156,197,0.12)",
    glow: "rgba(146,156,197,0.24)",
    iconBg: "rgba(146,156,197,0.18)",
    iconFg: "#5C6796",
  } as Accent,
  deepTeal: {
    bar: "#334B4A",
    soft: "rgba(51,75,74,0.06)",
    glow: "rgba(51,75,74,0.18)",
    iconBg: "rgba(51,75,74,0.10)",
    iconFg: "#334B4A",
  } as Accent,
};

export function BudgetExplorer({
  summary,
  lines,
}: {
  summary: BudgetSummary;
  lines: BudgetLine[];
}) {
  const { currency } = useCurrency();
  const inr = inrFor(currency);
  const categories = useMemo(() => {
    return Array.from(new Set(lines.map((l) => l.category).filter(Boolean))) as string[];
  }, [lines]);
  const packages = useMemo(() => {
    return Array.from(new Set(lines.map((l) => l.package).filter(Boolean))) as string[];
  }, [lines]);

  const [cat, setCat] = useState<string>("");
  const [pkg, setPkg] = useState<string>("");

  const filtered = useMemo(() => {
    return lines.filter((l) => {
      if (cat && l.category !== cat) return false;
      if (pkg && l.package !== pkg) return false;
      return true;
    });
  }, [lines, cat, pkg]);

  const t = useMemo(() => {
    const o = {
      total: 0,
      govt: 0,
      community: 0,
      investment: 0,
      grants: 0,
      returnable: 0,
      outcome: 0,
      debt: 0,
      households: 0,
      hectares: 0,
      animals: 0,
    };
    for (const l of filtered) {
      o.total += Number(l.totalCostInr ?? 0);
      o.govt += Number(l.govtInr ?? 0);
      o.community += Number(l.communityInr ?? 0);
      o.investment += Number(l.investmentRequiredInr ?? 0);
      o.grants += Number(l.grantsInr ?? 0);
      o.returnable += Number(l.returnableGrantInr ?? 0);
      o.outcome += Number(l.outcomeFinanceInr ?? 0);
      o.debt += Number(l.debtInr ?? 0);
      o.households += Number(l.impactHouseholds ?? 0);
      o.hectares += Number(l.impactHectares ?? 0);
      o.animals += Number(l.impactAnimals ?? 0);
    }
    return o;
  }, [filtered]);

  return (
    <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pb-24">
      {/* Programme scale */}
      <div className="mt-10 mb-4 flex items-end justify-between gap-4 flex-wrap">
        <SectionOpener number="01" label="Programme scale" />
        <div className="flex items-center gap-2.5 flex-wrap pb-1">
          <CurrencyToggle />
          {currency !== "INR" && (
            <span className="font-mono text-[9px] uppercase tracking-[0.13em] text-muted">Indicative rates</span>
          )}
        </div>
      </div>
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          key={`total-${currency}`}
          label="Total cost · 7 years"
          value={inr(t.total)}
          sub="Programme size"
          icon={Wallet}
          accent={ACCENTS.deepTeal}
        />
        <StatCard
          key={`govt-${currency}`}
          label="Government convergence"
          value={inr(t.govt)}
          sub={`${pct(t.govt, t.total)} of plan`}
          icon={Landmark}
          accent={ACCENTS.teal}
        />
        <StatCard
          key={`comm-${currency}`}
          label="Community contribution"
          value={inr(t.community)}
          sub={`${pct(t.community, t.total)} of plan`}
          icon={HandHeart}
          accent={ACCENTS.periwinkle}
        />
        <StatCard
          key={`ext-${currency}`}
          label="External investment"
          value={inr(t.investment)}
          sub={`${pct(t.investment, t.total)} of plan`}
          icon={TrendingUp}
          accent={ACCENTS.amber}
          highlighted
        />
      </section>

      {/* Funding mix */}
      <div className="mt-10 mb-4">
        <SectionOpener number="02" label="Funding mix" />
      </div>
      <FundingMix totals={t} />

      {/* On-the-ground impact */}
      <div className="mt-10 mb-4">
        <SectionOpener number="03" label="On-the-ground impact" />
      </div>
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Households reached"
          value={countIN(t.households)}
          sub="Cumulative across interventions"
          icon={Home}
          accent={ACCENTS.teal}
          compact
        />
        <StatCard
          label="Hectares"
          value={countIN(t.hectares)}
          sub="Land surface treated"
          icon={Trees}
          accent={ACCENTS.deepTeal}
          compact
        />
        <StatCard
          label="Animals"
          value={countIN(t.animals)}
          sub="Livestock interventions"
          icon={Beef}
          accent={ACCENTS.periwinkle}
          compact
        />
      </section>

      {/* Filters */}
      <section className="mt-14 flex flex-wrap gap-3 items-end">
        <span className="inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-teal font-semibold pb-2">
          <Filter size={12} strokeWidth={1.8} />
          Filter the plan
        </span>
        <FilterDropdown label="Category" value={cat} onChange={setCat} options={categories} />
        <FilterDropdown label="Package" value={pkg} onChange={setPkg} options={packages} />
        {(cat || pkg) && (
          <button
            onClick={() => {
              setCat("");
              setPkg("");
            }}
            className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-amber-deep hover:text-deep-teal font-semibold py-2 transition-colors"
          >
            <XIcon size={12} strokeWidth={2} />
            Clear filters
          </button>
        )}
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted ml-auto self-center tabular-nums">
          {filtered.length} of {lines.length} lines
        </span>
      </section>

      {/* Category and package breakdowns */}
      {!cat && !pkg && (
        <section className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-5">
          <BreakdownCard
            title="By category"
            rows={summary.byCategory.map((c) => ({
              label: c.category,
              total: c.total,
              investment: c.investment,
            }))}
            grandTotal={summary.totalCostInr}
            accent={ACCENTS.teal}
          />
          <BreakdownCard
            title="By package"
            rows={summary.byPackage.map((p) => ({
              label: p.package,
              total: p.total,
              investment: p.investment,
            }))}
            grandTotal={summary.totalCostInr}
            accent={ACCENTS.amber}
          />
        </section>
      )}
      {!cat && !pkg && (
        <p className="mt-3 font-sans text-[12px] text-muted leading-[1.5] max-w-[70ch]">
          A package bundles related interventions into one costed workstream: the unit the plan is
          financed and delivered in.
        </p>
      )}

      {/* Line table */}
      <section className="mt-14">
        <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-teal font-semibold mb-4 inline-flex items-center gap-2">
          <span className="w-4 h-px bg-amber-deep" />
          {filtered.length === lines.length ? "All intervention lines" : "Filtered lines"}
        </div>
        <div
          className="overflow-x-auto rounded-[8px] border border-line"
          style={{
            boxShadow: "0 1px 2px rgba(26,38,37,0.04), 0 8px 24px -16px rgba(46,117,115,0.18)",
          }}
        >
          <table className="w-full text-[14px]">
            <thead
              className="text-cream"
              style={{
                background: "linear-gradient(135deg, #334B4A 0%, #2E7573 100%)",
              }}
            >
              <tr className="text-left font-mono uppercase text-[10px] tracking-[0.14em]">
                <th className="px-4 py-3.5 font-semibold">Category</th>
                <th className="px-4 py-3.5 font-semibold">Intervention</th>
                <th className="px-4 py-3.5 font-semibold">Package</th>
                <th className="px-4 py-3.5 font-semibold text-right">Total</th>
                <th className="px-4 py-3.5 font-semibold text-right">Govt</th>
                <th className="px-4 py-3.5 font-semibold text-right">Investment</th>
                <th className="px-4 py-3.5 font-semibold text-right">HH</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, i) => (
                <tr
                  key={l.id}
                  className={`border-t border-line-soft hover:bg-cream/60 transition-colors ${
                    i % 2 === 0 ? "bg-paper" : "bg-cream/30"
                  }`}
                >
                  <td className="px-4 py-3.5 align-top">
                    <div className="font-sans text-ink leading-snug">{l.category ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    <div className="font-sans text-ink-soft leading-snug">{l.subintervention ?? l.intervention ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3.5 align-top font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">
                    {l.package ?? "—"}
                  </td>
                  <td className="px-4 py-3.5 align-top text-right font-mono tabular-nums text-deep-teal font-semibold">
                    {inr(l.totalCostInr)}
                  </td>
                  <td className="px-4 py-3.5 align-top text-right font-mono tabular-nums text-teal">
                    {inr(l.govtInr)}
                  </td>
                  <td className="px-4 py-3.5 align-top text-right font-mono tabular-nums text-amber-deep">
                    {inr(l.investmentRequiredInr)}
                  </td>
                  <td className="px-4 py-3.5 align-top text-right font-mono tabular-nums text-ink-soft">
                    {l.impactHouseholds ? countIN(Number(l.impactHouseholds)) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  highlighted,
  compact,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  accent: Accent;
  highlighted?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className="group relative overflow-hidden rounded-[8px] border border-line bg-paper p-5 sm:p-6 transition-all duration-300 ease-out hover:-translate-y-0.5"
      style={{
        boxShadow: highlighted
          ? `0 1px 2px rgba(26,38,37,0.04), 0 14px 36px -14px ${accent.glow}`
          : `0 1px 2px rgba(26,38,37,0.04), 0 8px 24px -14px ${accent.glow}`,
        backgroundImage: `linear-gradient(180deg, rgba(251,248,242,1) 0%, ${accent.soft} 100%)`,
      }}
    >
      <span
        aria-hidden
        className="absolute top-0 left-0 right-0"
        style={{
          height: highlighted ? 4 : 3,
          background: `linear-gradient(90deg, ${accent.bar} 0%, ${accent.bar}cc 55%, transparent 100%)`,
        }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted leading-tight max-w-[18ch]">
          {label}
        </span>
        <span
          className="shrink-0 w-9 h-9 rounded-[6px] inline-flex items-center justify-center"
          style={{ background: accent.iconBg, color: accent.iconFg }}
          aria-hidden
        >
          <Icon size={16} strokeWidth={1.7} />
        </span>
      </div>
      <div
        className={`relative font-serif font-medium leading-none tracking-[-0.022em] mt-4 text-deep-teal tabular-nums ${
          compact ? "text-[28px] sm:text-[32px]" : "text-[28px] sm:text-[34px] lg:text-[36px]"
        }`}
      >
        <AnimatedNumber value={value} />
      </div>
      {sub && (
        <div className="relative mt-3 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em]">
          <span className="inline-block w-3 h-px" style={{ background: accent.bar }} />
          <span style={{ color: accent.iconFg }}>{sub}</span>
        </div>
      )}
    </div>
  );
}

function FundingMix({
  totals,
}: {
  totals: {
    total: number;
    govt: number;
    community: number;
    investment: number;
    grants: number;
    returnable: number;
    outcome: number;
    debt: number;
  };
}) {
  const { currency } = useCurrency();
  const inr = inrFor(currency);
  const segments = [
    { label: "Government", value: totals.govt, color: "#2E7573" },
    { label: "Community", value: totals.community, color: "#929CC5" },
    { label: "Grants", value: totals.grants, color: "#C68C2E" },
    { label: "Returnable", value: totals.returnable, color: "#F8CA7C" },
    { label: "Outcome-based", value: totals.outcome, color: "#5C6796" },
    { label: "Debt", value: totals.debt, color: "#334B4A" },
  ].filter((s) => s.value > 0);

  const sum = segments.reduce((acc, s) => acc + s.value, 0);
  if (!sum) return null;

  return (
    <section
      className="relative overflow-hidden rounded-[8px] border border-line bg-paper p-5 sm:p-6 mt-4"
      style={{
        boxShadow: "0 1px 2px rgba(26,38,37,0.04), 0 8px 24px -16px rgba(46,117,115,0.20)",
        backgroundImage:
          "linear-gradient(180deg, rgba(251,248,242,1) 0%, rgba(248,243,232,0.55) 100%)",
      }}
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-teal font-semibold inline-flex items-center gap-2">
          <span className="w-4 h-px bg-amber-deep" />
          Funding mix
        </span>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted tabular-nums">
          {inr(sum)}
        </span>
      </div>

      <div className="relative h-3 w-full rounded-full overflow-hidden bg-line-soft">
        {(() => {
          let offset = 0;
          return segments.map((s, i) => {
            const w = (s.value / sum) * 100;
            const left = offset;
            offset += w;
            return (
              <div
                key={s.label + i}
                className="absolute top-0 bottom-0 transition-all duration-700 ease-out"
                style={{
                  left: `${left}%`,
                  width: `${w}%`,
                  background: `linear-gradient(180deg, ${s.color}, ${s.color}dd)`,
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.20)",
                }}
                title={`${s.label}: ${inr(s.value)} (${((s.value / sum) * 100).toFixed(1)}%)`}
              />
            );
          });
        })()}
      </div>

      <ul className="list-none p-0 mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {segments.map((s) => (
          <li key={s.label} className="flex items-start gap-2.5">
            <span
              className="mt-1 w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: s.color, boxShadow: `0 0 0 3px ${s.color}1f` }}
              aria-hidden
            />
            <div className="min-w-0">
              <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted leading-none">
                {s.label}
              </div>
              <div className="font-mono text-[12.5px] text-deep-teal tabular-nums leading-tight mt-1">
                {inr(s.value)}
              </div>
              <div className="font-mono text-[9.5px] tabular-nums text-muted leading-none mt-0.5">
                {((s.value / sum) * 100).toFixed(1)}%
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FilterDropdown({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3.5 py-2.5 bg-paper border border-line rounded-[6px] font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft shadow-[inset_0_1px_0_rgba(26,38,37,0.03)] hover:border-line-soft focus:outline-none focus:border-teal focus:shadow-[inset_0_1px_0_rgba(26,38,37,0.03),0_0_0_3px_rgba(46,117,115,0.18)] transition-all"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o.slice(0, 70)}
          </option>
        ))}
      </select>
    </label>
  );
}

function BreakdownCard({
  title,
  rows,
  grandTotal,
  accent,
}: {
  title: string;
  rows: { label: string; total: number; investment: number }[];
  grandTotal: number;
  accent: Accent;
}) {
  const { currency } = useCurrency();
  const inr = inrFor(currency);
  return (
    <div
      className="relative overflow-hidden rounded-[8px] border border-line bg-paper p-5 sm:p-6"
      style={{
        boxShadow: `0 1px 2px rgba(26,38,37,0.04), 0 8px 24px -16px ${accent.glow}`,
        backgroundImage: `linear-gradient(180deg, rgba(251,248,242,1) 0%, ${accent.soft} 100%)`,
      }}
    >
      <span
        aria-hidden
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{
          background: `linear-gradient(90deg, ${accent.bar} 0%, ${accent.bar}cc 55%, transparent 100%)`,
        }}
      />
      <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-teal font-semibold mb-5 inline-flex items-center gap-2">
        <span className="w-3.5 h-px" style={{ background: accent.bar }} />
        {title}
      </div>
      <ul className="list-none p-0 m-0 flex flex-col gap-4">
        {rows.map((r) => {
          const p = grandTotal ? (r.total / grandTotal) * 100 : 0;
          return (
            <li key={r.label}>
              <div className="flex justify-between items-baseline gap-3 text-[14px]">
                <span className="font-sans text-ink truncate">{r.label}</span>
                <span className="font-mono tabular-nums text-deep-teal whitespace-nowrap font-semibold">
                  {inr(r.total)}
                </span>
              </div>
              <div className="mt-2 h-2 bg-line-soft rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${Math.min(100, p)}%`,
                    background: `linear-gradient(90deg, ${accent.bar}, ${accent.bar}aa)`,
                    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.20)`,
                  }}
                />
              </div>
              <div className="flex justify-between font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted mt-1.5 tabular-nums">
                <span>{p.toFixed(1)}% of total</span>
                <span>Investment: {inr(r.investment)}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
