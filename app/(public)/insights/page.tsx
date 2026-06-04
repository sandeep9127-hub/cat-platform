import { notFound } from "next/navigation";
import Link from "next/link";
import { INSIGHTS_ENABLED } from "@/lib/flags";
import { landscapeInsights } from "@/lib/db/landscape-kb";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { Counter } from "@/components/insights/Counter";
import { DownloadButton } from "@/components/insights/DownloadButton";
import { Treemap, type TreeItem } from "@/components/insights/Treemap";
import { Donut } from "@/components/insights/Donut";
import { Scatter, type Point } from "@/components/insights/Scatter";
import { MapPin, ArrowRight, Layers, FlaskConical } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export const metadata = {
  title: "Insights",
  description:
    "Landscape deep-dives for the Transformation Hub. Structured, source-verified investment data, visualised.",
};

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

export default async function InsightsPage() {
  if (!INSIGHTS_ENABLED) notFound();

  const slug = "patratu";
  const data = await landscapeInsights(slug);
  const profile = LANDSCAPES[slug];
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
  ];
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

  return (
    <article className="pb-24">
      {/* ───────────────────────── HERO ───────────────────────── */}
      <section className="relative overflow-hidden bg-ink text-paper">
        <div
          aria-hidden
          className="absolute inset-0 opacity-90 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 55% 50% at 6% -8%, rgba(248,202,124,0.20), transparent 60%), radial-gradient(ellipse 65% 60% at 102% 112%, rgba(46,117,115,0.42), transparent 64%)",
          }}
        />
        <div className="relative max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-14 sm:pt-20 lg:pt-24 pb-12 lg:pb-16">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-amber mb-5">
            <FlaskConical size={12} strokeWidth={1.8} aria-hidden />
            Insights · Landscape deep-dive
          </div>
          <h1 className="font-serif text-[40px] sm:text-[56px] lg:text-[64px] leading-[1.02] tracking-[-0.025em] max-w-[18ch]">
            Patratu, <span className="italic font-normal text-amber">by the numbers</span>.
          </h1>
          <p className="mt-5 max-w-[62ch] text-[15.5px] sm:text-[16.5px] leading-[1.6] text-[#fbf8f2cc]">
            A four-year investment plan to move {profile.households} households in{" "}
            {profile.district} toward a resilient, circular farm economy. Every figure below
            is read straight from the costed plan, structured and source-verified.
          </p>

          <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-7">
            {[
              { v: cr(totals.total), dec: 2, pre: "₹", suf: " Cr", lab: "Total plan" },
              { v: digits(profile.households), dec: 0, lab: "Households", suf: "" },
              { v: digits(profile.villages), dec: 0, lab: "Villages", suf: "" },
              { v: digits(profile.area), dec: 0, lab: "Landscape (ha)", suf: "" },
              { v: byCategory.length, dec: 0, lab: "Categories", suf: "" },
              { v: byPackage.length, dec: 0, lab: "Packages", suf: "" },
            ].map((s, i) => (
              <div key={i}>
                <div className="font-serif text-[30px] sm:text-[34px] leading-none tracking-[-0.02em] text-paper tabular-nums">
                  <Counter value={s.v} decimals={s.dec} prefix={s.pre ?? ""} suffix={s.suf} />
                </div>
                <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#fbf8f299]">
                  {s.lab}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-9 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#fbf8f2aa]">
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={11} strokeWidth={1.8} className="text-amber" aria-hidden />
              {profile.region}
            </span>
            <span className="text-[#fbf8f255]">/</span>
            <span>NABARD JIVA → CAT landscape</span>
          </div>
        </div>
      </section>

      {/* ──────────────── WHERE THE MONEY GOES (treemap) ──────────────── */}
      <Section
        eyebrow="Allocation"
        title="Where the"
        italic="₹54.88 crore"
        tail="goes"
        intro="The plan is costed across eleven intervention categories. Area is proportional to total cost. Three quarters of the budget sits in farming systems, livestock, and private-land natural-resource work."
      >
        <div className="rounded-[12px] overflow-hidden border border-line bg-paper p-2 sm:p-3">
          <Treemap items={treeItems} />
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted max-w-[52ch]">
            Top three categories carry {pctOfTotal(byCategory, totals.total)}% of the plan.
          </p>
          <DownloadButton rows={csvRows} filename="patratu-investment-plan.csv" />
        </div>
      </Section>

      {/* ──────────────── HOW IT'S FINANCED ──────────────── */}
      <Section
        eyebrow="Financing"
        title="How it gets"
        italic="paid for"
        intro="Only a fifth of the plan is already covered by government schemes and community contribution. The rest — the real ask — has to be mobilised, and the plan is explicit about the blend of instruments it expects to use."
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-8 lg:gap-12 items-start">
          {/* who carries it — segmented bar */}
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
            <p className="mt-5 text-[13.5px] leading-[1.6] text-ink-soft max-w-[46ch]">
              The <strong className="font-semibold text-deep-teal">₹{cr(totals.investment).toFixed(2)} Cr</strong>{" "}
              to be mobilised is the financing gap this landscape is raising against.
            </p>
          </div>

          {/* instruments — donut */}
          <div>
            <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-deep-teal mb-4">
              The blend it's raising
            </h3>
            <Donut
              segments={instruments}
              centerTop={`₹${cr(totals.investment).toFixed(1)} Cr`}
              centerSub="TO MOBILISE"
            />
          </div>
        </div>
      </Section>

      {/* ──────────────── REACH VS INVESTMENT (scatter) ──────────────── */}
      <Section
        eyebrow="Depth vs breadth"
        title="What each rupee"
        italic="reaches"
        intro="Plotting investment against the land each category covers shows the plan's two speeds: land-heavy work that is costly per hectare, and lighter services that touch many households for little. Bubble size is household engagements across that category's interventions."
      >
        <div className="rounded-[12px] border border-line bg-paper p-3 sm:p-5">
          <Scatter
            points={scatterPoints}
            xLabel="Investment required (₹ crore)"
            yLabel="Hectares reached"
          />
        </div>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-muted max-w-[64ch] leading-relaxed">
          Note: household engagements are cumulative across interventions, so a household
          counts once per package it benefits from — read them as relative intensity, not
          unique people. Unique landscape reach is {profile.households} households.
        </p>
      </Section>

      {/* ──────────────── PACKAGES (ranked bars) ──────────────── */}
      <Section
        eyebrow="Structure"
        title="Ten investment"
        italic="packages"
        intro="The same money, grouped the way the plan is actually delivered, from climate-resilient agriculture down to working capital."
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
                      style={{
                        width: `${(p.total / maxPkg) * 100}%`,
                        background: "linear-gradient(90deg, #2E7573, #4E9C99)",
                      }}
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

      {/* ──────────────── DATA & METHODS ──────────────── */}
      <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 mt-20">
        <div
          className="rounded-[12px] border border-line p-6 sm:p-8"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(251,248,242,1) 0%, rgba(232,240,234,0.6) 100%)",
          }}
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-deep-teal mb-2">
            Data & methods
          </div>
          <h2 className="font-serif text-[24px] sm:text-[28px] tracking-[-0.015em] text-ink max-w-[34ch] leading-[1.15]">
            Built only from the costed plan. No estimates, no scraped numbers.
          </h2>
          <p className="mt-3 text-[14px] leading-[1.65] text-ink-soft max-w-[64ch]">
            Every figure on this page comes from the structured Patratu investment plan
            ({totals.lineCount} costed budget lines), entered and reviewed by hand. That is
            why it carries no caveats the way auto-sourced figures would. As more landscape
            plans are ingested, each gets its own deep-dive here automatically.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <DownloadButton rows={csvRows} filename="patratu-investment-plan.csv" label="Download the dataset (CSV)" />
            <Link
              href={`/landscape/${slug}`}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-4 py-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-deep-teal hover:bg-cream/60 transition-colors"
            >
              <Layers size={13} strokeWidth={1.9} aria-hidden />
              Open the full Patratu plan
            </Link>
            <Link
              href="/agent?scope=patratu"
              className="inline-flex items-center gap-2 rounded-full bg-deep-teal text-paper px-4 py-2 font-mono text-[10.5px] uppercase tracking-[0.14em] hover:bg-teal transition-colors"
            >
              Ask the plan a question
              <ArrowRight size={13} strokeWidth={2} aria-hidden />
            </Link>
          </div>
        </div>
        <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          More landscapes arrive here as their plans are ingested
        </p>
      </section>
    </article>
  );
}

function pctOfTotal(
  byCategory: { total: number }[],
  total: number
): number {
  const top3 = [...byCategory].sort((a, b) => b.total - a.total).slice(0, 3).reduce((s, c) => s + c.total, 0);
  return total > 0 ? Math.round((top3 / total) * 100) : 0;
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
    <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 mt-20 lg:mt-28">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-deep mb-3">
        {eyebrow}
      </div>
      <h2 className="font-serif text-[30px] sm:text-[38px] leading-[1.06] tracking-[-0.02em] text-ink max-w-[20ch]">
        {title} <span className="italic font-normal text-deep-teal">{italic}</span>
        {tail ? ` ${tail}` : ""}.
      </h2>
      <p className="mt-4 mb-8 text-[15px] leading-[1.65] text-ink-soft max-w-[68ch]">
        {intro}
      </p>
      {children}
    </section>
  );
}
