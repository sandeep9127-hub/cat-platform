"use client";

import { palette } from "@/lib/design/palette";
import { useMemo, useState } from "react";
import type { BudgetSummary } from "@/lib/db/landscape-kb";
import { RequestTableCta } from "./RequestTableCta";
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
    bar: palette.ochre,
    soft: "rgba(248,202,124,0.14)",
    glow: "rgba(248,202,124,0.30)",
    iconBg: "rgba(248,202,124,0.22)",
    iconFg: palette.amberDeep,
  } as Accent,
  teal: {
    bar: palette.teal,
    soft: "rgba(46,117,115,0.08)",
    glow: "rgba(46,117,115,0.20)",
    iconBg: "rgba(46,117,115,0.12)",
    iconFg: palette.teal,
  } as Accent,
  periwinkle: {
    bar: palette.periwinkle,
    soft: "rgba(146,156,197,0.12)",
    glow: "rgba(146,156,197,0.24)",
    iconBg: "rgba(146,156,197,0.18)",
    iconFg: palette.periwinkleText,
  } as Accent,
  deepTeal: {
    bar: "#334B4A",
    soft: "rgba(51,75,74,0.06)",
    glow: "rgba(51,75,74,0.18)",
    iconBg: "rgba(51,75,74,0.10)",
    iconFg: "#334B4A",
  } as Accent,
};

/** Totals for one theme (category). The public page gets only these, never lines. */
export type BudgetGroup = {
  category: string;
  total: number;
  govt: number;
  community: number;
  investment: number;
  grants: number;
  returnable: number;
  outcome: number;
  debt: number;
  households: number;
  hectares: number;
  animals: number;
};

