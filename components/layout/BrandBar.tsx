"use client";

import Link from "next/link";
import { useState } from "react";
import { CatLogo } from "./CatLogo";

const NAV_LINKS = [
  { href: "/programmes", label: "Programmes" },
  { href: "/themes", label: "Themes" },
  { href: "/organisations", label: "Organisations" },
  { href: "/resources", label: "Resources" },
  { href: "/news", label: "News" },
];

export function BrandBar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-paper border-b border-line-soft backdrop-saturate-150">
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
          {NAV_LINKS.map((l) => (
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
            className="hidden sm:inline-flex font-mono text-[10px] sm:text-[10.5px] tracking-mono-mid uppercase px-3 sm:px-3.5 py-2 rounded-full border border-deep-teal text-deep-teal hover:bg-deep-teal hover:text-paper transition-colors whitespace-nowrap shrink-0"
          >
            Contribute
          </Link>
          {/* Mobile + tablet hamburger */}
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden p-2 -mr-2 text-ink hover:text-teal transition-colors"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              {open ? (
                <>
                  <path d="M6 6l12 12" />
                  <path d="M18 6L6 18" />
                </>
              ) : (
                <>
                  <path d="M4 7h16" />
                  <path d="M4 12h16" />
                  <path d="M4 17h16" />
                </>
              )}
            </svg>
          </button>
        </nav>
      </div>

      {/* Disclosure sheet */}
      {open && (
        <div className="lg:hidden border-t border-line-soft bg-paper animate-fade-in-down">
          <nav className="max-w-page mx-auto px-5 sm:px-7 py-4 flex flex-col gap-1">
            {NAV_LINKS.map((l, i) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="font-serif text-[20px] text-ink hover:text-teal py-2 border-b border-line-soft last:border-b-0 reveal-stagger"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/contribute"
              onClick={() => setOpen(false)}
              className="mt-3 inline-flex sm:hidden font-mono text-[11px] tracking-mono-mid uppercase px-4 py-2.5 rounded-full border border-deep-teal text-deep-teal hover:bg-deep-teal hover:text-paper transition-colors w-fit"
            >
              Contribute
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
