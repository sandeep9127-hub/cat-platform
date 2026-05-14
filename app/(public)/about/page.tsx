export const metadata = {
  title: "About",
  description:
    "What the CAT Platform is, who it's for, and the editorial bar it holds itself to.",
};

export default function AboutPage() {
  return (
    <article className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-12 sm:pt-16 lg:pt-20 pb-24">
      <header className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-10 lg:gap-16 items-end">
        <div className="reveal-stagger" style={{ animationDelay: "0ms" }}>
          <span className="eyebrow">About</span>
          <h1 className="font-serif font-normal text-hero-xl text-ink mt-4">
            A quiet, <em className="hero-italic italic text-teal not-italic" style={{ fontStyle: "italic" }}>honest</em> record.
          </h1>
          <p className="font-serif italic text-[17px] sm:text-[19px] text-ink-soft leading-[1.45] max-w-[44ch] mt-6 font-light">
            The CAT Platform is a public, curated dashboard of credible food-systems work in
            India. Curated by the Consortium for Agroecological Transformations. Open to anyone
            serious about food.
          </p>
        </div>
        <aside className="lg:border-l lg:border-line lg:pl-7 lg:self-end lg:pb-2 border-t border-line pt-6 lg:border-t-0 lg:pt-0 reveal-stagger" style={{ animationDelay: "180ms" }}>
          <span className="eyebrow">In one line</span>
          <p className="font-serif text-[18px] text-ink leading-[1.5] mt-3.5 max-w-[36ch]">
            We document programmes that are actually changing how India grows, eats, and
            sustains, with limitations as visible as achievements.
          </p>
        </aside>
      </header>

      <section className="mt-20 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10 lg:gap-12">
        <div className="max-w-reading">
          <Block label="Who this is for">
            Funders and their advisors, NGO programme designers, researchers and journalists,
            government and policy actors. In that order, when design choices conflict. Funders
            never need to register. Every link is shareable.
          </Block>

          <Block label="What we cover">
            The Platform covers credible food-systems work nationally, not only CAT&apos;s
            portfolio. Government missions, NGO programmes, federations, market infrastructure,
            research-led interventions. The bar is honesty, not affiliation.
          </Block>

          <Block label="What we don't do">
            Not an internal project-management tool. Not a marketing site. Not a national
            authority. Not a volume-driven directory. The map is illustrative, never a
            survey-grade GIS. Curation is the win condition, not scale.
          </Block>

          <Block label="The editorial bar">
            Treat every entry as if a funder, the originating organisation, and a critical
            journalist will all read it. The &quot;what did not work&quot; field is required design
            infrastructure, not a footnote. Plain language. Short sentences. Voice over jargon.
          </Block>

          <Block label="How AI helps, where it stops">
            AI scales the production work of drafting entries from public sources. AI never
            decides what publishes. Every entry on the public surface has been approved by a
            CAT editor. Read the{" "}
            <a href="/editorial-process" className="text-teal underline-offset-2 hover:underline">
              editorial process page
            </a>{" "}
            for the full loop.
          </Block>
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
          <div className="border-l-2 border-amber-deep pl-4">
            <span className="eyebrow block mb-2">Standing rules</span>
            <ul className="list-none p-0 m-0 flex flex-col gap-2 text-[14px] text-ink-soft leading-[1.55]">
              <li>Curated, not crowdsourced</li>
              <li>Programme level, not activity level</li>
              <li>&quot;What did not work&quot; is required</li>
              <li>AI assists, editors decide</li>
              <li>Funders never register</li>
              <li>Honest provenance, public</li>
              <li>The map is not GIS</li>
            </ul>
          </div>
        </aside>
      </section>
    </article>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
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
