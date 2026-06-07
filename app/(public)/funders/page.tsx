import { Reveal } from "@/components/ui/Reveal";

export const metadata = {
  title: "Funders",
  description:
    "Who funds the Transformation Hub, how editorial independence is held, and what funders cannot influence.",
};

export default function FundersPage() {
  return (
    <article className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-12 sm:pt-16 lg:pt-20 pb-24">
      <Reveal as="header" delay={0}>
        <span className="eyebrow">Funders</span>
        <h1 className="font-sans font-semibold text-[clamp(38px,4.4vw,64px)] leading-[0.98] tracking-[-0.04em] text-ink mt-4">
          Who <span className="text-teal">funds</span> this Platform.
        </h1>
        <p className="text-[18px] text-ink-soft leading-[1.55] tracking-[-0.01em] mt-5 max-w-[58ch]">
          CAT is a multi-funder consortium. The Platform sits inside CAT&apos;s programme
          budget. Funders see entries the same time you do, after editors sign off.
        </p>
      </Reveal>

      <Reveal as="section" delay={80} className="mt-16 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10 lg:gap-12">
        <div className="max-w-reading">
          <Block label="Funder relationships">
            <p>
              CAT&apos;s landscape work is co-funded by philanthropies and development
              institutions working on Indian food systems. Current funder relationships
              include philanthropic foundations active in rural India, multilateral
              development finance, and Indian impact funds.
            </p>
            <p className="mt-3">
              Each landscape investment plan on the Platform names its funder mix on the
              landscape page. Aggregate funder lists are maintained on the CAT
              organisational site at{" "}
              <a
                className="text-teal underline-offset-2 hover:underline"
                href="https://agroecologyindia.org"
                target="_blank"
                rel="noreferrer"
              >
                agroecologyindia.org
              </a>
              .
            </p>
          </Block>

          <Block label="What funders cannot influence">
            <p>
              Funders do not approve entries before publication. Funders do not see
              entries about programmes they fund earlier than the public. Funders cannot
              request the removal of a &ldquo;what did not work&rdquo; section from any
              entry they fund.
            </p>
            <p className="mt-3">
              The endorsement tier (Authored, Endorsed, Listed) on each entry is set by
              editors, not by who paid for the underlying programme.
            </p>
          </Block>

          <Block label="What funders can do">
            <p>
              Ask which entries are CAT-authored versus endorsed. Ask for a citation
              format. Request a briefing on landscape-level budget structure or a portfolio
              summary across the 11 CAT landscapes. Submit a programme they fund
              elsewhere for consideration in the Solutions Atlas.
            </p>
            <p className="mt-3">
              Funder briefings come from{" "}
              <a className="text-teal underline-offset-2 hover:underline" href="mailto:editors@cat.org.in">
                editors@cat.org.in
              </a>
              . They are not channelled through partner communications.
            </p>
          </Block>

          <Block label="Why we say this out loud">
            <p>
              Most editorial platforms in development finance read like marketing for
              their funders. We do not want that, and our funders do not want that either.
              Saying the independence rule in public is how we hold it.
            </p>
          </Block>
        </div>
        <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
          <div className="callout callout-amber">
            <span className="eyebrow block mb-2">No registration</span>
            <p className="text-[14px] text-ink-soft leading-[1.55]">
              Funders never need an account to read this Platform. There is no gated tier.
            </p>
          </div>
          <div className="callout callout-teal">
            <span className="eyebrow block mb-2">Briefings</span>
            <p className="text-[14px] text-ink-soft leading-[1.55]">
              For a portfolio briefing or citation format, write to{" "}
              <a className="text-teal underline-offset-2 hover:underline" href="mailto:editors@cat.org.in">
                editors@cat.org.in
              </a>
              .
            </p>
          </div>
        </aside>
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
      <div className="text-[16.5px] leading-[1.65] text-ink-soft">{children}</div>
    </section>
  );
}
