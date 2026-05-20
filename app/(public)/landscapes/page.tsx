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

      <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pb-24 border-t border-line pt-2">
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-line-soft border border-line-soft list-none p-0 m-0 mt-6">
          {rows.map((g, i) => {
            const p = LANDSCAPES[g.slug];
            return (
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
                    {p?.name ?? g.name}
                  </h2>
                  {p && (
                    <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-teal mt-1.5">
                      {p.district}
                    </div>
                  )}
                  <p className="font-serif text-[15px] text-ink-soft leading-[1.55] mt-3">
                    {p?.gloss ?? "A CAT focus landscape."}
                  </p>
                  <div className="mt-5 flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.16em]">
                    <span
                      className={
                        p?.lipStatus === "published"
                          ? "text-amber-deep font-semibold"
                          : "text-muted"
                      }
                    >
                      {p?.lipStatus === "published" ? "LIP published" : "LIP in preparation"}
                    </span>
                    <span className="text-teal group-hover:text-amber-deep transition-colors">
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
