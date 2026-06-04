import Link from "next/link";
import type { LandscapeInsights } from "@/lib/db/landscape-kb";
import type { LandscapeProfile } from "@/lib/data/landscapes";
import { Counter } from "@/components/insights/Counter";
import { DownloadButton } from "@/components/insights/DownloadButton";
import { Treemap, type TreeItem } from "@/components/insights/Treemap";
import { Donut } from "@/components/insights/Donut";
import { Scatter, type Point } from "@/components/insights/Scatter";
import { Layers, ArrowRight } from "lucide-react";

const CAT_COLOR: Record<string, string> = {
  "Agriculture, Horticulture & Agroforestry": "#8C7A5C",
  "Livestock Management": "#C68C2E",
  "NRM Private": "#2E7573",
  "NRM Community": "#3E8E8B",
  "Technical Assistance": "#929CC5",
  Fisheries: "#2C7BD0",
  "Common services for all value chains": "#8A8F98",
  Nutrition: "#C24A2E",
  "Forestry & NTFP": "#5C8C2E",
  Market: "#5C6796",
  Biodiversity: "#2EA37A",
  Uncategorised: "#9AA0A6",
};
const catColor = (c: string) => CAT_COLOR[c] ?? "#8A8F98";
const cr = (n: number) => n / 1e7;
const digits = (s?: string) => Number(String(s ?? "").replace(/[^0-9.]/g, "")) || 0;

