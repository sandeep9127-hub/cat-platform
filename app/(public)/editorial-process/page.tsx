export const metadata = {
  title: "Editorial process",
  description:
    "How entries get drafted, reviewed, and published on the Transformation Hub. Plus how AI is used and where it stops.",
};

export default function EditorialProcessPage() {
  return (
    <article className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-12 sm:pt-16 lg:pt-20 pb-24">
      <header className="reveal-stagger" style={{ animationDelay: "0ms" }}>
        <span className="eyebrow">Editorial process</span>
        <h1 className="font-sans font-semibold text-hero-xl tracking-[-0.035em] leading-[0.98] text-ink mt-4">
          How an entry <span className="text-teal">gets published</span>.
        </h1>
        <p className="text-[17px] sm:text-[19px] text-ink-soft leading-[1.55] tracking-[-0.01em] max-w-[50ch] mt-6">
          AI scales the production work. Editors decide what publishes. This page explains the
          loop in full, in plain language.
        </p>
      </header>

      <section className="mt-16 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10 lg:gap-12">
        <div className="max-w-reading">
          <Step n="01" title="Sourcing">
            A registry of around 80 to 150 trusted sources is crawled weekly. State agriculture
            departments, NABARD and IFAD project pages, key research institutions, partner
            annual reports. A separate discovery agent uses Claude to propose new programmes
            from web search, allowlisted to <code>.gov.in</code>, <code>.org</code>, and major
            news domains. The output lands in a queue, not the public surface.
          </Step>

          <Step n="02" title="Drafting">
            For new candidates or detected source updates, Claude reads the source content
            (HTML, PDFs at draft time) and drafts the five narrative blocks of an entry: context,
            attempted, achieved, what worked, what did not work. Every sentence carries
            citation anchors back to the source passages.
          </Step>

          <Step n="03" title="Review">
            A CAT editor opens the draft in the admin desk and reads it side by side with the
            source passages. They edit prose, fix tone, push back on overclaims, flag where the
            programme&apos;s own materials are not honest enough about limitations.
          </Step>

          <Step n="04" title="Approval">
            The editor approves, returns for edits, or rejects. Approved entries publish to the
            public surface and become part of the library funders and journalists read. The
            full revision history stays in the admin desk; only the latest version is public,
            with the last-reviewed date visible on every entry.
          </Step>

          <Step n="05" title="Freshness">
            A daily sweep re-fetches the source for every published entry. When a source has
            changed materially, the entry is flagged as <code>needs_update</code> with a
            one-line diff summary. Public prose is never edited silently. Stale dates older
            than six months turn red as a freshness signal.
          </Step>

          <Step n="06" title="Submissions">
            Organisations can pitch their own programmes to the editors at{" "}
            <a href="/contact" className="text-teal underline-offset-2 hover:underline">
              editors@cat.org.in
            </a>
            . Submissions enter the same review queue. Endorsement on the public surface
            indicates whether CAT vouches for the description.
          </Step>
        </div>

        <aside className="flex flex-col gap-8 lg:sticky lg:top-24 lg:self-start">
          <div className="callout callout-amber">
            <span className="eyebrow block mb-3">Endorsement tiers</span>
            <ul className="list-none p-0 m-0 flex flex-col gap-3 text-[13.5px] text-ink-soft leading-[1.55]">
              <li>
                <strong className="text-amber-deep font-semibold">CAT Authored</strong>
                <br />
                CAT researched and wrote the entry. CAT vouches for the prose.
              </li>
              <li>
                <strong className="text-teal font-semibold">CAT Endorsed</strong>
                <br />
                Submitted by the lead organisation. Reviewed and endorsed by CAT.
              </li>
              <li>
                <strong className="text-muted font-semibold">CAT Listed</strong>
                <br />
                Listed because the programme exists. CAT does not vouch for the description.
              </li>
            </ul>
          </div>

          <div className="callout callout-teal">
            <span className="eyebrow block mb-3">Where AI stops</span>
            <ul className="list-none p-0 m-0 flex flex-col gap-2 text-[13.5px] text-ink-soft leading-[1.55]">
              <li>AI never decides what publishes.</li>
              <li>AI never silently edits a published entry.</li>
              <li>The discovery agent is allowlisted, not the open web.</li>
              <li>Every public entry has been approved by a human.</li>
            </ul>
          </div>
        </aside>
      </section>
    </article>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="my-10 grid grid-cols-[60px_1fr] gap-6 items-start">
      <span className="font-mono text-[12px] uppercase tracking-[0.18em] text-amber-deep font-semibold pt-2 border-t-2 border-amber-deep">
        {n}
      </span>
      <div>
        <h2 className="font-sans font-semibold text-[22px] tracking-[-0.02em] text-ink mb-2">
          {title}
        </h2>
        <div className="text-[16.5px] leading-[1.65] text-ink-soft">{children}</div>
      </div>
    </section>
  );
}
