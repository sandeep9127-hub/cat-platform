import { notFound } from "next/navigation";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { LandscapeTabs } from "@/components/landscape/LandscapeTabs";
import {
  climateSummary,
  climateViews,
  landscapeHasClimate,
  landscapeHasLip,
  budgetSummary,
} from "@/lib/db/landscape-kb";
import { CurrencyProvider, CurrencyToggle } from "@/components/landscape/currency";
import { LandscapeClimate } from "@/components/landscape/LandscapeClimate";
import { LandscapeClimateViews } from "@/components/landscape/LandscapeClimateViews";

// ISR: cache the rendered page at the edge (revalidate every 5 min). These
// pages read DB data only (no per-request searchParams/cookies/headers), so
// static-with-revalidation is correct and avoids the slow per-request SSR that
// gave ~5s TTFB. New publishes appear within the window.
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = LANDSCAPES[slug];
  return { title: p ? `${p.name} · Climate value` : "Landscape climate value" };
}

export default async function ClimatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = LANDSCAPES[slug];
  if (!p) notFound();

  const [hasLip, hasClimate] = await Promise.all([landscapeHasLip(slug), landscapeHasClimate(slug)]);

  const Header = (
    <header className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-10 sm:pt-14 lg:pt-16 pb-6">
      <div className="flex items-center gap-3 mb-4 font-mono text-[10.5px] uppercase tracking-[0.16em] text-teal font-semibold flex-wrap">
        <a href="/landscapes" className="hover:text-teal-soft">CAT Landscapes</a>
        <span className="text-line">/</span>
        <span className="text-ink-soft font-normal tracking-[0.14em]">{p.name}</span>
      </div>
      <h1 className="font-sans font-semibold text-[clamp(38px,4.4vw,64px)] tracking-[-0.035em] leading-[1.02] text-ink">
        {p.name} · <span className="text-teal">Climate value</span>
      </h1>
      <p className="text-[17px] sm:text-[19px] text-ink-soft leading-[1.55] tracking-[-0.01em] mt-5 max-w-[60ch]">
        What seven years of the {p.name} plan is worth to the climate — and to the families who
        farm it. These are modelled estimates: a sense of scale, not cash in hand.
      </p>
    </header>
  );

  if (!hasClimate) {
    return (
      <>
        {Header}
        <LandscapeTabs slug={slug} active="climate" hasLip={hasLip} hasClimate={hasClimate} />
        <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 py-16">
          <p className="text-ink-soft text-[18px] max-w-[46ch] leading-[1.55] tracking-[-0.01em]">
            The climate valuation for {p.name} is in preparation. It will appear here once the
            landscape&apos;s climate valuation is complete.
          </p>
        </section>
      </>
    );
  }

  const [climate, views, money] = await Promise.all([
    climateSummary(slug),
    climateViews(slug),
    hasLip ? budgetSummary(slug) : Promise.resolve(null),
  ]);

  return (
    <CurrencyProvider>
      <header className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-10 sm:pt-14 lg:pt-16 pb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.16em] text-teal font-semibold flex-wrap">
            <a href="/landscapes" className="hover:text-teal-soft">CAT Landscapes</a>
            <span className="text-line">/</span>
            <span className="text-ink-soft font-normal tracking-[0.14em]">{p.name}</span>
          </div>
          <div className="shrink-0">
            <CurrencyToggle />
          </div>
        </div>
        <h1 className="font-sans font-semibold text-[clamp(38px,4.4vw,64px)] tracking-[-0.035em] leading-[1.02] text-ink">
          {p.name} · <span className="text-teal">Climate value</span>
        </h1>
        <p className="text-[17px] sm:text-[19px] text-ink-soft leading-[1.55] tracking-[-0.01em] mt-5 max-w-[60ch]">
          What the {p.name} plan is worth to the climate — valued across carbon, adaptation and
          resilience on tiered evidence, from local programme data to IPCC methods. Modelled value,
          not a cash return.
        </p>
      </header>
      <LandscapeTabs slug={slug} active="climate" hasLip={hasLip} hasClimate={hasClimate} />
      {climate && (
        <>
          <LandscapeClimate
            landscapeName={p.name}
            total={climate.totalInr}
            mitigation={climate.mitigationInr}
            adaptation={climate.adaptationInr}
            resilience={climate.resilienceInr}
            carbonTco2e={climate.carbonTco2e7yr}
            ghgTotalTco2e={climate.ghgTotalTco2e}
            cobenefitInr={climate.cobenefitTotalInr}
            planCostInr={money?.totalCostInr ?? 0}
            modelVersion={climate.modelVersion}
          />
          <LandscapeClimateViews
            carbon={views.carbon}
            adaptation={views.adaptation}
            resilience={views.resilience}
            ghgTotalTco2e={climate.ghgTotalTco2e}
            carbonCreditableTco2e={climate.carbonCreditableTco2e}
          />
        </>
      )}
      <div className="h-16" />
    </CurrencyProvider>
  );
}
