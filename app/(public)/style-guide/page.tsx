import { Reveal } from "@/components/ui/Reveal";

export const metadata = {
  title: "Style guide",
  description:
    "How the Transformation Hub writes, edits, and labels its entries. The editorial standards behind every page.",
};

export default function StyleGuidePage() {
  return (
    <article className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-12 sm:pt-16 lg:pt-20 pb-24">
      <Reveal as="header" delay={0}>
        <span className="eyebrow">Style guide</span>
        <h1 className="font-sans font-semibold text-[clamp(38px,4.4vw,64px)] leading-[0.98] tracking-[-0.04em] text-ink mt-4">
          How we <span className="text-teal">write</span>, what we label.
        </h1>
        <p className="text-[18px] text-ink-soft leading-[1.55] tracking-[-0.01em] mt-5 max-w-[58ch]">
          The Platform reads like a quiet editor wrote it, because one did. These are the
          standards every entry follows before it goes live.
        </p>
      </Reveal>

      <Reveal as="section" className="mt-16 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10 lg:gap-12" delay={80}>
        <div className="max-w-reading">
          <Block label="Voice">
            <p>
              Plain language. Short sentences. Specifics over abstractions. We write as if
              briefing a thoughtful funder over coffee, not pitching a panel.
            </p>
            <p className="mt-3">
              Active verbs. Real numbers. Place names. We do not use marketing words like
              &ldquo;leverage&rdquo;, &ldquo;stakeholder&rdquo;, &ldquo;ecosystem&rdquo;,
              &ldquo;transformative&rdquo;, or &ldquo;synergy&rdquo;.
            </p>
          </Block>

          <Block label="Punctuation">
            <p>
              No em dashes. We use commas, full stops, parentheses, and colons. The em dash
              tempts writers into long, performative sentences. We prefer the discipline of
              the period.
            </p>
            <p className="mt-3">
              Indian English spelling (organise, programme, centre). Numbers under ten in
              words, ten and above in numerals, except budgets and population counts.
            </p>
          </Block>

          <Block label="Endorsement tiers">
            <p>
              Every entry carries one of three labels, shown next to the title:
            </p>
            <ul className="list-none p-0 mt-3 flex flex-col gap-2">
              <li>
                <strong>Authored.</strong> CAT editors wrote the entry. We vouch for the
                reading.
              </li>
              <li>
                <strong>Endorsed.</strong> A partner organisation wrote it, CAT edited it
                and stands behind the description.
              </li>
              <li>
                <strong>Listed.</strong> The programme exists and is documented; CAT has
                not done deep editorial work yet.
              </li>
            </ul>
            <p className="mt-3">
              The tier is not a quality ranking of the programme. It is a transparency
              label about our own editorial effort.
            </p>
          </Block>

          <Block label="What every entry must carry">
            <p>
              A programme entry is not published until it has all five sections:
            </p>
            <ul className="list-none p-0 mt-3 flex flex-col gap-2">
              <li>· Context (where, who, why now)</li>
              <li>· What is being done (programme level, not activity level)</li>
              <li>· What is working (with evidence and dates)</li>
              <li>· What is not working (this is infrastructure, not optional)</li>
              <li>· What we are watching next</li>
            </ul>
          </Block>

          <Block label="The eight themes">
            <p>
              Entries are tagged to one or more of: Soil health, Water, Seeds and
              biodiversity, Farmer livelihoods, Nutrition and food access, Climate
              resilience, Markets and value chains, Policy and finance. Cross-cutting work
              gets multiple tags.
            </p>
          </Block>

          <Block label="Scale bands">
            <p>
              We do not publish exact household reach for in-progress programmes (it
              encourages overclaim). We use bands: under 1,000 households, 1k to 10k, 10k
              to 100k, over 100k. Completed programmes can carry their final published
              number.
            </p>
          </Block>

          <Block label="What we do not publish">
            <p>
              Activity-level entries (one training, one meeting). Pitches without evidence.
              Cold press releases. Pure advocacy without programme grounding. Anything
              about minors. Programmes the contributor cannot vouch for first-hand.
            </p>
          </Block>

          <Block label="The map is illustrative">
            <p>
              The India map on this Platform is an editorial illustration of where work is
              happening, not a GIS layer. Pin placement is approximate to district. Do not
              cite it for boundary or area decisions.
            </p>
          </Block>
        </div>
        <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
          <div className="callout callout-amber">
            <span className="eyebrow block mb-2">Principle</span>
            <p className="text-[14px] text-ink-soft leading-[1.55]">
              Every entry is edited by hand. AI is allowed to draft and surface candidates; the call to publish is always a human one.
            </p>
          </div>
          <div className="callout callout-teal">
            <span className="eyebrow block mb-2">Questions</span>
            <p className="text-[14px] text-ink-soft leading-[1.55]">
              Write to{" "}
              <a className="text-teal underline-offset-2 hover:underline" href="mailto:info@agroecologyindia.org">
                info@agroecologyindia.org
              </a>{" "}
              if a published entry reads off-tone or off-fact.
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
      <span className="eyebrow block mb-3">{label}</span>
      <div className="text-[16.5px] leading-[1.65] text-ink-soft">{children}</div>
    </section>
  );
}
