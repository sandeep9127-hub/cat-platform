import { notFound } from "next/navigation";
import { RequestTableCta } from "@/components/landscape/RequestTableCta";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { LandscapeTabs } from "@/components/landscape/LandscapeTabs";
import { budgetSummary, listBudgetLines, landscapeHasLip, landscapeHasClimate, type BudgetLine } from "@/lib/db/landscape-kb";
import { BudgetExplorer, type BudgetGroup } from "@/components/landscape/BudgetExplorer";
import { CurrencyProvider } from "@/components/landscape/currency";

// ISR: cache the rendered page at the edge (revalidate every 5 min). These
// pages read DB data only (no per-request searchParams/cookies/headers), so
// static-with-revalidation is correct and avoids the slow per-request SSR that
// gave ~5s TTFB. New publishes appear within the window.
export const revalidate = 300;

// Prerender all known landscapes at build (the slug set is a fixed Record) so
// Vercel serves them as cached ISR pages, not per-request dynamic renders.
export function generateStaticParams() {
  return Object.keys(LANDSCAPES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = LANDSCAPES[slug];
  return { title: p ? `${p.name} · Budget` : "Landscape budget" };
}

export default async function BudgetPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = LANDSCAPES[slug];
  if (!p) notFound();

  const [hasLip, hasClimate] = await Promise.all([landscapeHasLip(slug), landscapeHasClimate(slug)]);
  if (!hasLip) {
    return (
      <>
        <header className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-10 sm:pt-14 lg:pt-16 pb-6">
          <div className="flex items-center gap-3 mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-teal font-semibold flex-wrap">
            <a href="/landscapes" className="hover:text-teal-soft">CAT Landscapes</a>
            <span className="text-line">/</span>
            <span className="text-ink-soft font-normal tracking-[0.14em]">{p.name}</span>
          </div>
          <h1 className="font-sans font-semibold text-[clamp(38px,4.4vw,64px)] tracking-[-0.035em] leading-[1.02] text-ink">
            {p.name} · <span className="text-teal">Budget</span>
          </h1>
        </header>
        <LandscapeTabs slug={slug} active="budget" hasLip={hasLip} hasClimate={hasClimate} />
        <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 py-16">
          <p className="text-ink-soft text-[18px] max-w-[44ch] leading-[1.55] tracking-[-0.01em]">
            The {p.name} Landscape Investment Plan is in preparation. The interactive
            budget explorer will land here once the investment plan is published and uploaded.
          </p>
        </section>
      </>
    );
  }

  const [summary, lines] = await Promise.all([budgetSummary(slug), listBudgetLines(slug)]);
  // The public page shows totals per theme only. Intervention lines are shared on
  // request, so they are summed here and never sent to the browser.
  const groups = groupByCategory(lines);

  return (
    <>
      <header className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-10 sm:pt-14 lg:pt-16 pb-6">
        <div className="flex items-center gap-3 mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-teal font-semibold flex-wrap">
          <a href="/landscapes" className="hover:text-teal-soft">CAT Landscapes</a>
          <span className="text-line">/</span>
          <span className="text-ink-soft font-normal tracking-[0.14em]">{p.name}</span>
        </div>
        <h1 className="font-sans font-semibold text-[clamp(38px,4.4vw,64px)] tracking-[-0.035em] leading-[1.02] text-ink">
          {p.name} · <span className="text-teal">Budget</span>
        </h1>
        <p className="text-[17px] sm:text-[19px] text-ink-soft leading-[1.55] tracking-[-0.01em] mt-5 max-w-[58ch]">
          What the {p.name} investment plan costs, who funds it and what it reaches on the
          ground, by theme. Numbers are 7-year totals. The intervention-by-intervention table is
          shared on request.
        </p>
        <RequestTableCta slug={slug} className="mt-6" />
      </header>

      <LandscapeTabs slug={slug} active="budget" hasLip={hasLip} hasClimate={hasClimate} />

      <CurrencyProvider>
        <BudgetExplorer summary={summary} groups={groups} slug={slug} />
      </CurrencyProvider>
    </>
  );
}

function groupByCategory(lines: BudgetLine[]): BudgetGroup[] {
  const by = new Map<string, BudgetGroup>();
  const n = (v: string | null) => Number(v ?? 0) || 0;
  for (const l of lines) {
    const key = l.category ?? "Other";
    const g = by.get(key) ?? {
      category: key, total: 0, govt: 0, community: 0, investment: 0, grants: 0, returnable: 0,
      outcome: 0, debt: 0, households: 0, hectares: 0, animals: 0,
    };
    g.total += n(l.totalCostInr);
    g.govt += n(l.govtInr);
    g.community += n(l.communityInr);
    g.investment += n(l.investmentRequiredInr);
    g.grants += n(l.grantsInr);
    g.returnable += n(l.returnableGrantInr);
    g.outcome += n(l.outcomeFinanceInr);
    g.debt += n(l.debtInr);
    g.households += n(l.impactHouseholds);
    g.hectares += n(l.impactHectares);
    g.animals += n(l.impactAnimals);
    by.set(key, g);
  }
  return [...by.values()];
}
