export const metadata = {
  title: "Contact",
  description:
    "How to reach the CAT Platform editors, contribute work, or partner with CAT.",
};

export default function ContactPage() {
  return (
    <article className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-12 sm:pt-16 lg:pt-20 pb-24">
      <header>
        <span className="eyebrow">Contact</span>
        <h1 className="font-serif font-normal text-[clamp(38px,4.4vw,64px)] leading-[1.05] tracking-[-0.022em] text-ink mt-4">
          Write to us, <em className="italic text-teal not-italic" style={{ fontStyle: "italic" }}>say what you need</em>.
        </h1>
        <p className="font-serif italic text-[18px] text-ink-soft leading-[1.5] mt-5 max-w-[58ch] font-light">
          Plain emails, no contact forms, no chatbots. We read everything that lands in
          this inbox.
        </p>
      </header>

      <section className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-10">
        <Card label="Editorial">
          <p className="font-serif text-[17px] leading-[1.6] text-ink">
            For submission questions, corrections, takedown requests, and anything about
            entries, resources, or news on the Platform.
          </p>
          <a
            href="mailto:editors@cat.org.in"
            className="mt-4 inline-block font-mono text-[11px] uppercase tracking-[0.16em] text-deep-teal border-b-2 border-amber pb-1 hover:border-amber-deep transition-colors"
          >
            editors@cat.org.in →
          </a>
        </Card>

        <Card label="Communications & partnerships">
          <p className="font-serif text-[17px] leading-[1.6] text-ink">
            For media, partner organisations wanting to collaborate, or research access.
            Vibhusha Gupta leads communications and partnerships at CAT.
          </p>
          <a
            href="https://agroecologyindia.org"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block font-mono text-[11px] uppercase tracking-[0.16em] text-teal border-b-2 border-line-soft pb-1 hover:border-teal transition-colors"
          >
            agroecologyindia.org ↗
          </a>
        </Card>

        <Card label="Submit your work">
          <p className="font-serif text-[17px] leading-[1.6] text-ink">
            If your organisation runs a credible food-systems programme that&apos;s missing
            from the library, send a one-paragraph pitch with a couple of source links.
          </p>
          <a
            href="/contribute"
            className="mt-4 inline-block font-mono text-[11px] uppercase tracking-[0.16em] text-deep-teal border-b-2 border-amber pb-1 hover:border-amber-deep transition-colors"
          >
            Submit a programme →
          </a>
        </Card>

        <Card label="LinkedIn">
          <p className="font-serif text-[17px] leading-[1.6] text-ink">
            Follow CAT&apos;s work, share an entry that resonates, comment on what we got
            right or wrong.
          </p>
          <a
            href="https://www.linkedin.com/company/consortium-for-agroecological-transformations/"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block font-mono text-[11px] uppercase tracking-[0.16em] text-teal border-b-2 border-line-soft pb-1 hover:border-teal transition-colors"
          >
            CAT on LinkedIn ↗
          </a>
        </Card>
      </section>

      <section className="mt-20 border-t border-line pt-12 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10 lg:gap-12">
        <div className="max-w-reading">
          <h2 className="font-serif text-[28px] font-medium tracking-[-0.015em] text-ink">
            What gets a fast reply
          </h2>
          <ul className="list-none p-0 mt-5 flex flex-col gap-2 font-serif text-[16px] text-ink-soft leading-[1.55]">
            <li>· A submission with a clear source URL and a real name</li>
            <li>· A correction with the specific entry slug</li>
            <li>· A funder asking which entries are CAT-authored vs endorsed</li>
            <li>· A researcher asking for a citation format</li>
          </ul>
          <h2 className="font-serif text-[28px] font-medium tracking-[-0.015em] text-ink mt-12">
            What we won&apos;t reply to
          </h2>
          <ul className="list-none p-0 mt-5 flex flex-col gap-2 font-serif text-[16px] text-ink-soft leading-[1.55]">
            <li>· Cold sales pitches for SaaS, AI tools, or consulting services</li>
            <li>· Requests to add an organisation without describing an actual programme</li>
            <li>· Generic press release submissions</li>
          </ul>
        </div>
        <aside className="border-l-2 border-amber-deep pl-4">
          <span className="eyebrow block mb-2">Response time</span>
          <p className="text-[14px] text-ink-soft leading-[1.55]">
            Editorial inbox is read within two working days. Submissions move through review
            in two to four weeks depending on complexity.
          </p>
        </aside>
      </section>
    </article>
  );
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border border-line p-6 sm:p-8 flex flex-col">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-teal font-semibold mb-4">
        {label}
      </span>
      {children}
    </div>
  );
}
