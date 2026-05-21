import Link from "next/link";
import { ThreeLevers } from "@/components/ui/ThreeLevers";

export const metadata = {
  title: "About",
  description:
    "What the Transformation Hub is, how CAT works through landscapes and levers, and the editorial bar this Platform holds itself to.",
};

export default function AboutPage() {
  return (
    <article className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-12 sm:pt-16 lg:pt-20 pb-24">
      <header className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-10 lg:gap-16 items-end">
        <div className="reveal-stagger" style={{ animationDelay: "0ms" }}>
          <span className="eyebrow">About</span>
          <h1 className="font-serif font-normal text-hero-xl text-ink mt-4">
            A quiet, <em className="hero-italic italic text-teal not-italic" style={{ fontStyle: "italic" }}>honest</em> record
            <br />
            of work that matters.
          </h1>
          <p className="font-serif italic text-[17px] sm:text-[19px] text-ink-soft leading-[1.45] max-w-[48ch] mt-6 font-light">
            The Transformation Hub is the public face of the Consortium for Agroecological
            Transformations. It documents credible food-systems work across India, anchored in
            CAT&apos;s eleven focus landscapes and extending to the broader fraternity.
          </p>
        </div>
        <aside className="lg:border-l lg:border-line lg:pl-7 lg:self-end lg:pb-2 border-t border-line pt-6 lg:border-t-0 lg:pt-0 reveal-stagger" style={{ animationDelay: "180ms" }}>
          <span className="eyebrow">CAT in one line</span>
          <p className="font-serif text-[18px] text-ink leading-[1.5] mt-3.5 max-w-[38ch]">
            A collaborative platform working to enable agroecological transformation at scale
            across India.
          </p>
        </aside>
      </header>

      {/* CAT in their own words */}
      <section className="mt-20 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10 lg:gap-12">
        <div className="max-w-reading">
          <Block label="What CAT does">
            CAT (Consortium for Agroecological Transformations) supports India&apos;s 40 million
            farmers in transitioning towards agroecological practices that enable a sustainable
            and equitable food system. It unites diverse stakeholders for collaborative action
            on interlinked challenges: climate change, nutritional insecurity, farmer debt,
            biodiversity loss, and natural-resource degradation.
          </Block>

          <Block label="The landscape approach">
            CAT works at the scale of landscapes. Each landscape is broadly a block-level
            administrative unit, selected for ecological, social, and institutional reasons.
            Coordinated services, institutions, and finance work together over a sustained
            period of at least seven years. CAT is currently developing investment and
            implementation plans across{" "}
            <Link href="/landscapes" className="text-teal underline-offset-2 hover:underline">
              eleven CAT Landscapes
            </Link>
            .
          </Block>

          <Block label="What this Platform is">
            This is the publicly readable face of that work. It covers credible food-systems
            programmes from across India, not just CAT&apos;s own portfolio: government missions,
            NGO programmes, farmer federations, market infrastructure, research-led
            interventions. Whether it&apos;s in here depends on whether it stands up to a serious
            read — not on who runs it.
          </Block>

          <Block label="The editorial bar">
            Treat every entry as if a funder, the originating organisation, and a critical
            journalist will all read it. The &quot;what did not work&quot; field is required design
            infrastructure, not a footnote. Plain language. Short sentences. Voice over jargon.
            Read the{" "}
            <Link href="/editorial-process" className="text-teal underline-offset-2 hover:underline">
              editorial process
            </Link>{" "}
            for how an entry gets from a public source to a published page.
          </Block>

          <Block label="Who this is for">
            Funders and their advisors. NGO programme designers. Researchers and journalists.
            Government and policy actors. In that order, when design choices conflict. Funders
            never need to register. Every URL is shareable.
          </Block>
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
          <div className="callout callout-amber">
            <span className="eyebrow block mb-2">Standing rules</span>
            <ul className="list-none p-0 m-0 flex flex-col gap-2 text-[14px] text-ink-soft leading-[1.55]">
              <li>Every entry is edited by hand</li>
              <li>Programme level, not activity level</li>
              <li>&quot;What did not work&quot; is required</li>
              <li>AI assists, editors decide</li>
              <li>Funders never register</li>
              <li>Provenance is shown openly</li>
              <li>The map is not GIS</li>
            </ul>
          </div>
          <div className="callout callout-teal">
            <span className="eyebrow block mb-2">Time horizon</span>
            <p className="text-[14px] text-ink-soft leading-[1.55]">
              Agroecological transitions are seven-year projects at minimum. The Platform
              reflects that pace. Programmes are added when there is something defensible to
              say, not on a release schedule.
            </p>
          </div>
        </aside>
      </section>

      {/* Three Levers */}
      <section className="mt-24">
        <div className="flex items-baseline gap-4 sm:gap-7 mb-7 flex-wrap">
          <h2 className="font-serif text-[26px] sm:text-[30px] lg:text-[34px] font-normal tracking-[-0.015em] text-ink">
            Three{" "}
            <em className="italic text-teal font-normal">levers</em> for change
          </h2>
          <span className="flex-1 h-px bg-line mt-[14px] sm:mt-[18px] hidden sm:block" />
          <span className="font-mono text-[10px] sm:text-[10.5px] uppercase tracking-mono-wide text-muted">
            Aligned across every landscape
          </span>
        </div>
        <p className="font-serif italic text-[17px] text-ink-soft leading-[1.5] max-w-[58ch] mb-7 font-light">
          CAT enables agroecological transformation by aligning three levers — policy, markets,
          and finance — to support community-led adoption and long-term transitions.
        </p>
        <ThreeLevers />
      </section>

      {/* SDGs + collaboration */}
      <section className="mt-24 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
        <div className="reveal-stagger">
          <span className="eyebrow">Our vision</span>
          <p className="font-serif text-[20px] sm:text-[22px] text-ink leading-[1.45] mt-4 max-w-[44ch]">
            A future where agroecology enables resilient livelihoods, healthy ecosystems, and
            equitable food systems, rooted in local landscapes and driven by farming
            communities.
          </p>
        </div>
        <div className="reveal-stagger" style={{ animationDelay: "120ms" }}>
          <span className="eyebrow">Where we contribute</span>
          <p className="font-serif text-[16.5px] text-ink-soft leading-[1.6] mt-4 max-w-[48ch]">
            CAT&apos;s work contributes to multiple Sustainable Development Goals related to
            food security, climate action, biodiversity, and livelihoods. The Platform is one
            way we make that contribution legible — to funders, to peers, and to the public.
          </p>
          <div className="mt-5 flex gap-3.5">
            <Link
              href="/landscapes"
              className="font-mono text-[11px] uppercase tracking-[0.16em] text-deep-teal border-b-2 border-amber pb-1 hover:border-amber-deep transition-colors"
            >
              The CAT Landscapes →
            </Link>
            <Link
              href="/editorial-process"
              className="font-mono text-[11px] uppercase tracking-[0.16em] text-teal border-b-2 border-line-soft pb-1 hover:border-teal transition-colors"
            >
              Editorial process →
            </Link>
          </div>
        </div>
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