export function BudgetExplorer({
  summary,
  groups,
  slug,
}: {
  summary: BudgetSummary;
  groups: BudgetGroup[];
  slug: string;
}) {
  const { currency } = useCurrency();
  const inr = inrFor(currency);
  const categories = useMemo(() => groups.map((g) => g.category), [groups]);

  const [cat, setCat] = useState<string>("");

  const filtered = useMemo(() => groups.filter((g) => !cat || g.category === cat), [groups, cat]);

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
    for (const g of filtered) {
      for (const k of Object.keys(o) as (keyof typeof o)[]) o[k] += g[k];
    }
    return o;
  }, [filtered]);

  return (
    <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pb-24">
      {/* Programme scale */}
      <div className="mt-10 mb-4 flex items-end justify-between gap-4 flex-wrap">
        <SectionOpener number="01" label="Programme scale" />
        <div className="flex items-center gap-2.5 flex-wrap pb-1">
          {/* Label sits left of the toggle so the toggle stays put when it appears. */}
          {currency !== "INR" && (
            <span className="font-mono text-[11px] uppercase tracking-[0.13em] text-muted">Indicative rates</span>
          )}
          <CurrencyToggle />
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
        <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-teal font-semibold pb-2">
          <Filter size={12} strokeWidth={1.8} />
          Filter the plan
        </span>
        <FilterDropdown label="Category" value={cat} onChange={setCat} options={categories} />
        {cat && (
          <button
            onClick={() => setCat("")}
            className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-amber-deep hover:text-deep-teal font-semibold py-2 transition-colors"
          >
            <XIcon size={12} strokeWidth={2} />
            Clear filter
          </button>
        )}
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted ml-auto self-center tabular-nums">
          {filtered.length} of {groups.length} themes
        </span>
      </section>

      {/* Category breakdown */}
      {!cat && (
        <section className="mt-10">
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
        </section>
      )}

      {/* The intervention-by-intervention table is shared on request only. */}
      <section className="mt-14 rounded-card border border-line bg-cream/40 p-6 sm:p-8">
        <h2 className="font-sans font-semibold text-[22px] tracking-[-0.02em] text-ink">
          Want every intervention, line by line?
        </h2>
        <p className="mt-2 text-[15px] text-ink-soft leading-[1.55] max-w-[60ch]">
          The full investment table lists each intervention with its costs, funding sources and
          reach. Ask for it and you'll get a personal, view-only link.
        </p>
        <RequestTableCta slug={slug} className="mt-5" />
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
      // Plain report tile: hairline border, no tinted gradient, coloured stripe,
      // glow or hover lift. The figure carries the weight, not decoration.
      className={`relative rounded-card border bg-paper p-5 sm:p-6 ${highlighted ? "border-ink/25" : "border-line"}`}
      data-accent={accent.bar}
    >
      <div className="relative flex items-start justify-between gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted leading-tight max-w-[18ch]">
          {label}
        </span>
        <span
          className="shrink-0 inline-flex items-center justify-center text-muted"
          aria-hidden
        >
          <Icon size={16} strokeWidth={1.7} />
        </span>
      </div>
      <div
        className={`relative font-sans font-medium leading-none tracking-[-0.022em] mt-4 text-ink tabular-nums ${
          compact ? "text-[28px] sm:text-[32px]" : "text-[28px] sm:text-[34px] lg:text-[36px]"
        }`}
      >
        <AnimatedNumber value={value} />
      </div>
      {sub && (
        <div className="relative mt-3 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em]">
          <span className="text-muted">{sub}</span>
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
    { label: "Government", value: totals.govt, color: palette.teal },
    { label: "Community", value: totals.community, color: palette.periwinkle },
    { label: "Grants", value: totals.grants, color: palette.ochre },
    { label: "Returnable", value: totals.returnable, color: "#F8CA7C" },
    { label: "Outcome-based", value: totals.outcome, color: palette.periwinkleText },
    { label: "Debt", value: totals.debt, color: "#334B4A" },
  ].filter((s) => s.value > 0);

  const sum = segments.reduce((acc, s) => acc + s.value, 0);
  if (!sum) return null;

  return (
    <section
      className="relative overflow-hidden rounded-card border border-line bg-paper p-5 sm:p-6 mt-4"
      style={{
        boxShadow: "0 1px 2px rgba(26,38,37,0.04), 0 8px 24px -16px rgba(46,117,115,0.20)",
        backgroundImage:
          "linear-gradient(180deg, rgba(251,248,242,1) 0%, rgba(248,243,232,0.55) 100%)",
      }}
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-teal font-semibold inline-flex items-center gap-2">
          <span className="w-4 h-px bg-amber-deep" />
          Funding mix
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted tabular-nums">
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
                className="absolute top-0 bottom-0 transition-[width] duration-700 ease-out"
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
              <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted leading-none">
                {s.label}
              </div>
              <div className="font-mono text-[12.5px] text-deep-teal tabular-nums leading-tight mt-1">
                {inr(s.value)}
              </div>
              <div className="font-mono text-[11px] tabular-nums text-muted leading-none mt-0.5">
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
    <label className="flex flex-col gap-1.5 min-w-0 max-w-full">
      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full max-w-full truncate px-3.5 py-2.5 bg-paper border border-line rounded-card font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft shadow-[inset_0_1px_0_rgba(26,38,37,0.03)] hover:border-line-soft focus:outline-none focus:border-teal focus:shadow-[inset_0_1px_0_rgba(26,38,37,0.03),0_0_0_3px_rgba(46,117,115,0.18)] transition-[transform,box-shadow,border-color,background-color,opacity] duration-200 ease-out"
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
      className="relative overflow-hidden rounded-card border border-line bg-paper p-5 sm:p-6"
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
      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-teal font-semibold mb-5 inline-flex items-center gap-2">
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
                  className="h-full rounded-full transition-[width] duration-700 ease-out"
                  style={{
                    width: `${Math.min(100, p)}%`,
                    background: `linear-gradient(90deg, ${accent.bar}, ${accent.bar}aa)`,
                    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.20)`,
                  }}
                />
              </div>
              <div className="flex justify-between font-mono text-[11px] uppercase tracking-[0.12em] text-muted mt-1.5 tabular-nums">
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
