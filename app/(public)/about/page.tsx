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
          <h1 className="font-sans font-semibold text-hero-xl text-ink mt-4 tracking-[-0.035em] leading-[1.0]">
            A repository of <span className="text-teal">food systems</span> initiatives,
            landscapes, and learning from across India
          </h1>
          <p className="text-[16.5px] sm:text-[18px] text-ink-soft leading-[1.55] tracking-[-0.01em] max-w-[54ch] mt-6">
            The Transformation Hub has been developed by the Consortium for Agroecological
            Transformations to facilitate knowledge sharing on agroecology and food systems
            transitions in India. It documents the real story of agroecology in India, the wins
            and the gaps, as it is unfolding through multiple stewards, initiatives, programmes
            and innovations across the country. It also shines light on one such initiative taking
            form through CAT&apos;s and its partners&apos; efforts: the landscape-based work across
            eleven focus regions in India.
          </p>
          <p className="text-[16.5px] sm:text-[18px] text-ink-soft leading-[1.55] tracking-[-0.01em] max-w-[54ch] mt-4">
            Let&apos;s embark on an exciting journey to discover how we can build more sustainable
            food systems together.
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
            farming households in transitioning towards agroecological practices that enable a sustainable
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
            programmes from across India, including CAT&apos;s own portfolio: government missions,
            NGO programmes, farmer federations, market infrastructure, and research-led
            interventions. The key to being a part of the Hub lies in the strength and credibility
            of the programme.
          </Block>

          <Block label="Who this is for">
            Everyone in food systems: from funders, market enthusiasts, NGOs and their programme
            designers, to researchers, communicators, government and policy actors.
          </Block>
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
          <div className="callout callout-teal">
            <span className="eyebrow block mb-2">Time horizon</span>
            <p className="text-[14px] text-ink-soft leading-[1.55]">
              Agroecological transitions in CAT&apos;s landscape-based planning are mapped across
              seven years, our absolute minimum, as behavioural and policy shifts, viable markets,
              and substantial environmental and economic benefits take even longer to surface.
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
          <div className="callout callout-teal max-w-[66ch] mb-8">
            <span className="eyebrow block mb-2">AI-generated, human-approved</span>
            <p className="text-[15.5px] text-ink-soft leading-[1.6]">
              All content on this Platform is <strong className="text-ink">AI-generated</strong>, but from
              controlled, credible sources.
            </p>
          </div>

          <p className="text-[16.5px] leading-[1.65] text-ink-soft max-w-reading mb-2">
            The Hub carries two kinds of content. <strong className="text-ink">CAT Landscapes</strong> are
            built from each landscape&apos;s Investment Plan: the plan document and its costing become the
            profile, the budget, the reach figures, the modelled climate valuation, and a landscape-scoped
            Ask. <strong className="text-ink">Editorial entries</strong> document credible programmes from
            across India, drafted from public sources. Both are reviewed by a CAT editor before they are
            published; the Hub does not publish an entry silently.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10 lg:gap-12">
            <div className="max-w-reading">
              <Step n="01" title="Sourcing">
                A curated registry of trusted sources is regularly monitored for updates. A weekly AI
                discovery agent suggests new programmes from <code>.gov.in</code>, <code>.org</code>, and
                major news sites, with all findings placed into a review queue before being displayed.
              </Step>
              <Step n="02" title="Drafting (AI)">
                For new candidates or source updates, the AI analyses the content (like HTML and PDFs) and
                creates five narrative blocks: context, attempts, achievements, what worked, and what
                didn&apos;t work. Each sentence includes citation anchors to the source.
              </Step>
              <Step n="03" title="Review (human)">
                A CAT editor reviews the AI draft alongside the source passages, editing prose and
                addressing overclaims.
              </Step>
              <Step n="04" title="Approval (human)">
                Only approved entries are published and included in the library for funders and
                journalists. The last review date is visible for each entry.
              </Step>
              <Step n="05" title="Recency">
                A weekly review updates the source for each published entry. Entries are flagged for
                evaluation if a source changes significantly, and dates older than six months are
                highlighted in red to indicate recency.
              </Step>
              <Step n="06" title="Submissions">
                Organisations can pitch their own programmes to the editors at{" "}
                <a href="/contact" className="text-teal underline-offset-2 hover:underline">info@agroecologyindia.org</a>.
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

      {/* Vision */}
      <Reveal as="section" className="mt-24" delay={160}>
        <div className="reveal-stagger max-w-[60ch]">
          <span className="eyebrow">Our vision</span>
          <p className="text-[20px] sm:text-[22px] text-ink leading-[1.45] mt-4 max-w-[46ch]">
            A future where agroecology enables resilient livelihoods, healthy ecosystems, and
            equitable food systems, rooted in local landscapes and driven by farming communities.
          </p>
          <div className="mt-6 flex gap-3.5 flex-wrap">
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
