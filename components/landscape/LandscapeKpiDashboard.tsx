"use client";

import { useMemo, useState } from "react";
import {
  Mountain,
  Users,
  Coins,
  type LucideIcon,
} from "lucide-react";

type Lens = "land" | "people" | "money";

export type KpiDashboardProps = {
  landscapeName: string;
  district: string;
  region: string;
  state: string;
  agroclimaticZone: string;
  area: string;
  population: string;
  households: string;
  villages: string;
  keyChallengesCount: number;
  lipStatus: "published" | "in_preparation";
  /** Present only when the LIP is ingested. */
  money?: {
    totalCostInr: number;
    investmentRequiredInr: number;
    govtInr: number;
    communityInr: number;
    horizonYears: number;
    interventionLines: number;
    topCategories: { category: string; total: number }[];
    indexedDocuments: number;
  };
};

function inrShort(n: number): string {
  if (!n || !isFinite(n)) return "—";
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(n >= 1e8 ? 0 : 1)} cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function pct(part: number, whole: number): string {
  if (!whole) return "—";
  const p = Math.round((part / whole) * 100);
  return `${p}%`;
}

export function LandscapeKpiDashboard(props: KpiDashboardProps) {
  const hasMoney = Boolean(props.money);
  const [lens, setLens] = useState<Lens>(hasMoney ? "money" : "land");

  const tiles = useMemo(() => {
    if (lens === "land") {
      return [
        { label: "Geographical area", value: props.area, sub: "Total landscape extent" },
        { label: "Inhabited villages", value: props.villages, sub: props.district },
        { label: "Agroclimatic zone", value: shortZone(props.agroclimaticZone), sub: "Per Planning Commission" },
        { label: "Region", value: props.region.split(",")[0]?.trim() ?? props.region, sub: props.state },
        { label: "Key challenges", value: String(props.keyChallengesCount), sub: "Per CAT diagnostic" },
        { label: "LIP status", value: props.lipStatus === "published" ? "Published" : "In preparation", sub: props.lipStatus === "published" ? "Editorial review complete" : "Draft in review" },
      ];
    }
    if (lens === "people") {
      const hhNum = parseIndianNumber(props.households);
      const popNum = parseIndianNumber(props.population);
      const avgSize = hhNum && popNum ? (popNum / hhNum).toFixed(1) : "—";
      return [
        { label: "Population", value: props.population, sub: "Per Census tabulation" },
        { label: "Households", value: props.households, sub: "Primary planning unit" },
        { label: "Average household size", value: avgSize, sub: "Persons per household" },
        { label: "Inhabited villages", value: props.villages, sub: "Settlement count" },
        { label: "District", value: props.district.replace(/ district$/i, ""), sub: props.state },
        { label: "Region", value: props.region.split(",")[0]?.trim() ?? props.region, sub: "Agroecological belt" },
      ];
    }
    // money
    const m = props.money;
    if (!m) {
      return Array(6).fill(0).map(() => ({ label: "—", value: "—", sub: "LIP not yet ingested" }));
    }
    return [
      { label: "Total plan size", value: inrShort(m.totalCostInr), sub: `${m.horizonYears}-year programme` },
      { label: "External investment required", value: inrShort(m.investmentRequiredInr), sub: pct(m.investmentRequiredInr, m.totalCostInr) + " of plan" },
      { label: "Government convergence", value: inrShort(m.govtInr), sub: pct(m.govtInr, m.totalCostInr) + " of plan" },
      { label: "Community contribution", value: inrShort(m.communityInr), sub: pct(m.communityInr, m.totalCostInr) + " of plan" },
      { label: "Intervention lines", value: String(m.interventionLines), sub: "Costed sub-activities" },
      { label: "Library documents", value: String(m.indexedDocuments), sub: "Indexed for Ask" },
    ];
  }, [lens, props]);

  return (
    <section className="mt-10 lg:mt-14">
      <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10">
        {/* Slicer + title */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-5">
          <div>
            <span className="eyebrow">Landscape dashboard</span>
            <h2 className="font-serif text-[26px] sm:text-[30px] tracking-[-0.018em] text-ink mt-2 leading-[1.15]">
              {props.landscapeName} at a glance
            </h2>
          </div>
          <LensSlicer lens={lens} setLens={setLens} hasMoney={hasMoney} />
        </div>

        {/* KPI grid — floating tiles */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {tiles.map((t, i) => (
            <KpiTile key={`${lens}-${i}`} label={t.label} value={t.value} sub={t.sub} accent={lens} />
          ))}
        </div>

        {/* Money lens extra: top categories bar */}
        {lens === "money" && props.money && props.money.topCategories.length > 0 && (
          <TopCategoriesBar
            topCategories={props.money.topCategories}
            totalCostInr={props.money.totalCostInr}
          />
        )}

        {/* Land lens extra: challenge intensity ring */}
        {lens === "land" && (
          <p className="mt-5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted">
            <span className="text-amber-deep">●</span> Numbers as published in CAT Landscape Profiles, Feb 2026.
          </p>
        )}

        {/* People lens extra: */}
        {lens === "people" && (
          <p className="mt-5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted">
            <span className="text-teal">●</span> Population and household counts are point-in-time. CAT works
            at landscape scale, not activity scale.
          </p>
        )}
      </div>
    </section>
  );
}

function LensSlicer({
  lens,
  setLens,
  hasMoney,
}: {
  lens: Lens;
  setLens: (l: Lens) => void;
  hasMoney: boolean;
}) {
  const items: { id: Lens; label: string; Icon: LucideIcon; disabled?: boolean; hint?: string }[] = [
    { id: "land", label: "Land", Icon: Mountain },
    { id: "people", label: "People", Icon: Users },
    {
      id: "money",
      label: "Money",
      Icon: Coins,
      disabled: !hasMoney,
      hint: hasMoney ? undefined : "Available once the LIP is ingested",
    },
  ];
  return (
    <div
      role="tablist"
      aria-label="Switch dashboard lens"
      className="inline-flex border border-line rounded-[3px] overflow-hidden self-start sm:self-end bg-paper shadow-[0_1px_0_rgba(0,0,0,0.02)]"
    >
      {items.map(({ id, label, Icon, disabled, hint }) => {
        const active = lens === id;
        const base =
          "px-3.5 py-2 font-mono text-[10.5px] uppercase tracking-[0.16em] border-r border-line last:border-r-0 transition-colors inline-flex items-center gap-1.5";
        const state = disabled
          ? "text-line cursor-not-allowed"
          : active
            ? "bg-gradient-to-br from-deep-teal to-teal text-paper font-semibold"
            : "text-deep-teal hover:bg-line-soft";
        return (
          <button
            key={id}
            role="tab"
            aria-selected={active}
            disabled={disabled}
            title={hint}
            onClick={() => !disabled && setLens(id)}
            className={`${base} ${state}`}
          >
            <Icon size={12} strokeWidth={1.8} aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}

function KpiTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent: Lens;
}) {
  // Lens-aware brand accent for the top bar, spotlight, and shadow tint.
  const tone =
    accent === "money"
      ? {
          bar: "#C68C2E",
          soft: "rgba(248,202,124,0.14)",
          glow: "rgba(248,202,124,0.28)",
        }
      : accent === "people"
        ? {
            bar: "#2E7573",
            soft: "rgba(46,117,115,0.09)",
            glow: "rgba(46,117,115,0.18)",
          }
        : {
            bar: "#929CC5",
            soft: "rgba(146,156,197,0.12)",
            glow: "rgba(146,156,197,0.22)",
          };

  return (
    <div
      className="group relative overflow-hidden rounded-[6px] border border-line bg-paper py-5 px-4 sm:px-5 flex flex-col gap-2 min-h-[116px] transition-all duration-300 ease-out hover:-translate-y-0.5"
      style={{
        boxShadow: `0 1px 2px rgba(26,38,37,0.04), 0 8px 20px -12px ${tone.glow}`,
        backgroundImage: `linear-gradient(180deg, rgba(251,248,242,1) 0%, ${tone.soft} 100%)`,
      }}
    >
      <span
        aria-hidden
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: `linear-gradient(90deg, ${tone.bar} 0%, ${tone.bar}cc 60%, transparent 100%)`,
        }}
      />
      <span
        aria-hidden
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 90% 70% at 100% 100%, ${tone.glow}, transparent 65%)`,
        }}
      />
      <span className="relative font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted leading-tight">
        {label}
      </span>
      <div className="relative font-serif text-[22px] sm:text-[26px] leading-none tracking-[-0.018em] text-deep-teal font-medium">
        {value}
      </div>
      <span className="relative font-serif text-[12.5px] italic text-muted leading-snug">{sub}</span>
    </div>
  );
}

function TopCategoriesBar({
  topCategories,
  totalCostInr,
}: {
  topCategories: { category: string; total: number }[];
  totalCostInr: number;
}) {
  const top = topCategories.slice(0, 4);
  const max = Math.max(...top.map((c) => c.total), 1);
  return (
    <div className="mt-7 border-l-2 border-amber-deep pl-5">
      <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-teal font-semibold block mb-3">
        Top intervention categories by spend
      </span>
      <ul className="list-none p-0 m-0 flex flex-col gap-3">
        {top.map((c, i) => (
          <li key={c.category + i} className="grid grid-cols-[1fr_auto] gap-x-4 items-baseline">
            <div className="min-w-0">
              <div className="font-serif text-[14px] text-ink leading-tight truncate">
                {c.category}
              </div>
              <div className="mt-1.5 h-[6px] bg-line-soft rounded-[1px] overflow-hidden">
                <div
                  className="h-full bg-deep-teal"
                  style={{ width: `${(c.total / max) * 100}%` }}
                />
              </div>
            </div>
            <div className="font-serif text-[14px] text-deep-teal font-medium tabular-nums">
              {inrShort(c.total)}{" "}
              <span className="font-mono text-[10px] text-muted tracking-[0.12em]">
                · {pct(c.total, totalCostInr)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function shortZone(zone: string): string {
  // Take the first short clause before a comma or em-equivalent.
  const head = zone.split(/[,.]/)[0]?.trim() ?? zone;
  return head.length > 36 ? head.slice(0, 34) + "…" : head;
}

function parseIndianNumber(s: string): number {
  if (!s) return 0;
  const cleaned = s.replace(/,/g, "").replace(/\s/g, "").toLowerCase();
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  if (cleaned.includes("crore") || cleaned.endsWith("cr")) return num * 1e7;
  if (cleaned.includes("lakh") || cleaned.endsWith("l")) return num * 1e5;
  return num;
}
