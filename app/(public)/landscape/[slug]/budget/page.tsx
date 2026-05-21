import { notFound } from "next/navigation";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { LandscapeTabs } from "@/components/landscape/LandscapeTabs";
import { budgetSummary, listBudgetLines, landscapeHasLip } from "@/lib/db/landscape-kb";
import { BudgetExplorer } from "@/components/landscape/BudgetExplorer";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = LANDSCAPES[slug];
  return { title: p ? `${p.name} · Budget` : "Landscape budget" };
}

export default async function BudgetPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = LANDSCAPES[slug];
  if (!p) notFound();

  const hasLip = await landscapeHasLip(slug);
  if (!hasLip) {
    return (
      <>
        <header className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-10 sm:pt-14 lg:pt-16 pb-6">
          <div className="flex items-center gap-3 mb-4 font-mono text-[10.5px] uppercase tracking-[0.16em] text-teal font-semibold flex-wrap">
            <a href="/landscapes" className="hover:text-teal-soft">CAT Landscapes</a>
            <span className="text-line">/</span>
            <span className="text-ink-soft font-normal tracking-[0.14em]">{p.name}</span>
          </div>
          <h1 className="font-serif font-normal text-[clamp(38px,4.4vw,64px)] leading-[1.05] tracking-[-0.022em] text-ink">
            {p.name} · <em className="italic text-teal not-italic" style={{ fontStyle: "italic" }}>Budget</em>
          </h1>
        </header>
        <LandscapeTabs slug={slug} active="budget" hasLip={hasLip} />
        <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 py-16">
          <p className="font-serif italic text-ink-soft text-[18px] max-w-[44ch]">
            The {p.name} Landscape Investment Plan is in preparation. The interactive
            budget explorer will land here once the investment plan is published and uploaded.
          </p>
        </section>
      </>
    );
  }

  const [summary, lines] = await Promise.all([budgetSummary(slug), listBudgetLines(slug)]);

  return (
    <>
      <header className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-10 sm:pt-14 lg:pt-16 pb-6">
        <div className="flex items-center gap-3 mb-4 font-mono text-[10.5px] uppercase tracking-[0.16em] text-teal font-semibold flex-wrap">
          <a href="/landscapes" className="hover:text-teal-soft">CAT Landscapes</a>
          <span className="text-line">/</span>
          <span className="text-ink-soft font-normal tracking-[0.14em]">{p.name}</span>
        </div>
        <h1 className="font-serif font-normal text-[clamp(38px,4.4vw,64px)] leading-[1.05] tracking-[-0.022em] text-ink">
          {p.name} · <em className="italic text-teal not-italic" style={{ fontStyle: "italic" }}>Budget</em>
        </h1>
        <p className="font-serif italic text-[17px] sm:text-[19px] text-ink-soft leading-[1.5] mt-5 max-w-[58ch] font-light">
          Every intervention costed in the {p.name} investment plan. Filter by package, category, or
          funding mechanism. Numbers are 7-year totals across {lines.length} intervention
          lines unless filtered.
        </p>
      </header>

      <LandscapeTabs slug={slug} active="budget" hasLip={hasLip} />

      <BudgetExplorer summary={summary} lines={lines} />
    </>
  );
}
