import { AtlasSection } from "@/components/entries/AtlasSection";
import { getPublishedEntries, getOverviewCounts } from "@/lib/db/queries";

export const revalidate = 60;
export const metadata = {
  title: "Atlas",
  description: "Every food-systems programme tracked by CAT, plotted on India.",
};

export default async function MapPage() {
  const [entries, counts] = await Promise.all([getPublishedEntries(), getOverviewCounts()]);

  const mapEntries = entries
    .filter((e) => e.primaryGeography.latitude && e.primaryGeography.longitude)
    .map((e) => ({
      id: e.id,
      slug: e.slug,
      title: e.title,
      scaleBand: e.scaleBand,
      provenance: e.provenance,
      stateCode: e.primaryGeography.stateCode ?? "",
      latitude: e.primaryGeography.latitude,
      longitude: e.primaryGeography.longitude,
    }));

  const listEntries = entries.map((e, i) => ({
    id: e.id,
    slug: e.slug,
    index: i + 1,
    total: entries.length,
    title: e.title,
    tagline: e.tagline,
    stateName: e.primaryGeography.name,
    startYear: e.startYear,
    endYear: e.endYear,
    scaleBand: e.scaleBand,
    catEndorsement: e.catEndorsement,
    themes: e.themes,
  }));

  return (
    <>
      <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-12 sm:pt-16 lg:pt-20 pb-8 grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-10 lg:gap-16 items-end">
        <div className="reveal-stagger" style={{ animationDelay: "0ms" }}>
          <span className="eyebrow">An illustrative atlas</span>
          <h1 className="font-serif font-normal text-hero-xl text-ink mt-4">
            India,{" "}
            <em className="hero-italic italic text-teal not-italic" style={{ fontStyle: "italic" }}>
              programme by programme
            </em>
            .
          </h1>
          <p className="font-serif italic text-[17px] sm:text-[19px] text-ink-soft leading-[1.45] max-w-[44ch] mt-6 font-light">
            Each dot is a programme at the scale we have published it. Halo size encodes scale.
            Teal is self-submitted; amber is CAT-sourced. This is a publication illustration,
            not a survey-grade GIS.
          </p>
        </div>
        <aside className="lg:border-l lg:border-line lg:pl-7 lg:self-end lg:pb-2 border-t border-line pt-6 lg:border-t-0 lg:pt-0 reveal-stagger" style={{ animationDelay: "180ms" }}>
          <span className="eyebrow">In the atlas</span>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
            <div>
              <dt>Programmes</dt>
              <dd className="font-serif text-[26px] text-deep-teal mt-1 leading-none tracking-[-0.02em]">
                {counts.programmes}
              </dd>
            </div>
            <div>
              <dt>States</dt>
              <dd className="font-serif text-[26px] text-deep-teal mt-1 leading-none tracking-[-0.02em]">
                {counts.states}
              </dd>
            </div>
          </dl>
        </aside>
      </section>

      <AtlasSection mapEntries={mapEntries} listEntries={listEntries} totalStates={counts.states} />
    </>
  );
}
