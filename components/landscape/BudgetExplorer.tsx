"use client";

import { useMemo, useState } from "react";
import type { BudgetLine, BudgetSummary } from "@/lib/db/landscape-kb";

function inr(n: number | string | null | undefined): string {
  const v = Number(n ?? 0);
  if (!v) return "—";
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)} cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)} lakh`;
  return `₹${v.toLocaleString("en-IN")}`;
}

function pct(part: number, whole: number): string {
  if (!whole) return "0%";
  return `${((part / whole) * 100).toFixed(1)}%`;
}

export function BudgetExplorer({
  summary,
  lines,
}: {
  summary: BudgetSummary;
  lines: BudgetLine[];
}) {
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

  const filteredTotals = useMemo(() => {
    const t = {
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
      t.total += Number(l.totalCostInr ?? 0);
      t.govt += Number(l.govtInr ?? 0);
      t.community += Number(l.communityInr ?? 0);
      t.investment += Number(l.investmentRequiredInr ?? 0);
      t.grants += Number(l.grantsInr ?? 0);
      t.returnable += Number(l.returnableGrantInr ?? 0);
      t.outcome += Number(l.outcomeFinanceInr ?? 0);
      t.debt += Number(l.debtInr ?? 0);
      t.households += Number(l.impactHouseholds ?? 0);
      t.hectares += Number(l.impactHectares ?? 0);
      t.animals += Number(l.impactAnimals ?? 0);
    }
    return t;
  }, [filtered]);

  return (
    <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pb-24">
      {/* Top-line totals */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-px bg-line-soft border border-line-soft mt-8">
        <Stat label="Total cost · 7 years" value={inr(filteredTotals.total)} accent="deep-teal" />
        <Stat
          label="Govt convergence"
          value={inr(filteredTotals.govt)}
          sub={pct(filteredTotals.govt, filteredTotals.total)}
        />
        <Stat
          label="Community"
          value={inr(filteredTotals.community)}
          sub={pct(filteredTotals.community, filteredTotals.total)}
        />
        <Stat
          label="Investment required"
          value={inr(filteredTotals.investment)}
          sub={pct(filteredTotals.investment, filteredTotals.total)}
          accent="amber-deep"
        />
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-px bg-line-soft border-x border-b border-line-soft">
        <Stat label="Grants" value={inr(filteredTotals.grants)} subtle />
        <Stat label="Returnable grant" value={inr(filteredTotals.returnable)} subtle />
        <Stat label="Outcome-based" value={inr(filteredTotals.outcome)} subtle />
        <Stat label="Debt" value={inr(filteredTotals.debt)} subtle />
      </section>

      {/* Impact stats */}
      <section className="grid grid-cols-3 gap-px bg-line-soft border border-line-soft mt-px">
        <Stat label="Households reached" value={Math.round(filteredTotals.households).toLocaleString("en-IN")} />
        <Stat label="Hectares" value={Math.round(filteredTotals.hectares).toLocaleString("en-IN")} />
        <Stat label="Animals" value={Math.round(filteredTotals.animals).toLocaleString("en-IN")} />
      </section>

      {/* Filters */}
      <section className="mt-12 flex flex-wrap gap-3 items-end">
        <FilterDropdown label="Category" value={cat} onChange={setCat} options={categories} />
        <FilterDropdown label="Package" value={pkg} onChange={setPkg} options={packages} />
        {(cat || pkg) && (
          <button
            onClick={() => {
              setCat("");
              setPkg("");
            }}
            className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-deep-teal hover:text-teal font-semibold py-2"
          >
            Clear all ×
          </button>
        )}
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted ml-auto self-center">
          {filtered.length} of {lines.length} lines
        </span>
      </section>

      {/* Category and package summary visualisations */}
      {!cat && !pkg && (
        <section className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-10">
          <BreakdownTable
            title="By category"
            rows={summary.byCategory.map((c) => ({
              label: c.category,
              total: c.total,
              investment: c.investment,
            }))}
            grandTotal={summary.totalCostInr}
          />
          <BreakdownTable
            title="By package"
            rows={summary.byPackage.map((p) => ({
              label: p.package,
              total: p.total,
              investment: p.investment,
            }))}
            grandTotal={summary.totalCostInr}
          />
        </section>
      )}

      {/* Line table */}
      <section className="mt-12">
        <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-teal font-semibold mb-3">
          {filtered.length === lines.length ? "All intervention lines" : "Filtered lines"}
        </div>
        <div className="overflow-x-auto border border-line-soft">
          <table className="w-full text-[14px]">
            <thead className="bg-cream">
              <tr className="text-left font-mono uppercase text-[10px] tracking-[0.12em] text-muted">
                <th className="p-3 font-semibold">Category</th>
                <th className="p-3 font-semibold">Intervention</th>
                <th className="p-3 font-semibold">Package</th>
                <th className="p-3 font-semibold text-right">Total</th>
                <th className="p-3 font-semibold text-right">Govt</th>
                <th className="p-3 font-semibold text-right">Investment</th>
                <th className="p-3 font-semibold text-right">HH</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-t border-line-soft hover:bg-teal-wash/30">
                  <td className="p-3 align-top">
                    <div className="font-serif text-ink">{l.category ?? "—"}</div>
                    {l.subintervention && (
                      <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted mt-1">
                        {l.subintervention}
                      </div>
                    )}
                  </td>
                  <td className="p-3 align-top font-serif text-ink-soft">
                    {l.intervention ?? "—"}
                  </td>
                  <td className="p-3 align-top font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">
                    {l.package ?? "—"}
                  </td>
                  <td className="p-3 align-top text-right font-mono tabular-nums text-deep-teal">
                    {inr(l.totalCostInr)}
                  </td>
                  <td className="p-3 align-top text-right font-mono tabular-nums text-teal">
                    {inr(l.govtInr)}
                  </td>
                  <td className="p-3 align-top text-right font-mono tabular-nums text-amber-deep">
                    {inr(l.investmentRequiredInr)}
                  </td>
                  <td className="p-3 align-top text-right font-mono tabular-nums text-ink-soft">
                    {l.impactHouseholds ? Math.round(Number(l.impactHouseholds)).toLocaleString("en-IN") : "—"}
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

function Stat({
  label,
  value,
  sub,
  accent,
  subtle,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "deep-teal" | "amber-deep";
  subtle?: boolean;
}) {
  const colour =
    accent === "amber-deep" ? "text-amber-deep" : accent === "deep-teal" ? "text-deep-teal" : "text-ink";
  return (
    <div className={`bg-paper p-5 sm:p-6 ${subtle ? "opacity-90" : ""}`}>
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{label}</span>
      <div className={`font-serif text-[22px] sm:text-[26px] font-medium leading-none tracking-[-0.02em] mt-2 ${colour}`}>
        {value}
      </div>
      {sub && <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted mt-1">{sub}</div>}
    </div>
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
        className="px-3 py-2 bg-cream border border-line rounded-[2px] font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft focus:outline-2 focus:outline-teal"
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

function BreakdownTable({
  title,
  rows,
  grandTotal,
}: {
  title: string;
  rows: { label: string; total: number; investment: number }[];
  grandTotal: number;
}) {
  return (
    <div>
      <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-teal font-semibold mb-3">{title}</div>
      <ul className="list-none p-0 m-0 flex flex-col gap-2">
        {rows.map((r) => {
          const p = grandTotal ? (r.total / grandTotal) * 100 : 0;
          return (
            <li key={r.label}>
              <div className="flex justify-between items-baseline gap-3 text-[14px]">
                <span className="font-serif text-ink truncate">{r.label}</span>
                <span className="font-mono tabular-nums text-deep-teal whitespace-nowrap">{inr(r.total)}</span>
              </div>
              <div className="mt-1 h-1.5 bg-line-soft rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal"
                  style={{ width: `${Math.min(100, p)}%` }}
                />
              </div>
              <div className="flex justify-between font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted mt-1">
                <span>{p.toFixed(1)}% of total</span>
                <span>investment: {inr(r.investment)}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
