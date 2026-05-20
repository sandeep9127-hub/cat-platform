import Link from "next/link";

export function Footer() {
  return (
    <footer className="relative bg-deep-teal text-cream pt-16 pb-8 mt-32 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber to-transparent" />
      <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-8 lg:gap-12">
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
            { href: "/landscapes", label: "CAT Landscapes" },
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
      <div className="max-w-page mx-auto mt-12 px-5 sm:px-7 lg:px-10 pt-6 border-t border-cream/10 flex flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-between font-mono text-[10px] uppercase tracking-mono-mid text-cream/50">
        <span>CAT Platform · Vol. 01 · 2026</span>
        <span>Made in India · For food systems</span>
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
      <h4 className="font-mono text-[10.5px] uppercase tracking-mono-wide text-amber mb-3.5 font-semibold">
        {title}
      </h4>
      <ul className="space-y-2 list-none p-0">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="text-[13.5px] text-cream/85 hover:text-amber transition-colors"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
