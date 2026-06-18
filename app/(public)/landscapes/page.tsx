import Link from "next/link";
import Image from "next/image";
import { Mail } from "lucide-react";
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
          <span className="eyebrow">Current Focus · Lighthouses of Transformation</span>
          <h1 className="font-sans font-semibold tracking-[-0.035em] text-hero-xl text-ink mt-4">
            CAT <span className="text-teal">Landscapes</span>
          </h1>
          <p className="text-[17px] sm:text-[19px] text-ink-soft leading-[1.55] tracking-[-0.01em] max-w-[52ch] mt-6">
            Eleven landscapes across India where Consortium partners are working on
            seven-year investment plans for mainstreaming agroecology. A landscape is an
            economically viable, contiguous unit of land, adapted to local needs, usually
            an administrative block or a cluster of villages within one, chosen because the
            geography, communities and institutions there make focused work possible.
          </p>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted mt-5 max-w-[52ch]">
            These are the geographies currently at the heart of CAT&apos;s work. For
            programmes, interventions, and contributed work from across India, see the{" "}
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
            implementation roadmap developed with its anchor partner.
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
        <div className="mb-8 max-w-[62ch]">
          <span className="eyebrow">Landscape Investment Plans</span>
          <h2 className="font-sans font-semibold text-[clamp(26px,3vw,40px)] tracking-[-0.03em] leading-[1.05] text-ink mt-3">
            The eleven plans
          </h2>
          <p className="font-sans text-[15px] text-ink-soft leading-[1.55] mt-3">
            A comprehensive investment plan for each landscape has been prepared. Open the following
            to explore this in brief: the landscape&apos;s profile, the work planned on the ground, and
            its related investment.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="font-sans text-[14px] text-ink-soft">
              For the detailed report, get in touch:
            </span>
            <a
              href="mailto:programmes@agroecologyindia.org?subject=Request%3A%20detailed%20Landscape%20Investment%20Plan"
              className="inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] font-semibold text-paper bg-deep-teal hover:bg-teal rounded-full px-4 py-2 no-underline transition-colors"
            >
              <Mail size={13} strokeWidth={1.9} aria-hidden />
              Email the team
            </a>
          </div>
        </div>

        {/* Cover wall — each landscape's illustrated Investment Plan cover, linking
            to its page. 11 covers + the Atlas card = 12 cells, dividing cleanly
            across 2 / 3 / 4 columns. Covers are A4 portrait (800x1131). */}
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6 list-none p-0 m-0">
          {rows.map((g, i) => {
            const p = LANDSCAPES[g.slug];
            return (
              <li key={g.id} className="reveal-stagger" style={{ animationDelay: `${i * 40}ms` }}>
                <Link href={`/landscape/${g.slug}`} className="group block">
                  <div
                    className="relative overflow-hidden rounded-[10px] border border-line bg-paper aspect-[800/1131]"
                    style={{ boxShadow: "0 1px 2px rgba(26,38,37,0.05), 0 20px 44px -26px rgba(26,38,37,0.45)" }}
                  >
                    <Image
                      src={`/images/landscapes/${g.slug}/cover.jpg`}
                      alt={`${p?.name ?? g.name} — Landscape-Based Investment Plan cover`}
                      width={800}
                      height={1131}
                      sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 22vw"
                      className="w-full h-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.035]"
                    />
                    <span
                      aria-hidden
                      className="absolute inset-0 ring-1 ring-inset ring-black/0 group-hover:ring-teal/30 transition-[box-shadow] duration-300 rounded-[10px] pointer-events-none"
                    />
                  </div>
                  <div className="mt-3 flex items-baseline justify-between gap-2">
                    <span className="font-sans text-[15px] font-semibold tracking-[-0.01em] text-ink group-hover:text-teal transition-colors">
                      {p?.name ?? g.name}
                    </span>
                    <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted shrink-0">
                      {g.stateCode}
                    </span>
                  </div>
                  {p && (
                    <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-teal mt-0.5">
                      {p.district}
                    </div>
                  )}
                </Link>
              </li>
            );
          })}

          <li className="reveal-stagger" style={{ animationDelay: `${rows.length * 40}ms` }}>
            <Link href="/map" className="group block">
              <div
                className="relative overflow-hidden rounded-[10px] aspect-[800/1131] flex flex-col justify-between p-5 sm:p-6"
                style={{
                  background: "linear-gradient(155deg, #2E7573 0%, #334B4A 100%)",
                  boxShadow: "0 1px 2px rgba(26,38,37,0.05), 0 20px 44px -26px rgba(46,117,115,0.5)",
                }}
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: "#B8CCCA" }}>
                  Go wider
                </span>
                <span>
                  <span className="block font-sans text-[20px] sm:text-[23px] font-semibold leading-[1.12] tracking-[-0.02em] text-paper">
                    The Solutions Atlas
                  </span>
                  <span
                    className="mt-2 inline-flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em]"
                    style={{ color: "#B8CCCA" }}
                  >
                    Every landscape, and beyond
                    <span className="transition-transform duration-300 group-hover:translate-x-0.5">&rarr;</span>
                  </span>
                </span>
              </div>
            </Link>
          </li>
        </ul>
      </section>
      <AnchorPartners />
    </>
  );
}
