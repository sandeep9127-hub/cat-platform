import Link from "next/link";
import { ThreeLevers } from "@/components/ui/ThreeLevers";
import { Reveal } from "@/components/ui/Reveal";

export const metadata = {
  title: "About",
  description:
    "What the Transformation Hub is, how CAT works through landscapes and levers, and the editorial bar this Platform holds itself to.",
};

export default function AboutPage() {
  return (
    <article className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-12 sm:pt-16 lg:pt-20 pb-24">
      <Reveal as="header" className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-10 lg:gap-16 items-end" delay={0}>
        <div className="reveal-stagger" style={{ animationDelay: "0ms" }}>
          <span className="eyebrow">About</span>
          <h1 className="font-sans font-semibold text-hero-xl text-ink mt-4 tracking-[-0.035em] leading-[0.98]">
            A quiet, <span className="text-teal">honest</span> record
            <br />
            of work that matters.
          </h1>
          <p className="text-[17px] sm:text-[19px] text-ink-soft leading-[1.55] tracking-[-0.01em] max-w-[48ch] mt-6">
            The Transformation Hub is the public face of the Consortium for Agroecological
            Transformations. It documents credible food-systems work across India, anchored in
            CAT&apos;s eleven focus landscapes and extending to the broader fraternity.
          </p>
        </div>
        <aside className="lg:border-l lg:border-line lg:pl-7 lg:self-end lg:pb-2 border-t border-line pt-6 lg:border-t-0 lg:pt-0 reveal-stagger" style={{ animationDelay: "180ms" }}>
          <span className="eyebrow">CAT in one line</span>
          <p className="text-[18px] text-ink leading-[1.5] mt-3.5 max-w-[38ch]">
            A collaborative platform working to enable agroecological transformation at scale
            across India.
          </p>
        </aside>
      </Reveal>

      {/* CAT in their own words */}
      <Reveal as="section" className="mt-20 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10 lg:gap-12" delay={80}>
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
            read, not on who runs it.
          </Block>

          <Block label="The editorial bar">
            Treat every entry as if a funder, the originating organisation, and a critical
            journalist will all read it. The &quot;what did not work&quot; field is required design
            infrastructure, not a footnote. Plain language. Short sentences. Voice over jargon.
            See{" "}
            <a href="#editorial-process" className="text-teal underline-offset-2 hover:underline">
              how an entry gets published
            </a>{" "}
            below, from a public source to a page (and note: entries are AI-generated, human-approved).
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
      </Reveal>

      {/* Editorial process, folded in from the former standalone page */}
      <section id="editorial-process">
        <Reveal as="div" className="mt-24" delay={120}>
          <div className="flex items-baseline gap-4 sm:gap-7 mb-6 flex-wrap">
            <h2 className="font-sans font-semibold text-[26px] sm:text-[30px] lg:text-[34px] tracking-[-0.02em] text-ink">
              How an entry <span className="text-teal">gets published</span>
            </h2>
            <span className="flex-1 h-px bg-line mt-[14px] sm:mt-[18px] hidden sm:block" />
          </div>

          {/* Explicit AI-generated disclosure */}
          <div className="callout callout-teal max-w-[66ch] mb-10">
            <span className="eyebrow block mb-2">AI-generated, human-approved</span>
            <p className="text-[15.5px] text-ink-soft leading-[1.6]">
              To be explicit: the entries on this Platform are{" "}
              <strong className="text-ink">AI-generated</strong>. An AI pipeline drafts each one from
              public sources. A CAT editor then checks every sentence against those sources and approves,
              edits, or rejects it before it is published. AI does the production work; it never makes the
              editorial decision, and it never edits a published entry silently.
            </p>
          </div>

          <p className="text-[16.5px] leading-[1.65] text-ink-soft max-w-reading mb-2">
            The Platform carries two kinds of content. <strong className="text-ink">CAT Landscapes</strong>{" "}
            are built from each landscape&apos;s Investment Plan: the plan document and its costing become the
            profile, the budget, the reach figures, the modelled climate valuation, and a landscape-scoped
            Ask. <strong className="text-ink">Editorial entries</strong> document credible programmes from
            across India, drafted from public sources. Both are reviewed by a CAT editor before they go up;
            the loop below describes the editorial-entry path.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10 lg:gap-12">
            <div className="max-w-reading">
              <Step n="01" title="Sourcing">
                A curated registry of trusted sources is monitored for changes: state agriculture
                departments, NABARD and IFAD project pages, research institutions, partner annual reports.
                A weekly AI discovery agent also proposes new programmes from web search, allowlisted to{" "}
                <code>.gov.in</code>, <code>.org</code>, and major news domains. Everything lands in a
                review queue, not the public surface.
              </Step>
              <Step n="02" title="Drafting (AI)">
                For new candidates or detected source updates, AI reads the source content (HTML, PDFs)
                and drafts the five narrative blocks of an entry: context, attempted, achieved, what
                worked, what did not work. Every sentence carries citation anchors back to the source.
              </Step>
              <Step n="03" title="Review (human)">
                A CAT editor opens the AI draft in the admin desk and reads it side by side with the
                source passages. They edit prose, fix tone, push back on overclaims, and flag where a
                programme&apos;s own materials are not honest enough about limitations.
              </Step>
              <Step n="04" title="Approval (human)">
                The editor approves, returns for edits, or rejects. Approved entries publish and become
                part of the library funders and journalists read. Only the latest version is public, with
                the last-reviewed date visible on every entry.
              </Step>
              <Step n="05" title="Freshness">
                A weekly sweep re-fetches the source for every published entry. When a source changes
                materially, the entry is flagged for review with a one-line diff summary. Public prose is
                never edited silently. Dates older than six months turn red as a freshness signal.
              </Step>
              <Step n="06" title="Submissions">
                Organisations can pitch their own programmes to the editors at{" "}
                <a href="/contact" className="text-teal underline-offset-2 hover:underline">info@agroecologyindia.org</a>.
                Submissions enter the same review queue.
              </Step>
            </div>

            <aside className="flex flex-col gap-8 lg:sticky lg:top-24 lg:self-start">
              <div className="callout callout-teal">
                <span className="eyebrow block mb-3">Where AI stops</span>
                <ul className="list-none p-0 m-0 flex flex-col gap-2 text-[13.5px] text-ink-soft leading-[1.55]">
                  <li>AI never decides what publishes.</li>
                  <li>AI never silently edits a published entry.</li>
                  <li>The discovery agent is allowlisted, not the open web.</li>
                  <li>Every public entry has been approved by a human.</li>
                </ul>
                <p className="mt-3 pt-3 border-t border-line/70 text-[12px] text-muted leading-[1.5]">
                  AI can make mistakes. That is exactly why a human editor checks every entry against its
                  sources before it goes up.
                </p>
              </div>
            </aside>
          </div>
        </Reveal>
      </section>

      {/* Three Levers */}
      <Reveal as="section" className="mt-24" delay={120}>
        <div className="flex items-baseline gap-4 sm:gap-7 mb-7 flex-wrap">
          <h2 className="font-sans font-semibold text-[26px] sm:text-[30px] lg:text-[34px] tracking-[-0.02em] text-ink">
            Three{" "}
            <span className="text-teal">levers</span> for change
          </h2>
          <span className="flex-1 h-px bg-line mt-[14px] sm:mt-[18px] hidden sm:block" />
          <span className="font-mono text-[10px] sm:text-[10.5px] uppercase tracking-mono-wide text-muted">
            Aligned across every landscape
          </span>
        </div>
        <p className="text-[17px] text-ink-soft leading-[1.55] tracking-[-0.01em] max-w-[58ch] mb-7">
          CAT enables agroecological transformation by aligning three levers, policy, markets,
          and finance, to support community-led adoption and long-term transitions.
        </p>
        <ThreeLevers />
      </Reveal>

      {/* SDGs + collaboration */}
      <Reveal as="section" className="mt-24 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16" delay={160}>
        <div className="reveal-stagger">
          <span className="eyebrow">Our vision</span>
          <p className="text-[20px] sm:text-[22px] text-ink leading-[1.45] mt-4 max-w-[44ch]">
            A future where agroecology enables resilient livelihoods, healthy ecosystems, and
            equitable food systems, rooted in local landscapes and driven by farming
            communities.
          </p>
        </div>
        <div className="reveal-stagger" style={{ animationDelay: "120ms" }}>
          <span className="eyebrow">Where we contribute</span>
          <p className="text-[16.5px] text-ink-soft leading-[1.6] mt-4 max-w-[48ch]">
            CAT&apos;s work contributes to multiple Sustainable Development Goals related to
            food security, climate action, biodiversity, and livelihoods. The Platform is one
            way we make that contribution legible, to funders, to peers, and to the public.
          </p>
          <div className="mt-5 flex gap-3.5">
            <Link
              href="/landscapes"
              className="font-mono text-[11px] uppercase tracking-[0.16em] text-deep-teal border-b-2 border-amber pb-1 hover:border-amber-deep transition-colors"
            >
              The CAT Landscapes →
            </Link>
            <a
              href="#editorial-process"
              className="font-mono text-[11px] uppercase tracking-[0.16em] text-teal border-b-2 border-line-soft pb-1 hover:border-teal transition-colors"
            >
              Editorial process →
            </a>
          </div>
        </div>
      </Reveal>
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
      <p className="text-[16.5px] leading-[1.65] text-ink-soft">{children}</p>
    </section>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="my-9 grid grid-cols-[56px_1fr] gap-5 items-start">
      <span className="font-mono text-[12px] uppercase tracking-[0.18em] text-amber-deep font-semibold pt-2 border-t-2 border-amber-deep">
        {n}
      </span>
      <div>
        <h3 className="font-sans font-semibold text-[20px] tracking-[-0.02em] text-ink mb-2">{title}</h3>
        <div className="text-[16px] leading-[1.6] text-ink-soft">{children}</div>
      </div>
    </section>
  );
}
