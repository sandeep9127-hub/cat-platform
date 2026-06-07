import { Reveal } from "@/components/ui/Reveal";

export const metadata = {
  title: "Terms",
  description:
    "The editorial agreement between the Transformation Hub, its contributors, and the public reader.",
};

export default function TermsPage() {
  return (
    <article className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-12 sm:pt-16 lg:pt-20 pb-24">
      <Reveal as="header" delay={0}>
        <span className="eyebrow">Terms</span>
        <h1 className="font-sans font-semibold text-[clamp(38px,4.4vw,64px)] leading-[1.02] tracking-[-0.035em] text-ink mt-4">
          The <span className="text-teal">agreement</span>, in short.
        </h1>
        <p className="text-[18px] text-ink-soft leading-[1.6] mt-5 max-w-[58ch]">
          You read. You may submit. We edit. Everyone benefits if we&apos;re honest about it.
        </p>
      </Reveal>

      <Reveal as="section" className="mt-16 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10 lg:gap-12" delay={80}>
        <div className="max-w-reading">
          <Block label="What you may do as a reader">
            <p>
              Read every entry, share URLs, quote with attribution, link to us. No
              registration required. We do not paywall.
            </p>
          </Block>

          <Block label="Citation">
            <p>
              When citing an entry, link to its URL and credit &ldquo;Transformation Hub&rdquo; with the entry
              title and last-reviewed date. For CAT-authored entries you may credit the
              Consortium for Agroecological Transformations as the source.
            </p>
          </Block>

          <Block label="What you grant when you submit">
            <p>
              By submitting an entry, resource, or news item, you grant CAT a non-exclusive,
              irrevocable, royalty-free licence to publish your description, edit it for
              voice and accuracy, and translate it. You retain copyright of your underlying
              materials.
            </p>
            <p className="mt-3">
              You confirm you have the right to share what you submit, including any photos
              or third-party content embedded in it. If a submission turns out to misrepresent
              the work of another organisation, we reserve the right to retract.
            </p>
          </Block>

          <Block label="Our editorial right">
            <p>
              CAT editors may revise prose for plain-language standards, ask you for
              clarifications, push back on overclaims, or decline to publish. The endorsement
              tier (Authored / Endorsed / Listed) on each entry reflects how much editorial
              effort we put in and how much we vouch for the description.
            </p>
          </Block>

          <Block label="What we don&apos;t do">
            <p>
              We do not endorse organisations, only specific entries. Being listed on the
              Platform is not a CAT recommendation of the organisation as a whole. We do not
              broker funding, intermediary services, or business relationships.
            </p>
          </Block>

          <Block label="Liability">
            <p>
              The Platform documents food-systems work. It is editorial reporting, not
              technical advice. Use of any programme&apos;s practices, budgets, or
              methodologies described here is at the reader&apos;s risk. CAT is not liable
              for outcomes from acting on Platform content.
            </p>
          </Block>

          <Block label="Changes">
            <p>
              We will not make material changes to these terms quietly. Updates will be
              announced on{" "}
              <a className="text-teal underline-offset-2 hover:underline" href="/news">
                /news
              </a>{" "}
              and dated at the bottom of this page.
            </p>
          </Block>
        </div>
        <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
          <div className="callout callout-amber">
            <span className="eyebrow block mb-2">Governing law</span>
            <p className="text-[14px] text-ink-soft leading-[1.55]">
              India. Jurisdiction: Bangalore.
            </p>
          </div>
          <div className="callout callout-teal">
            <span className="eyebrow block mb-2">Disputes</span>
            <p className="text-[14px] text-ink-soft leading-[1.55]">
              First step: write to editors@cat.org.in. Most things can be resolved before
              they become disputes.
            </p>
          </div>
        </aside>
      </Reveal>

      <footer className="mt-20 pt-6 border-t border-line font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted">
        Last updated · 20 May 2026
      </footer>
    </article>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="my-8">
      <h2 className="font-sans font-semibold tracking-[-0.02em] text-[15px] text-ink mb-3">
        {label}
      </h2>
      <div className="text-[16.5px] leading-[1.6] text-ink-soft">{children}</div>
    </section>
  );
}
