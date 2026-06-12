import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { Reveal } from "@/components/ui/Reveal";
import { AnchorPartners } from "@/components/landscape/AnchorPartners";
import { LandscapeScrollytelling } from "@/components/landscape/LandscapeScrollytelling";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "CAT Landscapes",
  description:
    "CAT works at the scale of landscapes, block-level administrative units selected for ecological, social, and institutional reasons. Eleven landscapes across India.",
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
      <Reveal as="section" delay={0} className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-12 sm:pt-16 lg:pt-20 pb-10 grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-10 lg:gap-16 items-end">
        <div className="reveal-stagger" style={{ animationDelay: "0ms" }}>
          <span className="eyebrow">Curated by CAT · the closed set</span>
          <h1 className="font-sans font-semibold tracking-[-0.035em] text-hero-xl text-ink mt-4">
            CAT <span className="text-teal">Landscapes</span>
          </h1>
          <p className="text-[17px] sm:text-[19px] text-ink-soft leading-[1.55] tracking-[-0.01em] max-w-[52ch] mt-6">
            Eleven landscapes across India where the Consortium is working with partners on
            seven-year investment plans. A landscape is an economically viable, contiguous
            unit of land, adapted to local need, usually an administrative block or a
            cluster of villages within one, chosen because the geography, communities and
            institutions there make focused work possible.
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
            Each landscape has a Landscape Investment Plan, a place-based costing and
            implementation roadmap. <strong className="text-deep-teal">{publishedCount}</strong>{" "}
            published, <strong className="text-deep-teal">{11 - publishedCount}</strong>{" "}
            in preparation.
          </p>
          <div className="mt-4 flex gap-2.5 items-center">
            <span className="w-6 h-px bg-amber-deep" />
            <span className="font-mono text-[10.5px] uppercase tracking-mono-mid text-ink-soft">
              Seven-year horizon
            </span>
          </div>
        </aside>
      </Reveal>

      <LandscapeScrollytelling pins={pins} />

      <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pb-24 border-t border-line pt-16 lg:pt-20">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 mb-8">
          <div>
            <span className="eyebrow">The index</span>
            <h2 className="font-sans font-semibold text-[clamp(26px,3vw,40px)] tracking-[-0.03em] leading-[1.05] text-ink mt-3">
              All eleven, at a glance
            </h2>
          </div>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted flex items-center gap-4 pb-1.5">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "#2E7573" }} />
              Plan published
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "#929CC5" }} />
              In preparation
            </span>
          </p>
        </div>

        {/* Compact atlas index. The rich, photo-led panels are above; this is the
            quick-jump directory. Hairline-separated cells, toned by plan status
            with the two CAT colour ramps. 12 cells (11 + Atlas) divide cleanly
            across 2 / 3 / 4 columns so no row is ever left ragged. */}
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-line rounded-[14px] overflow-hidden border border-line list-none p-0 m-0">
          {rows.map((g, i) => {
            const p = LANDSCAPES[g.slug];
            const published = p?.lipStatus === "published";
            const accent = published ? "#2E7573" : "#5E6990";
            const dot = published ? "#2E7573" : "#929CC5";
            const chipBg = published ? "#E1EDE8" : "#D0DAEF";
            const chipFg = published ? "#2E7573" : "#5E6990";
            const wash = published
              ? "linear-gradient(180deg, rgba(225,237,232,0.9) 0%, rgba(225,237,232,0.28) 100%)"
              : "linear-gradient(180deg, rgba(208,218,239,0.9) 0%, rgba(208,218,239,0.28) 100%)";
            return (
              <li key={g.id} className="reveal-stagger" style={{ animationDelay: `${i * 40}ms` }}>
                <Link
                  href={`/landscape/${g.slug}`}
                  className="group relative flex flex-col h-full bg-paper px-5 py-5 sm:px-6 sm:py-7 min-h-[156px] overflow-hidden"
                >
                  <span
                    aria-hidden
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out pointer-events-none"
                    style={{ background: wash }}
                  />
                  <span
                    aria-hidden
                    className="absolute top-0 left-0 right-0 h-[2px] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out pointer-events-none"
                    style={{ background: accent }}
                  />

                  <div className="relative flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                    <span className="tabular-nums">No. {String(i + 1).padStart(2, "0")}</span>
                    <span
                      className="inline-flex items-center justify-center min-w-[26px] h-[20px] px-1.5 rounded-[3px] font-semibold tracking-[0.10em]"
                      style={{ background: chipBg, color: chipFg }}
                    >
                      {g.stateCode}
                    </span>
                  </div>

                  <h3 className="relative font-sans text-[21px] sm:text-[23px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink mt-4 group-hover:text-teal transition-colors">
                    {p?.name ?? g.name}
                  </h3>
                  {p && (
                    <div className="relative font-mono text-[9.5px] uppercase tracking-[0.12em] text-teal mt-1.5">
                      {p.district}
                    </div>
                  )}

                  <div className="relative mt-auto pt-5 flex items-center justify-between gap-2 font-mono text-[9.5px] uppercase tracking-[0.14em]">
                    <span className="inline-flex items-center gap-1.5" style={{ color: chipFg }}>
                      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: dot }} />
                      {published ? "Published" : "In preparation"}
                    </span>
                    <span
                      aria-hidden
                      className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
                      style={{ color: accent }}
                    >
                      &rarr;
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}

          <li className="reveal-stagger" style={{ animationDelay: `${rows.length * 40}ms` }}>
            <Link
              href="/map"
              className="group relative flex flex-col justify-between h-full px-5 py-5 sm:px-6 sm:py-7 min-h-[156px] overflow-hidden"
              style={{ background: "linear-gradient(155deg, #2E7573 0%, #334B4A 100%)" }}
            >
              <span className="relative font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: "#B8CCCA" }}>
                Go wider
              </span>
              <span className="relative">
                <span className="block font-sans text-[19px] sm:text-[21px] font-semibold leading-[1.12] tracking-[-0.02em] text-paper">
                  The Solutions Atlas
                </span>
                <span
                  className="mt-2 inline-flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] transition-colors group-hover:text-paper"
                  style={{ color: "#B8CCCA" }}
                >
                  Every landscape, and beyond
                  <span className="transition-transform duration-300 group-hover:translate-x-0.5">&rarr;</span>
                </span>
              </span>
            </Link>
          </li>
        </ul>
      </section>
      <AnchorPartners />
    </>
  );
}
