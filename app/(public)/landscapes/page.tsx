import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export const revalidate = 60;
export const metadata = {
  title: "Landscapes",
  description:
    "CAT works at the scale of landscapes — block-level administrative units selected for ecological, social, and institutional reasons. Eleven landscapes across India.",
};

// One-line editorial gloss per landscape; concise, plain, no marketing language.
const LANDSCAPE_GLOSS: Record<string, string> = {
  ahwa: "Dang tribal belt in Gujarat. Forest-fringe agriculture and minor millets.",
  chitrakonda: "Malkangiri tribal block in southern Odisha. Millet revival in cut-off areas.",
  dantewada: "Bastar tribal heartland in Chhattisgarh. Forest-foods and natural farming.",
  dharashiv: "Drought-prone Marathwada. Soil moisture and farmer-collective work.",
  "khatarshnong-laitkroh": "East Khasi Hills, Meghalaya. Shifting cultivation and forest livelihoods.",
  mau: "Eastern UP. Smallholder rice-wheat with diversification entry points.",
  pangi: "High-altitude tribal valley in Himachal. Cold-desert farming and apple economies.",
  patharpratima: "Sundarbans delta block in West Bengal. Salt-tolerant systems and aquaculture rotations.",
  patratu: "Damodar valley block in Jharkhand. Mine-fringe rehabilitation and tribal landscapes.",
  rajnagar: "Bundelkhand in Madhya Pradesh. Water-stressed dryland with millet potential.",
  vempalli: "Rayalaseema in Andhra Pradesh. Semi-arid horticulture and natural-farming clusters.",
};

export default async function LandscapesPage() {
  const rows = await db
    .select({
      id: schema.geographies.id,
      slug: schema.geographies.slug,
      name: schema.geographies.name,
      stateCode: schema.geographies.stateCode,
      latitude: schema.geographies.latitude,
      longitude: schema.geographies.longitude,
    })
    .from(schema.geographies)
    .where(eq(schema.geographies.type, "landscape"))
    .orderBy(asc(schema.geographies.name));

  return (
    <>
      <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-12 sm:pt-16 lg:pt-20 pb-10 grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-10 lg:gap-16 items-end">
        <div className="reveal-stagger" style={{ animationDelay: "0ms" }}>
          <span className="eyebrow">CAT&apos;s focus landscapes</span>
          <h1 className="font-serif font-normal text-hero-xl text-ink mt-4">
            Eleven{" "}
            <em className="hero-italic italic text-teal not-italic" style={{ fontStyle: "italic" }}>
              landscapes
            </em>
            .<br />
            One approach.
          </h1>
          <p className="font-serif italic text-[17px] sm:text-[19px] text-ink-soft leading-[1.45] max-w-[46ch] mt-6 font-light">
            CAT works at the scale of landscapes. Each landscape is broadly a block-level
            administrative unit, selected for ecological, social, and institutional reasons.
            Coordinated services, institutions, and finance over a sustained period of at
            least seven years.
          </p>
        </div>
        <aside className="lg:border-l lg:border-line lg:pl-7 lg:self-end lg:pb-2 border-t border-line pt-6 lg:border-t-0 lg:pt-0 reveal-stagger" style={{ animationDelay: "180ms" }}>
          <span className="eyebrow">In practice</span>
          <p className="text-[14px] text-ink-soft max-w-[36ch] mt-3.5">
            Each landscape has a Landscape Investment Plan — a place-based costing and
            implementation roadmap. Three plans are published; eight more are in preparation.
          </p>
          <div className="mt-4 flex gap-2.5 items-center">
            <span className="w-6 h-px bg-amber-deep" />
            <span className="font-mono text-[10.5px] uppercase tracking-mono-mid text-ink-soft">
              Place-based, not prescriptive
            </span>
          </div>
        </aside>
      </section>

      <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pb-24 border-t border-line pt-2">
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-line-soft border border-line-soft list-none p-0 m-0 mt-6">
          {rows.map((g, i) => (
            <li
              key={g.id}
              className="reveal-stagger bg-paper"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <Link
                href={`/landscape/${g.slug}`}
                className="group block p-6 hover:bg-cream transition-colors h-full"
              >
                <div className="flex items-baseline justify-between gap-3 mb-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
                  <span>No. {String(i + 1).padStart(2, "0")} / 11</span>
                  <span className="text-amber-deep font-semibold">{g.stateCode}</span>
                </div>
                <h2 className="font-serif text-[24px] sm:text-[26px] font-medium leading-[1.15] tracking-[-0.015em] text-ink group-hover:text-teal transition-colors">
                  {g.name}
                </h2>
                <p className="font-serif text-[15px] text-ink-soft leading-[1.55] mt-3">
                  {LANDSCAPE_GLOSS[g.slug] ?? "A CAT focus landscape."}
                </p>
                <span className="block mt-5 font-mono text-[10px] uppercase tracking-[0.16em] text-teal group-hover:text-amber-deep transition-colors">
                  Read landscape →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
