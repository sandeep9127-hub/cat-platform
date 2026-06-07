export const metadata = {
  title: "Privacy",
  description:
    "What the Transformation Hub stores, what we don't, who to email to remove data.",
};

export default function PrivacyPage() {
  return (
    <article className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-12 sm:pt-16 lg:pt-20 pb-24">
      <header>
        <span className="eyebrow">Privacy</span>
        <h1 className="font-sans font-semibold text-[clamp(38px,4.4vw,64px)] leading-[1.02] tracking-[-0.035em] text-ink mt-4">
          What we <span className="text-teal">store</span>, what we don&apos;t.
        </h1>
        <p className="text-[18px] text-ink-soft leading-[1.6] mt-5 max-w-[58ch]">
          Plain language. No dark patterns. Short.
        </p>
      </header>

      <section className="mt-16 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10 lg:gap-12">
        <div className="max-w-reading">
          <Block label="What we store">
            <p>
              <strong>If you read.</strong> Nothing personally identifying. Aggregate page-view
              counts via Vercel Analytics, which does not set tracking cookies and stores
              data as anonymous hashes. No funnels. No retargeting.
            </p>
            <p className="mt-3">
              <strong>If you submit an entry.</strong> Your email address (for the magic-link
              sign-in and to write back about your submission), the content of your
              submission, and your associated organisation. Stored until you ask us to
              delete.
            </p>
            <p className="mt-3">
              <strong>If you use the AI agent.</strong> The question text and the assistant
              response, an opaque session token (random hash, not linked to you), and the
              IDs of the library passages the agent retrieved. Used to evaluate retrieval
              quality and refusal rates; not linked to a real person.
            </p>
          </Block>

          <Block label="What we don&apos;t">
            <p>
              We do not track you across the web. We do not sell, share, or sublicense any
              data. We do not use third-party analytics that profile you (no Google Analytics,
              no Mixpanel, no Hotjar). We do not show ads.
            </p>
          </Block>

          <Block label="Cookies">
            <p>
              Only one: an Auth.js session cookie, set after you sign in. Functional, not
              tracking. Expires when your session ends. No banner needed because we set no
              tracking cookies.
            </p>
          </Block>

          <Block label="Removal">
            <p>
              Write to{" "}
              <a className="text-teal underline-offset-2 hover:underline" href="mailto:editors@cat.org.in">
                editors@cat.org.in
              </a>{" "}
              and we will remove your account, your submissions (or convert them to
              anonymous if they have been edited and published by other contributors), and
              any agent conversation records linked to your session.
            </p>
          </Block>

          <Block label="Children">
            <p>
              This is a publication for funders, programme designers, researchers, and
              policy actors. It is not directed at children under 18 and does not knowingly
              collect data from minors.
            </p>
          </Block>

          <Block label="Changes">
            <p>
              Material updates to this page will be announced on{" "}
              <a className="text-teal underline-offset-2 hover:underline" href="/news">
                /news
              </a>{" "}
              and dated at the bottom of this page.
            </p>
          </Block>
        </div>
        <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
          <div className="callout callout-amber">
            <span className="eyebrow block mb-2">Operator</span>
            <p className="text-[14px] text-ink-soft leading-[1.55]">
              Consortium for Agroecological Transformations (CAT)
            </p>
          </div>
          <div className="callout callout-teal">
            <span className="eyebrow block mb-2">Data location</span>
            <p className="text-[14px] text-ink-soft leading-[1.55]">
              Postgres in Mumbai (ap-south-1). Hosting at Vercel edge.
            </p>
          </div>
        </aside>
      </section>

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
