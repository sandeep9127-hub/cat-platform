import { notFound } from "next/navigation";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { LandscapeTabs } from "@/components/landscape/LandscapeTabs";
import { LandscapeAsk } from "@/components/landscape/LandscapeAsk";
import { landscapeHasLip } from "@/lib/db/landscape-kb";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = LANDSCAPES[slug];
  return { title: p ? `Ask ${p.name}` : "Ask the landscape" };
}

const STARTER_TEMPLATES = [
  "What does the investment plan say about climate resilience for {name}?",
  "Compare the budget for soil & water versus livestock interventions.",
  "Which interventions are women-led and what's their total budget?",
  "What's the Phase 1 ask and how is it financed?",
  "Which interventions converge with government schemes most heavily?",
];

export default async function AskPage({ params }: { params: Promise<{ slug: string }> }) {
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
            Ask {p.name}.
          </h1>
        </header>
        <LandscapeTabs slug={slug} active="ask" hasLip={hasLip} />
        <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 py-16">
          <p className="font-serif italic text-ink-soft text-[18px] max-w-[44ch]">
            The {p.name} investment plan is in preparation. Scoped chat will land here once the investment plan is
            indexed.
          </p>
        </section>
      </>
    );
  }

  const starters = STARTER_TEMPLATES.map((s) => s.replace("{name}", p.name));

  return (
    <>
      <header className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-10 sm:pt-14 lg:pt-16 pb-6">
        <div className="flex items-center gap-3 mb-4 font-mono text-[10.5px] uppercase tracking-[0.16em] text-teal font-semibold flex-wrap">
          <a href="/landscapes" className="hover:text-teal-soft">CAT Landscapes</a>
          <span className="text-line">/</span>
          <span className="text-ink-soft font-normal tracking-[0.14em]">{p.name}</span>
          <span className="text-line">·</span>
          <span className="inline-block px-1.5 py-0.5 bg-amber/40 text-deep-teal rounded-[2px] text-[9px]">
            v1 preview
          </span>
        </div>
        <h1 className="font-serif font-normal text-[clamp(38px,4.4vw,64px)] leading-[1.05] tracking-[-0.022em] text-ink">
          Ask <em className="italic text-teal not-italic" style={{ fontStyle: "italic" }}>{p.name}</em>.
        </h1>
        <p className="font-serif italic text-[17px] sm:text-[19px] text-ink-soft leading-[1.5] mt-5 max-w-[58ch] font-light">
          A scoped agent that draws only from the {p.name} Landscape Investment Plan. Asks
          you for the question; cites the passages it used; refuses anything outside the investment plan.
        </p>
      </header>

      <LandscapeTabs slug={slug} active="ask" hasLip={hasLip} />

      <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 py-10 pb-24 border-t border-line grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 lg:gap-10">
        <LandscapeAsk slug={slug} landscapeName={p.name} starters={starters} />
        <aside
          className="relative overflow-hidden rounded-[8px] border border-line bg-paper p-5 self-start"
          style={{
            boxShadow: "0 1px 2px rgba(26,38,37,0.04), 0 10px 24px -16px rgba(159,184,166,0.45)",
            backgroundImage:
              "linear-gradient(180deg, rgba(251,248,242,1) 0%, rgba(232,240,234,0.55) 100%)",
          }}
        >
          <span
            aria-hidden
            className="absolute top-0 left-0 right-0 h-[2px]"
            style={{
              background:
                "linear-gradient(90deg, rgba(159,184,166,0.95) 0%, rgba(159,184,166,0.55) 60%, transparent 100%)",
            }}
          />
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--sage)] font-semibold inline-flex items-center gap-2">
            <span className="w-3 h-px bg-[color:var(--sage)]" />
            Guidance
          </span>
          <h3 className="font-sans text-[16px] font-medium text-[color:var(--navy-teal)] mt-3 leading-[1.3]">
            How to ask
          </h3>
          <ul className="list-none p-0 mt-3 flex flex-col gap-2.5 font-sans text-[13.5px] text-ink-soft leading-[1.55]">
            <li className="flex gap-2 items-baseline">
              <span className="font-mono text-[10px] text-amber-deep font-semibold tabular-nums shrink-0">01</span>
              <span>Ask about specific interventions, budgets, packages, or phases.</span>
            </li>
            <li className="flex gap-2 items-baseline">
              <span className="font-mono text-[10px] text-amber-deep font-semibold tabular-nums shrink-0">02</span>
              <span>Quote a passage and ask for the source — the assistant will cite.</span>
            </li>
            <li className="flex gap-2 items-baseline">
              <span className="font-mono text-[10px] text-amber-deep font-semibold tabular-nums shrink-0">03</span>
              <span>Out-of-scope questions are politely refused, with a reason.</span>
            </li>
          </ul>
          <div className="mt-5 pt-4 border-t border-line-soft">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted">
              Eight-turn cap per session
            </span>
          </div>
        </aside>
      </section>
    </>
  );
}
