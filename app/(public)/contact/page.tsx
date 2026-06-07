import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { StaggerReveal } from "@/components/ui/StaggerReveal";

export const metadata = {
  title: "Contact",
  description:
    "How to reach the Transformation Hub editors, submit work, or partner with CAT.",
};

export default function ContactPage() {
  return (
    <article className="pb-24">
      {/* Header — broadsheet, all-Inter */}
      <Reveal as="section" className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-12 sm:pt-16 lg:pt-20 pb-10" delay={0}>
        <span className="eyebrow">Contact</span>
        <h1 className="font-sans font-semibold text-[clamp(38px,5vw,72px)] tracking-[-0.04em] leading-[0.98] text-ink mt-4 max-w-[16ch] reveal-stagger">
          Write to us, <span className="text-teal">say what you need</span>.
        </h1>
        <p className="text-[16.5px] sm:text-[18px] text-ink-soft leading-[1.55] tracking-[-0.01em] mt-6 max-w-[56ch] reveal-stagger" style={{ animationDelay: "120ms" }}>
          Plain emails, no contact forms, no chatbots. We read everything that lands in
          this inbox.
        </p>
      </Reveal>

      {/* Channels — hairline-grid panel (no individual card borders) */}
      <Reveal as="section" className="max-w-page mx-auto px-5 sm:px-7 lg:px-10" delay={80}>
        <StaggerReveal className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-line border border-line">
          <Channel
            label="Editorial"
            body="For submission questions, corrections, takedown requests, and anything about entries, resources, or news on the Hub."
            href="mailto:editors@cat.org.in"
            cta="editors@cat.org.in"
            accent="amber"
          />
          <Channel
            label="Communications & partnerships"
            body="For media, partner organisations wanting to collaborate, or research access. Vibhusha Gupta leads communications and partnerships at CAT."
            href="https://agroecologyindia.org"
            cta="agroecologyindia.org"
            external
          />
          <Channel
            label="Submit your work"
            body="If your organisation runs a credible food-systems programme that's missing from the library, send a one-paragraph pitch with a couple of source links."
            href="mailto:editors@cat.org.in?subject=Programme%20submission"
            cta="Submit a programme"
            accent="amber"
          />
          <Channel
            label="LinkedIn"
            body="Follow CAT's work, share an entry that resonates, comment on what we got right or wrong."
            href="https://www.linkedin.com/company/consortium-for-agroecological-transformations/"
            cta="CAT on LinkedIn"
            external
          />
        </StaggerReveal>
      </Reveal>

      {/* Triage — soft cream band */}
      <Reveal as="section" className="bg-cream border-t border-line mt-16" delay={120}>
        <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 py-16 lg:py-20 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-10 lg:gap-14">
          <div className="max-w-[60ch]">
            <h2 className="font-sans font-semibold text-[22px] sm:text-[26px] tracking-[-0.02em] text-ink">
              What gets a fast reply
            </h2>
            <ul className="list-none p-0 mt-4 flex flex-col gap-2 text-[15.5px] text-ink-soft leading-[1.55]">
              <li>A submission with a clear source URL and a real name</li>
              <li>A correction with the specific entry slug</li>
              <li>A funder asking which entries are CAT-authored vs endorsed</li>
              <li>A researcher asking for a citation format</li>
            </ul>
            <h2 className="font-sans font-semibold text-[22px] sm:text-[26px] tracking-[-0.02em] text-ink mt-12">
              What we won&apos;t reply to
            </h2>
            <ul className="list-none p-0 mt-4 flex flex-col gap-2 text-[15.5px] text-ink-soft leading-[1.55]">
              <li>Cold sales pitches for SaaS, AI tools, or consulting services</li>
              <li>Requests to add an organisation without describing an actual programme</li>
              <li>Generic press release submissions</li>
            </ul>
          </div>
          <aside className="bg-paper border border-line rounded-[10px] p-6 self-start">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-amber-deep font-semibold">
              Response time
            </span>
            <p className="text-[14px] text-ink-soft leading-[1.55] mt-2.5">
              The editorial inbox is read within two working days. Submissions move through
              review in two to four weeks depending on complexity.
            </p>
          </aside>
        </div>
      </Reveal>
    </article>
  );
}

function Channel({
  label,
  body,
  href,
  cta,
  accent = "line",
  external = false,
}: {
  label: string;
  body: string;
  href: string;
  cta: string;
  accent?: "amber" | "line";
  external?: boolean;
}) {
  return (
    <div className="bg-paper p-6 sm:p-8 flex flex-col min-h-[208px]">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-amber-deep font-semibold mb-3">
        {label}
      </span>
      <p className="text-[15px] leading-[1.6] text-ink-soft">{body}</p>
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
        className={
          "group mt-auto pt-6 inline-flex items-center gap-1.5 self-start font-mono text-[11px] uppercase tracking-[0.14em] pb-1 border-b-2 transition-colors " +
          (accent === "amber"
            ? "text-deep-teal border-amber hover:border-amber-deep"
            : "text-teal border-line-soft hover:border-teal")
        }
      >
        {cta}
        <ArrowUpRight size={12} strokeWidth={1.9} className="transition-transform duration-200 ease-out-expo group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
      </a>
    </div>
  );
}
