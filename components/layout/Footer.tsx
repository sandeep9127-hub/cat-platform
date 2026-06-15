import Link from "next/link";
import { ArrowUpRight, Compass, Info, type LucideIcon } from "lucide-react";
import { CatLogo } from "./CatLogo";

/**
 * Footer.
 *
 * Editor flagged two things:
 *   - The CAT lockup was invisible — it used cat-logo-full.svg (navy
 *     wordmark) on a dark-teal background. Wrong polarity. Replaced
 *     with an inline SVG that draws the brand symbol in light colours
 *     (cream arches + amber leaf accents + lavender wings) and a
 *     cream typographic wordmark beside it.
 *   - No outbound link to the parent organisation. Added a prominent
 *     "Visit agroecologyindia.org" anchor under the lockup.
 */
export function Footer() {
  return (
    <footer className="relative pt-16 pb-8 mt-24 bg-cream text-ink border-t border-line">
      <div className="relative max-w-page mx-auto px-5 sm:px-7 lg:px-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_auto_auto] gap-10 lg:gap-14">
        <div>
          {/* CAT lockup — logo as-is, with the website link left-aligned beneath it */}
          <div className="flex items-start gap-4">
            <CatLogo size={54} />
            <div className="pt-1 font-sans font-semibold text-ink text-[15.5px] leading-[1.2] tracking-[-0.01em]">
              Consortium for
              <br />
              Agroecological Transformations
            </div>
          </div>
          <a
            href="https://www.agroecologyindia.org"
            target="_blank"
            rel="noreferrer"
            className="group mt-4 inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-teal hover:text-deep-teal transition-colors"
          >
            <span>agroecologyindia.org</span>
            <ArrowUpRight
              size={11}
              strokeWidth={2}
              className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              aria-hidden
            />
          </a>

          <h3 className="mt-9 font-sans font-semibold text-[28px] sm:text-[34px] leading-[1.05] tracking-[-0.035em] max-w-[24ch] text-ink">
            A <span className="text-teal">repository</span> of food systems initiatives, landscapes, and learning from across India.
          </h3>
          <p className="mt-4 text-[13.5px] leading-[1.6] text-ink-soft max-w-[42ch]">
            Run by the Consortium for Agroecological Transformations. Every entry is compiled
            from public sources and checked before it goes up. Missing a programme?{" "}
            <a href="/contact" className="text-teal hover:text-deep-teal underline-offset-2 hover:underline">
              Tell the editors
            </a>
            .
          </p>
        </div>

        <FooterCol
          title="Explore"
          Icon={Compass}
          links={[
            { href: "/principles", label: "Principles" },
            { href: "/landscapes", label: "Landscapes" },
            { href: "/map", label: "Solutions Atlas" },
            { href: "/organizations", label: "Organisations Atlas" },
            { href: "/agent", label: "Ask the Hub" },
          ]}
        />
        <FooterCol
          title="About"
          Icon={Info}
          links={[
            { href: "/about", label: "About CAT" },
            { href: "/editors", label: "Editors" },
            { href: "/funders", label: "Funders" },
            { href: "/contact", label: "Contact" },
          ]}
          external={[
            { href: "https://www.agroecologyindia.org", label: "agroecologyindia.org" },
          ]}
        />
      </div>

      <div className="relative max-w-page mx-auto mt-14 px-5 sm:px-7 lg:px-10 pt-6">
        <div className="h-px w-full bg-line" aria-hidden />
        <div className="pt-5 flex flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-between font-mono text-[10px] uppercase tracking-mono-mid text-muted">
          <span>Transformation Hub · 2026</span>
          <span>Made in India · For food systems</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  Icon,
  links,
  external,
}: {
  title: string;
  Icon?: LucideIcon;
  links: { href: string; label: string }[];
  external?: { href: string; label: string }[];
}) {
  return (
    // lg:text-right — right-align the Explore / About columns (Option 1)
    <div className="lg:text-right">
      <h4 className="font-mono text-[10.5px] uppercase tracking-mono-wide text-amber-deep mb-3.5 font-semibold inline-flex items-center gap-2">
        {Icon ? <Icon size={12} strokeWidth={1.8} aria-hidden /> : <span className="w-3 h-px bg-amber-deep" />}
        {title}
      </h4>
      <ul className="space-y-2.5 list-none p-0">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="footer-link relative inline-block text-[13.5px] text-ink-soft hover:text-teal transition-colors"
            >
              {l.label}
            </Link>
          </li>
        ))}
        {external?.map((l) => (
          <li key={l.href}>
            <a
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-1.5 text-[13.5px] text-ink-soft hover:text-teal transition-colors"
            >
              <span>{l.label}</span>
              <ArrowUpRight
                size={11}
                strokeWidth={2}
                className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden
              />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
