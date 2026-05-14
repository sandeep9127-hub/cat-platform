import Link from "next/link";
import { CatLogo } from "./CatLogo";

export function BrandBar() {
  return (
    <header className="sticky top-0 z-50 bg-paper border-b border-line-soft backdrop-saturate-150">
      <div className="absolute left-0 right-0 -bottom-px h-0.5 bg-gradient-to-r from-transparent via-amber to-transparent opacity-60" />
      <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 py-3.5 sm:py-4 flex items-center gap-4 sm:gap-8 lg:gap-10">
        <Link href="/" className="flex items-center gap-3 no-underline text-ink min-w-0">
          <CatLogo size={36} className="shrink-0" />
          <span className="flex flex-col min-w-0">
            <span className="font-serif text-[17px] sm:text-[19px] font-medium leading-none tracking-[-0.01em]">
              CAT <span className="text-teal italic font-normal">Platform</span>
            </span>
            <span className="hidden sm:block font-mono text-[9.5px] tracking-mono-wide uppercase text-muted mt-1 truncate">
              Consortium for Agroecological Transformations
            </span>
          </span>
        </Link>
        <nav className="ml-auto flex items-center gap-5 lg:gap-8">
          {[
            { href: "/programmes", label: "Programmes" },
            { href: "/themes", label: "Themes" },
            { href: "/organisations", label: "Organisations" },
            { href: "/resources", label: "Resources" },
            { href: "/news", label: "News" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="hidden lg:block text-[13.5px] text-ink-soft hover:text-teal transition-colors"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/contribute"
            className="font-mono text-[10px] sm:text-[10.5px] tracking-mono-mid uppercase px-3 sm:px-3.5 py-2 rounded-full border border-deep-teal text-deep-teal hover:bg-deep-teal hover:text-paper transition-colors whitespace-nowrap shrink-0"
          >
            Contribute
          </Link>
        </nav>
      </div>
    </header>
  );
}
