import { notFound } from "next/navigation";
import Link from "next/link";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { LandscapeTabs } from "@/components/landscape/LandscapeTabs";
import { landscapeHasLip, budgetSummary, landscapeInsights } from "@/lib/db/landscape-kb";
import { LandscapeLedger } from "@/components/landscape/LandscapeLedger";
import { LandscapeMoney } from "@/components/landscape/LandscapeMoney";
import { CurrencyProvider } from "@/components/landscape/currency";
import { FileText, Scale, ShoppingCart, Wallet, ArrowUpRight } from "lucide-react";
import { LandscapeSignature } from "@/components/landscape/LandscapeSignature";
import { LandscapeAnchor } from "@/components/landscape/LandscapeAnchor";
import { LandscapeAnchorPartner } from "@/components/landscape/LandscapeAnchorPartner";
import { LandscapeFieldRecord } from "@/components/landscape/LandscapeFieldRecord";
import { LandscapeInterventions } from "@/components/landscape/LandscapeInterventions";
import { LandscapePriorities } from "@/components/landscape/LandscapePriorities";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const p = LANDSCAPES[slug];
  if (!p) return { title: "Landscape not found" };
  return {
    title: `${p.name} · ${p.district}`,
    description: p.context.slice(0, 160),
  };
}

export default async function LandscapeDetailPage({ params }: Props) {
  const { slug } = await params;
  const [g] = await db
    .select()
    .from(schema.geographies)
    .where(and(eq(schema.geographies.slug, slug), eq(schema.geographies.type, "landscape")))
    .limit(1);
  if (!g) notFound();
  const p = LANDSCAPES[slug];
  if (!p) notFound();

  const [state] = g.parentId
    ? await db.select().from(schema.geographies).where(eq(schema.geographies.id, g.parentId)).limit(1)
    : [null];

  const hasLip = await landscapeHasLip(slug);

  // Budget summary + reach insights — pulled in parallel, only when there's a plan
  const [money, insights] = hasLip
    ? await Promise.all([budgetSummary(slug), landscapeInsights(slug)])
    : [null, null];

  // Programmes in the same state
  const stateEntries = state
    ? await db
        .select({
          id: schema.entries.id,
          slug: schema.entries.slug,
          title: schema.entries.title,
          tagline: schema.entries.tagline,
        })
        .from(schema.entries)
        .where(
          sql`${schema.entries.primaryGeographyId} = ${state.id} AND ${schema.entries.editorialStatus} = 'published'`
        )
    : [];

  return (
    <article className="pt-10 sm:pt-14 lg:pt-20 pb-24">
      {/* Hero visual anchor: photograph when available, procedural signature otherwise */}
      {p.photos && p.photos.length > 0 ? (
        <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 mb-6 reveal-stagger">
          <LandscapeAnchor photo={p.photos[0]} />
        </div>
      ) : (
        <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 mb-2 hidden md:flex justify-center reveal-stagger">
          <LandscapeSignature slug={slug} width={480} />
        </div>
      )}
      <header className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-10 lg:gap-12 items-end">
        <div className="reveal-stagger">
          <div className="flex items-center gap-3 mb-5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-teal font-semibold flex-wrap">
            <Link href="/landscapes" className="hover:text-teal-soft">
              Landscapes
            </Link>
            <span className="text-line">/</span>
            <span className="text-ink-soft font-normal tracking-[0.14em]">
              {state?.name ?? g.stateCode}
            </span>
            <span className="text-line">·</span>
            <span className="text-ink-soft font-normal tracking-[0.14em]">{p.district}</span>
          </div>
          <h1 className="font-sans font-medium text-[clamp(42px,5.4vw,80px)] leading-[1.02] tracking-[-0.028em] text-[color:var(--navy-teal)]">
            {p.name}
          </h1>
          <p className="font-sans italic text-[18px] sm:text-[20px] text-ink-soft leading-[1.55] mt-6 max-w-[58ch] font-light">
            {p.context}
          </p>
        </div>
        <aside className="lg:border-l lg:border-line lg:pl-7 border-t border-line pt-5 lg:border-t-0 lg:pt-0 flex flex-col gap-4 lg:self-end lg:pb-2">
          <LandscapeAnchorPartner slug={slug} />
          <FactRow label="Investment plan">
            {p.lipStatus === "published" ? (
              <span className="inline-flex items-center gap-1.5 text-ink-soft">
                <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "#2e7573" }} />
                <strong className="text-deep-teal">Published</strong>
                <span className="text-muted">· See report</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5" style={{ color: "#5e6990" }}>
                <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "#929cc5" }} />
                In preparation
              </span>
            )}
          </FactRow>
          <FactRow label="State">{state?.name ?? g.stateCode}</FactRow>
          <FactRow label="Region">{p.region}</FactRow>
          {hasLip && (
            <Link
              href={`/landscape/${slug}/ask`}
              className="group mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.16em] font-semibold rounded-full text-paper transition-all hover:-translate-y-0.5"
              style={{
                background: "linear-gradient(135deg, #2E7573 0%, #334B4A 100%)",
                boxShadow:
                  "0 10px 22px -10px rgba(46,117,115,0.55), inset 0 1px 0 rgba(255,255,255,0.20)",
              }}
            >
              <span>Ask {p.name}</span>
              <ArrowUpRight
                size={12}
                strokeWidth={2}
                className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden
              />
            </Link>
          )}
        </aside>
      </header>

      <div className="mt-8 lg:mt-12">
        <LandscapeTabs slug={slug} active="profile" hasLip={hasLip} />
      </div>

      {/* ORIENT + MONEY — share one currency toggle (INR / USD / EUR) */}
      <CurrencyProvider>
        <LandscapeLedger
          landscapeName={p.name}
          area={p.area}
          villages={p.villages}
          agroclimaticZone={p.agroclimaticZone}
          population={p.population}
          households={p.households}
          lipStatus={p.lipStatus}
          totalCostInr={money?.totalCostInr}
          investmentRequiredInr={money?.investmentRequiredInr}
        />

        {money && insights && money.totalCostInr > 0 && (
          <LandscapeMoney
            slug={slug}
            landscapeName={p.name}
            total={money.totalCostInr}
            investment={money.investmentRequiredInr}
            govt={money.govtInr}
            community={money.communityInr}
            grants={money.grantsInr}
            returnable={money.returnableGrantInr}
            outcome={money.outcomeFinanceInr}
            debt={money.debtInr}
            byPackage={money.byPackage}
            reach={{
              householdEngagements: insights.totals.householdEngagements,
              hectares: insights.totals.hectares,
              lineCount: insights.totals.lineCount,
            }}
          />
        )}
      </CurrencyProvider>

      {/* STORY — establish the place and its challenges before the response
          (context → challenges → priorities → interventions, fact-sheet order) */}
      <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10">

      <section className="mt-16 lg:mt-20 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-10 lg:gap-12">
        <div className="max-w-reading">
          <NarrativeBlock label="Context">{p.bodyContext}</NarrativeBlock>
          <NarrativeBlock label="Key landscape challenges">
            <ol className="list-none p-0 m-0 flex flex-col gap-3.5 mt-1">
              {p.keyChallenges.map((c, i) => (
                <li
                  key={i}
                  className="grid grid-cols-[34px_1fr] gap-x-3 items-baseline"
                >
                  <span className="font-mono text-[12px] text-amber-deep font-semibold tracking-[0.12em]">
                    {String(i + 1).padStart(2, "0")}.
                  </span>
                  <span>{c}</span>
                </li>
              ))}
            </ol>
          </NarrativeBlock>
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
          <div
            className="relative border border-line p-5 overflow-hidden"
            style={{
              background:
                "linear-gradient(180deg, rgba(251,248,242,1) 0%, rgba(248,243,232,0.6) 100%)",
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              aria-hidden
              style={{
                background:
                  "radial-gradient(ellipse 90% 50% at 100% 0%, rgba(248,202,124,0.20), transparent 60%)",
              }}
            />
            <span className="relative eyebrow block mb-3">Download the brief</span>
            <div className="relative flex flex-col gap-2.5">
              <a
                href={`/api/landscape/${slug}/download?format=pdf`}
                className="inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-deep-teal border-b-2 border-amber pb-1 hover:border-amber-deep transition-colors self-start"
                download={`${slug}-investment-brief.pdf`}
              >
                <FileText size={13} strokeWidth={1.6} aria-hidden />
                Investment brief · PDF
              </a>
            </div>
            <p className="relative font-sans italic text-[12.5px] text-muted mt-3 leading-snug">
              A four-page investment brief, generated live: why the landscape matters, the
              plan, its costing, and the metrics.
            </p>
          </div>
          <div className="border border-line rounded-[10px] p-5 bg-paper">
            <span className="eyebrow block mb-3.5">How CAT works here</span>
            <ul className="list-none p-0 m-0 flex flex-col gap-3 text-[13.5px] text-ink-soft leading-[1.45]">
              <li className="flex gap-2.5 items-baseline">
                <Scale size={14} strokeWidth={1.6} className="text-deep-teal shrink-0 translate-y-[2px]" aria-hidden />
                <span><strong className="text-deep-teal font-semibold">Policy</strong> &middot; schemes, regulation, institutions</span>
              </li>
              <li className="flex gap-2.5 items-baseline">
                <ShoppingCart size={14} strokeWidth={1.6} className="text-deep-teal shrink-0 translate-y-[2px]" aria-hidden />
                <span><strong className="text-deep-teal font-semibold">Markets</strong> &middot; procurement, processing, fair pricing</span>
              </li>
              <li className="flex gap-2.5 items-baseline">
                <Wallet size={14} strokeWidth={1.6} className="text-deep-teal shrink-0 translate-y-[2px]" aria-hidden />
                <span><strong className="text-deep-teal font-semibold">Finance</strong> &middot; patient capital, blended financing</span>
              </li>
            </ul>
            <p className="text-[12.5px] text-muted leading-[1.5] mt-3.5 pt-3.5 border-t border-line/70">
              A landscape is a seven-year project at minimum. The Hub reflects that pace.
            </p>
          </div>
          {stateEntries.length > 0 && (
            <div>
              <span className="eyebrow block mb-2">Related programmes in {state?.name}</span>
              <ul className="list-none p-0 m-0 flex flex-col gap-3">
                {stateEntries.slice(0, 4).map((e) => (
                  <li key={e.id}>
                    <Link href={`/entry/${e.slug}`} className="group block">
                      <div className="font-serif text-[15px] text-ink group-hover:text-teal transition-colors">
                        {e.title}
                      </div>
                      <div className="font-serif italic text-[13.5px] text-muted mt-0.5">
                        {e.tagline.slice(0, 80)}…
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </section>
      </div>

      {/* PRIORITIES — the strategic direction (fact-sheet priorities), following
          the context + challenges they respond to */}
      <LandscapePriorities slug={slug} landscapeName={p.name} />

      {/* INTERVENTIONS — what the money buys, verbatim from the LIP, by theme */}
      <LandscapeInterventions slug={slug} landscapeName={p.name} />

      {/* PROOF — documentary photographs close the page */}
      {p.photos && p.photos.length > 0 && (
        <LandscapeFieldRecord photos={p.photos} landscapeName={p.name} />
      )}

      <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10">
        <footer className="mt-16 lg:mt-20 pt-6 border-t border-line font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted flex flex-wrap gap-x-8 gap-y-2">
          <span>
            Source ·{" "}
            <a
              href="https://agroecologyindia.org/wp-content/uploads/2026/03/CAT-Landscape-Profiles-February_2026.pdf"
              target="_blank"
              rel="noreferrer"
              className="text-teal hover:text-teal-soft"
            >
              CAT Landscape Profiles, Feb 2026 ↗
            </a>
          </span>
        </footer>
      </div>
    </article>
  );
}

function FactRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="mono-label">{label}</span>
      <span className="font-serif text-[16px] text-ink">{children}</span>
    </div>
  );
}

function NarrativeBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="my-8">
      <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-teal font-semibold flex gap-2 items-center mb-3">
        <span className="w-3.5 h-px bg-teal" />
        {label}
      </span>
      <div className="font-serif text-[16.5px] leading-[1.65] text-ink-soft">{children}</div>
    </section>
  );
}