export function LandscapeInsightsView({
  slug,
  profile,
  data,
}: {
  slug: string;
  profile: LandscapeProfile;
  data: LandscapeInsights;
}) {
  const { totals, byCategory, byPackage } = data;

  const treeItems: TreeItem[] = byCategory.map((c) => ({
    label: c.category,
    value: c.total,
    color: catColor(c.category),
  }));
  const whoPays = [
    { label: "Government schemes", value: totals.govt, color: "#2E7573" },
    { label: "Community contribution", value: totals.community, color: "#C68C2E" },
    { label: "To be mobilised", value: totals.investment, color: "#5C6796" },
  ];
  const instruments = [
    { label: "Grants", value: totals.grants, color: "#2EA37A" },
    { label: "Debt", value: totals.debt, color: "#B85042" },
    { label: "Returnable grants", value: totals.returnable, color: "#929CC5" },
    { label: "Outcome finance", value: totals.outcome, color: "#C68C2E" },
  ].filter((s) => s.value > 0);
  const whoTotal = totals.total || 1;
  const scatterPoints: Point[] = byCategory
    .filter((c) => c.hectares > 0)
    .map((c) => ({
      label: c.category.replace(" Management", "").replace(", Horticulture & Agroforestry", ""),
      x: cr(c.investment),
      y: c.hectares,
      size: c.householdEngagements,
      color: catColor(c.category),
    }));
  const maxPkg = Math.max(...byPackage.map((p) => p.total), 1);
  const csvRows = data.lines.map((l) => ({
    category: l.category ?? "",
    intervention: l.intervention ?? "",
    package: l.package ?? "",
    total_cost_inr: l.total,
    investment_required_inr: l.investment,
    households: l.households,
    hectares: l.hectares,
  }));
  const top3pct = (() => {
    const t = [...byCategory].sort((a, b) => b.total - a.total).slice(0, 3).reduce((s, c) => s + c.total, 0);
    return totals.total > 0 ? Math.round((t / totals.total) * 100) : 0;
  })();

  const kpis = [
    { v: cr(totals.total), dec: 2, pre: "₹", suf: " Cr", lab: "Total plan" },
    { v: digits(profile.households), dec: 0, lab: "Households", suf: "" },
    { v: digits(profile.villages), dec: 0, lab: "Villages", suf: "" },
    { v: digits(profile.area), dec: 0, lab: "Landscape (ha)", suf: "" },
    { v: byCategory.length, dec: 0, lab: "Categories", suf: "" },
    { v: byPackage.length, dec: 0, lab: "Packages", suf: "" },
  ];

  return (
    <div className="pb-24">
      {/* KPI strip */}
      <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px rounded-[10px] overflow-hidden border border-line bg-line">
          {kpis.map((s, i) => (
            <div key={i} className="bg-paper px-5 py-5">
              <div className="font-serif text-[26px] sm:text-[30px] leading-none tracking-[-0.02em] text-deep-teal tabular-nums">
                <Counter value={s.v} decimals={s.dec} prefix={s.pre ?? ""} suffix={s.suf} />
              </div>
              <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                {s.lab}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Allocation treemap */}
      <Section
        eyebrow="Allocation"
        title="Where the"
        italic={`₹${cr(totals.total).toFixed(2)} crore`}
        tail="goes"
        intro={`The plan is costed across ${byCategory.length} intervention categories; area is proportional to total cost. The top three carry ${top3pct}% of the budget.`}
      >
        <div className="rounded-[12px] overflow-hidden border border-line bg-paper p-2 sm:p-3">
          <Treemap items={treeItems} />
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-end gap-4">
          <DownloadButton rows={csvRows} filename={`${slug}-investment-plan.csv`} />
        </div>
      </Section>

      {/* Financing */}
      <Section
        eyebrow="Financing"
        title="How it gets"
        italic="paid for"
        intro="Government schemes and community contribution cover part of the plan; the rest must be mobilised, across a deliberate blend of instruments."
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-8 lg:gap-12 items-start">
          <div>
            <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-deep-teal mb-4">
              Who carries the cost
            </h3>
            <div className="flex h-12 w-full rounded-[6px] overflow-hidden border border-line">
              {whoPays.map((s, i) => (
                <div
                  key={i}
                  className="h-full flex items-center justify-center"
                  style={{ width: `${(s.value / whoTotal) * 100}%`, background: s.color }}
                  title={`${s.label}: ₹${cr(s.value).toFixed(2)} Cr`}
                >
                  <span className="font-mono text-[10px] text-paper/95 tabular-nums">
                    {Math.round((s.value / whoTotal) * 100)}%
                  </span>
                </div>
              ))}
            </div>
            <ul className="mt-5 space-y-3 list-none p-0">
              {whoPays.map((s, i) => (
                <li key={i} className="flex items-baseline gap-3">
                  <span className="w-3 h-3 rounded-[3px] shrink-0 translate-y-0.5" style={{ background: s.color }} aria-hidden />
                  <span className="text-[14px] text-ink">{s.label}</span>
                  <span className="font-mono text-[11.5px] text-muted tabular-nums ml-auto">
                    ₹{cr(s.value).toFixed(2)} Cr
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-deep-teal mb-4">
              The blend it&apos;s raising
            </h3>
            <Donut
              segments={instruments}
              centerTop={`₹${cr(totals.investment).toFixed(1)} Cr`}
              centerSub="TO MOBILISE"
            />
          </div>
        </div>
      </Section>

      {/* Reach vs investment */}
      {scatterPoints.length > 0 && (
        <Section
          eyebrow="Depth vs breadth"
          title="What each rupee"
          italic="reaches"
          intro="Investment against the land each category covers: land-heavy work that is costly per hectare, versus lighter services that touch many households for little. Bubble size is household engagements."
        >
          <div className="rounded-[12px] border border-line bg-paper p-3 sm:p-5">
            <Scatter points={scatterPoints} xLabel="Investment required (₹ crore)" yLabel="Hectares reached" />
          </div>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-muted max-w-[64ch] leading-relaxed">
            Household engagements are cumulative across interventions — read as relative
            intensity, not unique people. Unique landscape reach is {profile.households} households.
          </p>
        </Section>
      )}

      {/* Packages */}
      <Section
        eyebrow="Structure"
        title={`${numberWord(byPackage.length)} investment`}
        italic="packages"
        intro="The same money, grouped the way the plan is actually delivered."
      >
        <ul className="space-y-3 list-none p-0">
          {byPackage.map((p, i) => {
            const label = p.package.replace(/^PACKAGE\s*\d+:\s*/i, "");
            const num = p.package.match(/PACKAGE\s*(\d+)/i)?.[1] ?? String(i + 1);
            return (
              <li key={i} className="grid grid-cols-[2rem_1fr] sm:grid-cols-[2rem_minmax(0,16rem)_1fr] items-center gap-3 sm:gap-4">
                <span className="font-mono text-[11px] text-muted tabular-nums">P{num}</span>
                <span className="text-[13.5px] text-ink leading-tight">{label}</span>
                <div className="flex items-center gap-3">
                  <div className="h-[22px] rounded-[4px] flex-1 bg-cream/60 overflow-hidden">
                    <div
                      className="h-full rounded-[4px]"
                      style={{ width: `${(p.total / maxPkg) * 100}%`, background: "linear-gradient(90deg, #2E7573, #4E9C99)" }}
                    />
                  </div>
                  <span className="font-mono text-[11.5px] text-deep-teal tabular-nums w-[72px] text-right shrink-0">
                    ₹{cr(p.total).toFixed(2)} Cr
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* Data & methods */}
      <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 mt-20">
        <div
          className="rounded-[12px] border border-line p-6 sm:p-8"
          style={{ backgroundImage: "linear-gradient(180deg, rgba(251,248,242,1) 0%, rgba(232,240,234,0.6) 100%)" }}
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-deep-teal mb-2">
            Data &amp; methods
          </div>
          <h2 className="font-serif text-[22px] sm:text-[26px] tracking-[-0.015em] text-ink max-w-[36ch] leading-[1.15]">
            Built only from the costed plan. No estimates, no scraped numbers.
          </h2>
          <p className="mt-3 text-[14px] leading-[1.65] text-ink-soft max-w-[64ch]">
            Every figure comes from the structured {profile.name} investment plan
            ({totals.lineCount} costed budget lines), entered and reviewed by hand.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <DownloadButton rows={csvRows} filename={`${slug}-investment-plan.csv`} label="Download the dataset (CSV)" />
            <Link
              href={`/landscape/${slug}/budget`}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-4 py-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-deep-teal hover:bg-cream/60 transition-colors"
            >
              <Layers size={13} strokeWidth={1.9} aria-hidden />
              Explore line-by-line
            </Link>
            <Link
              href={`/landscape/${slug}/ask`}
              className="inline-flex items-center gap-2 rounded-full bg-deep-teal text-paper px-4 py-2 font-mono text-[10.5px] uppercase tracking-[0.14em] hover:bg-teal transition-colors"
            >
              Ask the plan a question
              <ArrowRight size={13} strokeWidth={2} aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function numberWord(n: number): string {
  const w = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];
  return w[n] ?? String(n);
}

function Section({
  eyebrow,
  title,
  italic,
  tail,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  italic: string;
  tail?: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 mt-16 lg:mt-20">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-deep mb-3">{eyebrow}</div>
      <h2 className="font-serif text-[28px] sm:text-[34px] leading-[1.06] tracking-[-0.02em] text-ink max-w-[20ch]">
        {title} <span className="italic font-normal text-deep-teal">{italic}</span>
        {tail ? ` ${tail}` : ""}.
      </h2>
      <p className="mt-4 mb-8 text-[15px] leading-[1.65] text-ink-soft max-w-[68ch]">{intro}</p>
      {children}
    </section>
  );
}
