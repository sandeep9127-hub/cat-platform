import Link from "next/link";

export function Footer() {
  return (
    <footer className="relative text-cream pt-16 pb-8 mt-32 overflow-hidden bg-deep-teal">
      {/* Layered editorial gradient: deep-teal base with a warm amber bloom at top-left and a cooler teal one bottom-right */}
      <div
        className="absolute inset-0 pointer-events-none opacity-90"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 8% -10%, rgba(248,202,124,0.18), transparent 60%), radial-gradient(ellipse 70% 60% at 100% 110%, rgba(46,117,115,0.45), transparent 65%)",
        }}
      />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber to-transparent" />
      <div className="relative max-w-page mx-auto px-5 sm:px-7 lg:px-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-8 lg:gap-12">
        <div>
          <h3 className="font-serif text-[32px] font-normal leading-tight tracking-[-0.02em] max-w-[18ch]">
            A quiet, <em className="text-amber not-italic font-medium italic">honest</em> record
            of food systems work in India.
          </h3>
          <p className="mt-4 text-[13.5px] leading-relaxed text-cream/70 max-w-[38ch]">
            Curated by the Consortium for Agroecological Transformations. Open to contributions
            from credible food-systems organisations.
          </p>
        </div>
        <FooterCol
          title="Read"
          links={[
            { href: "/landscapes", label: "Landscapes" },
            { href: "/map", label: "Solutions Atlas" },
            { href: "/news", label: "News" },
            { href: "/resources", label: "Resources" },
            { href: "/themes", label: "Themes" },
          ]}
        />
        <FooterCol
          title="Contribute"
          links={[
            { href: "/contribute", label: "Submit a programme" },
            { href: "/contribute/resource", label: "Submit a resource" },
            { href: "/editorial-process", label: "Editorial process" },
            { href: "/style-guide", label: "Style guide" },
          ]}
        />
        <FooterCol
          title="About"
          links={[
            { href: "/about", label: "About CAT" },
            { href: "/editors", label: "Editors" },
            { href: "/funders", label: "Funders" },
            { href: "/contact", label: "Contact" },
          ]}
        />
      </div>
      <div className="relative max-w-page mx-auto mt-14 px-5 sm:px-7 lg:px-10 pt-6">
        {/* Amber hairline divider above credit row */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-amber/50 to-transparent" aria-hidden />
        <div className="pt-5 flex flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-between font-mono text-[10px] uppercase tracking-mono-mid text-cream/50">
          <span>Transformation Hub · Vol. 01 · 2026</span>
          <span>Made in India · For food systems</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h4 className="font-mono text-[10.5px] uppercase tracking-mono-wide text-amber mb-3.5 font-semibold inline-flex items-center gap-2">
        <span className="w-3 h-px bg-amber" />
        {title}
      </h4>
      <ul className="space-y-2.5 list-none p-0">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="footer-link relative inline-block text-[13.5px] text-cream/85 hover:text-amber transition-colors"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
