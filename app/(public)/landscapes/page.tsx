import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { CatLandscapesMap } from "@/components/map/CatLandscapesMap";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "CAT Landscapes",
  description:
    "CAT works at the scale of landscapes — block-level administrative units selected for ecological, social, and institutional reasons. Eleven landscapes across India.",
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

  const publishedCount = Object.values(LANDSCAPES).filter(
    (l) => l.lipStatus === "published"
  ).length;

  // Pins for the dedicated CAT Landscapes map, drawn from the curated profile data
  const pins = rows
    .map((r) => {
      const p = LANDSCAPES[r.slug];
      if (!p) return null;
      return {
        slug: r.slug,
        name: p.name,
        district: p.district,
        stateCode: r.stateCode ?? "",
        latitude: 0,
        longitude: 0,
        lipStatus: p.lipStatus,
      };
    })
    .filter(Boolean) as Array<{
    slug: string;
    name: string;
    district: string;
    stateCode: string;
    latitude: number;
    longitude: number;
    lipStatus: "published" | "in_preparation";
  }>;

  // hydrate lat/lng from DB rows
  for (const pin of pins) {
    const r = rows.find((x) => x.slug === pin.slug);
    if (r) {
      pin.latitude = r.latitude ?? 0;
      pin.longitude = r.longitude ?? 0;
    }
  }

  return (
    <>
      <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-12 sm:pt-16 lg:pt-20 pb-10 grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-10 lg:gap-16 items-end">
        <div className="reveal-stagger" style={{ animationDelay: "0ms" }}>
          <span className="eyebrow">Curated by CAT · the closed set</span>
          <h1 className="font-serif font-normal text-hero-xl text-ink mt-4">
            CAT{" "}
            <em className="hero-italic italic text-teal not-italic" style={{ fontStyle: "italic" }}>
              Landscapes
            </em>
            .
          </h1>
          <p className="font-serif italic text-[17px] sm:text-[19px] text-ink-soft leading-[1.45] max-w-[52ch] mt-6 font-light">
            Eleven focus landscapes across India where the Consortium for Agroecological
            Transformations is developing place-based investment plans. A landscape is an
            administrative block (or sub-section of one), selected for ecological, social,
            and institutional reasons. The minimum viable unit for planning and action over
            a sustained seven-year horizon.
          </p>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted mt-5 max-w-[52ch]">
            This is the closed CAT set. For programmes, interventions, and contributed work
            from across India, see the{" "}
            <Link href="/map" className="text-teal hover:text-teal-soft underline-offset-2 hover:underline">
              Solutions Atlas
            </Link>
            .
          </p>
        </div>
        <aside className="lg:border-l lg:border-line lg:pl-7 lg:self-end lg:pb-2 border-t border-line pt-6 lg:border-t-0 lg:pt-0 reveal-stagger" style={{ animationDelay: "180ms" }}>
          <span className="eyebrow">Investment plans</span>
          <p className="text-[14px] text-ink-soft max-w-[36ch] mt-3.5">
            Each landscape has a Landscape Investment Plan — a place-based costing and
            implementation roadmap. <strong className="text-deep-teal">{publishedCount}</strong>{" "}
            published, <strong className="text-deep-teal">{11 - publishedCount}</strong>{" "}
            in preparation.
          </p>
          <div className="mt-4 flex gap-2.5 items-center">
            <span className="w-6 h-px bg-amber-deep" />
            <span className="font-mono text-[10.5px] uppercase tracking-mono-mid text-ink-soft">
              Place-based, not prescriptive
            </span>
          </div>
        </aside>
      </section>

      <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pb-12">
        <CatLandscapesMap pins={pins} />
      </section>

      <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pb-24 border-t border-line pt-8">
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 list-none p-0 m-0">
          {rows.map((g, i) => {
            const p = LANDSCAPES[g.slug];
            const published = p?.lipStatus === "published";
            // Published landscapes get the warm amber accent — they're ready to deep-dive.
            // In-preparation landscapes get periwinkle — visible signal they're coming.
            const tone = published
              ? {
                  bar: "#C68C2E",
                  soft: "rgba(248,202,124,0.14)",
                  glow: "rgba(248,202,124,0.28)",
                  chipBg: "rgba(248,202,124,0.22)",
                  chipFg: "#C68C2E",
                  statusFg: "#C68C2E",
                }
              : {
                  bar: "#929CC5",
                  soft: "rgba(146,156,197,0.10)",
                  glow: "rgba(146,156,197,0.20)",
                  chipBg: "rgba(146,156,197,0.14)",
                  chipFg: "#5C6796",
                  statusFg: "#767E7E",
                };
            return (
              <li
                key={g.id}
                className="reveal-stagger"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <Link
                  href={`/landscape/${g.slug}`}
                  className="group relative overflow-hidden block rounded-[8px] border border-line bg-paper p-6 h-full transition-all duration-300 ease-out hover:-translate-y-0.5"
                  style={{
                    boxShadow: `0 1px 2px rgba(26,38,37,0.04), 0 10px 28px -14px ${tone.glow}`,
                    backgroundImage: `linear-gradient(180deg, rgba(251,248,242,1) 0%, ${tone.soft} 100%)`,
                  }}
                >
                  <span
                    aria-hidden
                    className="absolute top-0 left-0 right-0 h-[3px]"
                    style={{
                      background: `linear-gradient(90deg, ${tone.bar} 0%, ${tone.bar}cc 60%, transparent 100%)`,
                    }}
                  />
                  <span
                    aria-hidden
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{
                      background: `radial-gradient(ellipse 90% 70% at 100% 100%, ${tone.glow}, transparent 65%)`,
                    }}
                  />

                  <div className="relative flex items-center justify-between gap-3 mb-4 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
                    <span>No. {String(i + 1).padStart(2, "0")} / 11</span>
                    <span
                      className="inline-flex items-center justify-center min-w-[28px] h-[22px] px-2 rounded-[3px] font-semibold tracking-[0.10em]"
                      style={{ background: tone.chipBg, color: tone.chipFg }}
                    >
                      {g.stateCode}
                    </span>
                  </div>

                  <h2 className="relative font-serif text-[24px] sm:text-[26px] font-medium leading-[1.15] tracking-[-0.015em] text-ink group-hover:text-teal transition-colors">
                    {p?.name ?? g.name}
                  </h2>
                  {p && (
                    <div className="relative font-mono text-[10px] uppercase tracking-[0.12em] text-teal mt-1.5">
                      {p.district}
                    </div>
                  )}
                  <p className="relative font-sans text-[14.5px] text-ink-soft leading-[1.55] mt-4 max-w-[42ch]">
                    {p?.gloss ?? "A CAT focus landscape."}
                  </p>

                  <div className="relative mt-6 flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.16em]">
                    <span
                      className="inline-flex items-center gap-1.5"
                      style={{ color: tone.statusFg }}
                    >
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full"
                        style={{ background: tone.bar }}
                      />
                      {published ? "LIP published" : "LIP in preparation"}
                    </span>
                    <span className="text-teal group-hover:text-amber-deep group-hover:translate-x-0.5 transition-all">
                      Read →
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
