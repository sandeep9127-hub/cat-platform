import { notFound } from "next/navigation";
import Link from "next/link";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { LandscapeTabs } from "@/components/landscape/LandscapeTabs";
import { landscapeHasLip, budgetSummary, listLandscapeDocuments } from "@/lib/db/landscape-kb";
import { LandscapeKpiDashboard } from "@/components/landscape/LandscapeKpiDashboard";
import { FileText, FileType2, Scale, ShoppingCart, Wallet, ArrowUpRight } from "lucide-react";
import { LandscapeSignature } from "@/components/landscape/LandscapeSignature";
import { LandscapeAnchor } from "@/components/landscape/LandscapeAnchor";
import { LandscapeFieldRecord } from "@/components/landscape/LandscapeFieldRecord";

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

  // KPI dashboard data — pulled in parallel
  const [money, docs] = hasLip
    ? await Promise.all([budgetSummary(slug), listLandscapeDocuments(slug)])
    : [null, []];

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
          <h1 className="font-sans font-light text-[clamp(42px,5.4vw,80px)] leading-[1.02] tracking-[-0.028em] text-[color:var(--navy-teal)]">
            {p.name}
          </h1>
          <p className="font-sans italic text-[18px] sm:text-[20px] text-ink-soft leading-[1.55] mt-6 max-w-[58ch] font-light">
            {p.context}
          </p>
        </div>
        <aside className="lg:border-l lg:border-line lg:pl-7 border-t border-line pt-5 lg:border-t-0 lg:pt-0 flex flex-col gap-4 lg:self-end lg:pb-2">
          <FactRow label="Investment plan">
            {p.lipStatus === "published" ? (
              <span className="text-deep-teal">
                <strong className="text-amber-deep">Published</strong>
                <span className="text-amber-deep">·</span> See report
              </span>
            ) : (
              <span className="text-muted italic">In preparation</span>
            )}
          </FactRow>
          <FactRow label="State">{state?.name ?? g.stateCode}</FactRow>
          <FactRow label="Region">{p.region}</FactRow>
          {hasLip && (
            <Link
              href={`/landscape/${slug}/ask`}
              className="mt-4 inline-block px-4 py-2.5 bg-deep-teal text-paper font-mono text-[10.5px] uppercase tracking-[0.16em] font-semibold rounded-[2px] hover:bg-teal transition-colors text-center"
            >
              Ask {p.name} →
            </Link>
          )}
        </aside>
      </header>

      <div className="mt-8 lg:mt-12">
        <LandscapeTabs slug={slug} active="profile" hasLip={hasLip} />
      </div>

      {/* Interactive KPI dashboard with Land · People · Money slicer */}
      <LandscapeKpiDashboard
        landscapeName={p.name}
        district={p.district}
        region={p.region}
        state={state?.name ?? g.stateCode ?? p.region}
        agroclimaticZone={p.agroclimaticZone}
        area={p.area}
        population={p.population}
        households={p.households}
        villages={p.villages}
        keyChallengesCount={p.keyChallenges.length}
        lipStatus={p.lipStatus}
        money={
          money
            ? {
                totalCostInr: money.totalCostInr,
                investmentRequiredInr: money.investmentRequiredInr,
                govtInr: money.govtInr,
                communityInr: money.communityInr,
                horizonYears: 7,
                interventionLines: money.byCategory.reduce(
                  (acc, c) => acc + (c.total > 0 ? 1 : 0),
                  0
                ) || money.byCategory.length,
                topCategories: money.byCategory
                  .filter((c) => c.total > 0)
                  .slice(0, 4)
                  .map((c) => ({ category: c.category, total: c.total })),
                indexedDocuments: docs.length,
              }
            : undefined
        }
      />

      {/* Documentary photographs from the landscape — captioned, credited, dated */}
      {p.photos && p.photos.length > 0 && (
        <LandscapeFieldRecord photos={p.photos} landscapeName={p.name} />
      )}

      <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10">

      <section className="mt-16 lg:mt-20 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-10 lg:gap-12">
        <div className="max-w-reading">
          <NarrativeBlock label="Context">{p.bodyContext}</NarrativeBlock>
          <NarrativeBlock label="Agroclimatic zone">{p.agroclimaticZone}</NarrativeBlock>
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
          <NarrativeBlock label="The approach">
            CAT&apos;s landscape-based approach brings together coordinated services,
            institutions, and finance over a sustained period of at least seven years. Three
            levers shape the work in every landscape: Policy, Markets, and Finance. The
            agroecological pathway for {p.name} is rooted in building climate resilience,
            enhancing adaptation, and enabling mitigation.
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
            <span className="relative eyebrow block mb-3">Download this profile</span>
            <div className="relative flex flex-col gap-2.5">
              <a
                href={`/api/landscape/${slug}/download?format=pdf`}
                className="inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-deep-teal border-b-2 border-amber pb-1 hover:border-amber-deep transition-colors self-start"
                download={`${slug}-landscape-profile.pdf`}
              >
                <FileText size={13} strokeWidth={1.6} aria-hidden />
                Landscape profile · PDF
              </a>
              <a
                href={`/api/landscape/${slug}/download?format=docx`}
                className="inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-teal border-b-2 border-line-soft pb-1 hover:border-teal transition-colors self-start"
                download={`${slug}-landscape-profile.docx`}
              >
                <FileType2 size={13} strokeWidth={1.6} aria-hidden />
                Landscape profile · DOCX
              </a>
            </div>
            <p className="relative font-serif italic text-[12.5px] text-muted mt-3 leading-snug">
              One-page editorial brief, generated live from the Feb 2026 CAT profile.
            </p>
          </div>
          <div>
            <span className="eyebrow block mb-3">Three levers</span>
            <ul className="list-none p-0 m-0 flex flex-col gap-3 text-[14px] text-ink-soft leading-[1.5]">
              <li className="flex gap-2.5 items-baseline">
                <Scale size={14} strokeWidth={1.6} className="text-deep-teal shrink-0 translate-y-[2px]" aria-hidden />
                <span>
                  <strong className="text-deep-teal font-semibold">Policy</strong> &middot; schemes,
                  regulation, institutions
                </span>
              </li>
              <li className="flex gap-2.5 items-baseline">
                <ShoppingCart size={14} strokeWidth={1.6} className="text-deep-teal shrink-0 translate-y-[2px]" aria-hidden />
                <span>
                  <strong className="text-deep-teal font-semibold">Markets</strong> &middot; procurement,
                  processing, fair pricing
                </span>
              </li>
              <li className="flex gap-2.5 items-baseline">
                <Wallet size={14} strokeWidth={1.6} className="text-deep-teal shrink-0 translate-y-[2px]" aria-hidden />
                <span>
                  <strong className="text-deep-teal font-semibold">Finance</strong> &middot; patient
                  capital, blended financing
                </span>
              </li>
            </ul>
          </div>
          <div>
            <span className="eyebrow block mb-2">Time horizon</span>
            <p className="text-[13.5px] text-ink-soft leading-[1.55]">
              Agroecological transitions are seven-year projects at minimum. The Hub
              reflects that pace.
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

      <footer className="mt-20 pt-6 border-t border-line font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted flex flex-wrap gap-x-8 gap-y-2">
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
