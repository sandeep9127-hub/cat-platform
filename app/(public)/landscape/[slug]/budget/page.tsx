import Link from "next/link";
import { notFound } from "next/navigation";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { LandscapeTabs } from "@/components/landscape/LandscapeTabs";
import { landscapeHasLip, landscapeHasClimate } from "@/lib/db/landscape-kb";
import { getLandscapeSummary } from "@/lib/dashboards/landscapes-phase1/sheet";
import { LandscapeBudgetSummary } from "@/components/dashboards/landscapes-phase1/LandscapeSummary";

/**
 * A landscape's public Budget tab: its own Phase 1 figures from the
 * All-Landscape Phase 1 sheet (the same data as the investment dashboard), in
 * the dashboard's design. No other landscapes, no comparisons, no cost lines;
 * those are in the full dashboard, shared on request. A landscape the sheet
 * doesn't cover (e.g. Pangi) keeps its "in preparation" note.
 */
// ISR: the sheet itself is cached for 10 minutes; the page re-renders every 5.
export const revalidate = 300;

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
  if (!Object.hasOwn(LANDSCAPES, slug)) notFound();
  const p = LANDSCAPES[slug];

  const [hasLip, hasClimate, summary] = await Promise.all([landscapeHasLip(slug), landscapeHasClimate(slug), getLandscapeSummary(slug)]);

  const header = (
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
  );

  if (summary.ok && summary.data) {
    return (
      <>
        {header}
        <LandscapeTabs slug={slug} active="budget" hasLip={hasLip} hasClimate={hasClimate} />
        <div className="max-w-page mx-auto px-0 sm:px-2 lg:px-5 pb-16 pt-6">
          <LandscapeBudgetSummary slug={slug} name={p.name} data={summary.data} />
        </div>
      </>
    );
  }

  return (
    <>
      {header}
      <LandscapeTabs slug={slug} active="budget" hasLip={hasLip} hasClimate={hasClimate} />
      <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 py-16 space-y-5">
        {summary.ok ? (
          <p className="text-ink-soft text-[18px] max-w-[44ch] leading-[1.55] tracking-[-0.01em]">
            The {p.name} Landscape Investment Plan is in preparation. Its budget will appear here once the plan is published.
          </p>
        ) : (
          <p className="text-ink-soft text-[18px] max-w-[52ch] leading-[1.55] tracking-[-0.01em]">
            The {p.name} budget figures couldn&apos;t load just now. Please try again in a few minutes.
          </p>
        )}
        <Link href="/dashboards/landscapes-phase-1" className="inline-flex font-mono text-[11px] uppercase tracking-[0.14em] text-teal hover:text-deep-teal">
          The investment dashboard, all landscapes →
        </Link>
      </section>
    </>
  );
}
