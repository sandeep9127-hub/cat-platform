import { notFound } from "next/navigation";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { LandscapeTabs } from "@/components/landscape/LandscapeTabs";
import { landscapeHasLip, landscapeInsights, landscapeHasClimate } from "@/lib/db/landscape-kb";
import { LandscapeInsightsView } from "@/components/landscape/LandscapeInsightsView";

// ISR: cache the rendered page at the edge (revalidate every 5 min). These
// pages read DB data only (no per-request searchParams/cookies/headers), so
// static-with-revalidation is correct and avoids the slow per-request SSR that
// gave ~5s TTFB. New publishes appear within the window.
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = LANDSCAPES[slug];
  return { title: p ? `${p.name} · Insights` : "Landscape insights" };
}

export default async function InsightsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = LANDSCAPES[slug];
  if (!p) notFound();

  const [hasLip, hasClimate] = await Promise.all([landscapeHasLip(slug), landscapeHasClimate(slug)]);

  return (
    <>
      <header className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-10 sm:pt-14 lg:pt-16 pb-6">
        <div className="flex items-center gap-3 mb-4 font-mono text-[10.5px] uppercase tracking-[0.16em] text-teal font-semibold flex-wrap">
          <a href="/landscapes" className="hover:text-teal-soft">CAT Landscapes</a>
          <span className="text-line">/</span>
          <span className="text-ink-soft font-normal tracking-[0.14em]">{p.name}</span>
        </div>
        <h1 className="font-sans font-semibold text-[clamp(38px,4.4vw,64px)] leading-[1.02] tracking-[-0.035em] text-ink">
          {p.name} · <span className="text-teal">Insights</span>
        </h1>
        <p className="text-[17px] sm:text-[19px] text-ink-soft leading-[1.55] tracking-[-0.01em] mt-5 max-w-[58ch]">
          The {p.name} investment plan, visualised. Every figure is read straight from the
          costed plan, structured and reviewed by hand.
        </p>
      </header>

      <LandscapeTabs slug={slug} active="insights" hasLip={hasLip} hasClimate={hasClimate} />

      {hasLip ? (
        <LandscapeInsightsView slug={slug} profile={p} data={await landscapeInsights(slug)} />
      ) : (
        <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 py-16">
          <p className="text-ink-soft leading-[1.55] tracking-[-0.01em] text-[18px] max-w-[46ch]">
            The {p.name} Landscape Investment Plan is in preparation. Its insights dashboard
            will appear here once the plan is published and uploaded.
          </p>
        </section>
      )}
    </>
  );
}
