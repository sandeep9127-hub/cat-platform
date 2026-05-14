import { notFound } from "next/navigation";
import Link from "next/link";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

const LANDSCAPE_CONTEXT: Record<string, { context: string; lipStatus: "published" | "in_preparation" }> = {
  ahwa: {
    context:
      "Ahwa is the tribal block at the heart of Gujarat's Dang district, a hilly forest-fringe landscape. Smallholder agriculture is woven into the forest economy. Minor millets, kharif paddy, and seasonal forest collections form the livelihood mix. Climate variability and out-migration are pressing.",
    lipStatus: "published",
  },
  chitrakonda: {
    context:
      "Chitrakonda sits in southern Odisha's Malkangiri district, parts of which were administratively cut off by reservoir construction for decades. Tribal communities here farm millets, pulses, and forest crops at low input intensity, with thin market linkages.",
    lipStatus: "published",
  },
  dantewada: {
    context:
      "Dantewada lies in Chhattisgarh's Bastar tribal heartland. Communities practice rainfed paddy, millets, forest collection, and increasingly natural farming. Programmatic continuity has been historically difficult; coordinated action is rare.",
    lipStatus: "published",
  },
  dharashiv: {
    context:
      "Dharashiv (formerly Osmanabad) is a drought-prone block in Maharashtra's Marathwada region. Soil moisture and water security are the binding constraints. FPO formation, soil-health work, and cropping diversification are early priorities.",
    lipStatus: "in_preparation",
  },
  "khatarshnong-laitkroh": {
    context:
      "Khatarshnong Laitkroh, in Meghalaya's East Khasi Hills, is a high-rainfall hill block where shifting cultivation persists alongside forest-based livelihoods. Land tenure is customary, and the institutional landscape differs sharply from mainland blocks.",
    lipStatus: "in_preparation",
  },
  mau: {
    context:
      "Mau, in eastern Uttar Pradesh, is a flat, densely cultivated rice-wheat smallholder block. Diversification entry points — pulses, oilseeds, vegetable belts — are real but undercapitalised. Migration and input dependency are part of the baseline.",
    lipStatus: "in_preparation",
  },
  pangi: {
    context:
      "Pangi is a high-altitude tribal valley in Himachal's Chamba district. Cold-desert conditions, road access cut off for parts of the year, apple economies, and millet revival projects mark the landscape. Markets are distant; institutional capacity is thin.",
    lipStatus: "in_preparation",
  },
  patharpratima: {
    context:
      "Patharpratima is a Sundarbans delta block in West Bengal's South 24 Parganas. Salinity intrusion, embankment failure, and cyclones define production. Salt-tolerant paddy systems and aquaculture rotations are the principal agroecological responses.",
    lipStatus: "in_preparation",
  },
  patratu: {
    context:
      "Patratu sits in Jharkhand's Damodar valley, a mine-fringe block where land rehabilitation, water management, and tribal livelihood transitions overlap. The landscape's challenge is doing agriculture and ecology in proximity to industrial scars.",
    lipStatus: "in_preparation",
  },
  rajnagar: {
    context:
      "Rajnagar is a block in Madhya Pradesh's Bundelkhand region — water-stressed dryland with millet potential and low irrigation cover. Water conservation, traditional pulses, and FPO formation are the entry levers.",
    lipStatus: "in_preparation",
  },
  vempalli: {
    context:
      "Vempalli lies in Andhra Pradesh's Rayalaseema, a semi-arid region with horticulture and natural-farming clusters. Sits adjacent to the APCNF programme footprint and benefits from existing institutional infrastructure.",
    lipStatus: "in_preparation",
  },
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const [g] = await db
    .select()
    .from(schema.geographies)
    .where(and(eq(schema.geographies.slug, slug), eq(schema.geographies.type, "landscape")))
    .limit(1);
  if (!g) return { title: "Landscape not found" };
  return {
    title: `${g.name} — Landscape`,
    description: LANDSCAPE_CONTEXT[slug]?.context.slice(0, 160),
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

  const [state] = g.parentId
    ? await db.select().from(schema.geographies).where(eq(schema.geographies.id, g.parentId)).limit(1)
    : [null];

  const info = LANDSCAPE_CONTEXT[slug];

  // Programmes in the same state (or directly tagged to this landscape, if any)
  const stateEntries = state
    ? await db
        .select({
          id: schema.entries.id,
          slug: schema.entries.slug,
          title: schema.entries.title,
          tagline: schema.entries.tagline,
          startYear: schema.entries.startYear,
          endYear: schema.entries.endYear,
        })
        .from(schema.entries)
        .where(
          sql`${schema.entries.primaryGeographyId} = ${state.id} AND ${schema.entries.editorialStatus} = 'published'`
        )
    : [];

  return (
    <article className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-10 sm:pt-14 lg:pt-20 pb-24">
      <header className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10 lg:gap-12 items-end">
        <div className="reveal-stagger">
          <div className="flex items-center gap-3 mb-5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-teal font-semibold">
            <Link href="/landscapes" className="hover:text-teal-soft">
              Landscapes
            </Link>
            <span className="text-line">/</span>
            <span className="text-ink-soft font-normal tracking-[0.14em]">
              {state?.name ?? g.stateCode}
            </span>
          </div>
          <h1 className="font-serif font-normal text-[clamp(42px,5.4vw,80px)] leading-[1.02] tracking-[-0.025em] text-ink">
            {g.name}
          </h1>
          <p className="font-serif italic text-[18px] sm:text-[20px] text-ink-soft leading-[1.5] mt-6 max-w-[58ch] font-light">
            {info?.context.split(".")[0]}.
          </p>
        </div>
        <aside className="lg:border-l lg:border-line lg:pl-7 border-t border-line pt-5 lg:border-t-0 lg:pt-0 flex flex-col gap-4 lg:self-end lg:pb-2">
          <div className="flex flex-col gap-1.5">
            <span className="mono-label">Landscape Investment Plan</span>
            {info?.lipStatus === "published" ? (
              <span className="font-serif text-[16px] text-deep-teal">
                Published <span className="text-amber-deep">·</span> See report
              </span>
            ) : (
              <span className="font-serif text-[16px] text-muted italic">In preparation</span>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="mono-label">State</span>
            <Link
              href={`/theme/water`}
              className="font-serif text-[16px] text-deep-teal hover:text-teal transition-colors"
            >
              {state?.name ?? g.stateCode}
            </Link>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="mono-label">Scale</span>
            <span className="font-serif text-[16px] text-ink-soft">
              Block-level administrative unit
            </span>
          </div>
        </aside>
      </header>

      <section className="mt-14 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10 lg:gap-12">
        <div className="max-w-reading">
          <NarrativeBlock label="Context">{info?.context}</NarrativeBlock>
          <NarrativeBlock label="The approach">
            CAT&apos;s landscape-based approach brings together coordinated services,
            institutions, and finance over a sustained period of at least seven years. Three
            levers shape the work in every landscape: Policy, Markets, and Finance.
          </NarrativeBlock>
          <NarrativeBlock label="What we are tracking">
            Once the Landscape Investment Plan is published, indicators on ecological recovery,
            household income, institutional formation, and policy adoption begin populating
            here. Until then this page documents the landscape&apos;s context and intent.
          </NarrativeBlock>
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
          <div className="border-l-2 border-amber-deep pl-4">
            <span className="eyebrow block mb-2">Three levers</span>
            <ul className="list-none p-0 m-0 flex flex-col gap-2 text-[14px] text-ink-soft leading-[1.55]">
              <li>
                <strong className="text-deep-teal font-semibold">Policy</strong> — schemes,
                regulation, institutions
              </li>
              <li>
                <strong className="text-deep-teal font-semibold">Markets</strong> — procurement,
                processing, fair pricing
              </li>
              <li>
                <strong className="text-deep-teal font-semibold">Finance</strong> — patient
                capital, blended financing
              </li>
            </ul>
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
    </article>
  );
}

function NarrativeBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="my-8">
      <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-teal font-semibold flex gap-2 items-center mb-3">
        <span className="w-3.5 h-px bg-teal" />
        {label}
      </span>
      <p className="font-serif text-[16.5px] leading-[1.65] text-ink-soft">{children}</p>
    </section>
  );
}
