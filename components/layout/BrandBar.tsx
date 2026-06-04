"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Layers,
  Map as MapIcon,
  MessageCircle,
  Info,
  Compass,
  Users,
} from "lucide-react";
import { CatLogo } from "./CatLogo";

const NAV_LINKS = [
  { href: "/principles", label: "Principles", Icon: Compass },
  { href: "/landscapes", label: "Landscapes", Icon: Layers },
  { href: "/map", label: "Solutions Atlas", Icon: MapIcon },
  { href: "/organizations", label: "Organizations Atlas", Icon: Users },
  { href: "/agent", label: "Ask", Icon: MessageCircle },
  { href: "/about", label: "About", Icon: Info },
];

export function BrandBar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 64);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b backdrop-blur-md transition-[background-color,border-color,box-shadow] duration-300 ease-out ${
        scrolled
          ? "border-line shadow-[0_8px_24px_-16px_rgba(26,38,37,0.18)]"
          : "border-line-soft"
      }`}
      style={{
        // Tailwind's bg-paper/92 produces an invalid color because --paper is
        // a hex value, not RGB channels. Use rgba() directly so the
        // translucency actually applies and the backdrop-blur has something
        // to tint.
        backgroundColor: scrolled
          ? "rgba(251, 248, 242, 0.86)"
          : "rgba(251, 248, 242, 0.78)",
      }}
    >
      {/* Thin amber→teal gradient hairline at top of bar — brand signature */}
      <div className="h-px w-full bg-gradient-to-r from-amber/0 via-amber-deep/60 to-teal/40" aria-hidden />
      <div
        className={`max-w-page mx-auto px-5 sm:px-7 lg:px-10 flex items-center gap-4 sm:gap-8 lg:gap-10 transition-[padding] duration-300 ease-out ${
          scrolled ? "py-2 sm:py-2.5" : "py-3.5 sm:py-4"
        }`}
      >
        <Link href="/" className="flex items-center gap-3 no-underline text-ink group shrink-0">
          {/* The logo is rendered ONCE at 36px and CSS-scaled when the
              bar shrinks on scroll. Changing the SVG's size attribute
              forced a full re-render mid-scroll, and at ~28px the
              smallest inner arch fell into sub-pixel territory and
              visibly flickered. Transform-scale skips the re-render. */}
          <div
            className={`shrink-0 origin-left transition-transform duration-300 ease-out group-hover:rotate-[-4deg] ${
              scrolled ? "scale-[0.78]" : "scale-100"
            }`}
          >
            <CatLogo size={36} />
          </div>
          <span className="flex flex-col">
            <span
              className={`font-serif font-medium leading-[1.05] tracking-[-0.012em] whitespace-nowrap transition-[font-size] duration-300 ease-out ${
                scrolled ? "text-[14px] sm:text-[15px]" : "text-[16px] sm:text-[18px]"
              }`}
            >
              Transformation <span className="text-teal italic font-normal">Hub</span>
            </span>
            <span
              className={`hidden sm:block font-mono tracking-[0.08em] uppercase text-muted mt-[3px] whitespace-nowrap overflow-hidden transition-all duration-300 ease-out ${
                scrolled ? "max-h-0 opacity-0 mt-0 text-[0px]" : "max-h-4 opacity-100 text-[8.5px] md:text-[9px]"
              }`}
            >
              By the Consortium for Agroecological Transformations
            </span>
          </span>
        </Link>
        <nav className="ml-auto flex items-center gap-4 lg:gap-[18px] xl:gap-6">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="hidden lg:inline-flex items-center text-[13px] whitespace-nowrap text-ink-soft hover:text-teal transition-colors group relative py-1"
            >
              <span className="relative">
                {label}
                {/* Animated underline — grows from left on hover */}
                <span
                  aria-hidden
                  className="absolute left-0 -bottom-1 h-[1.5px] w-full origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out"
                  style={{
                    background:
                      "linear-gradient(90deg, #2E7573 0%, #C68C2E 100%)",
                  }}
                />
              </span>
            </Link>
          ))}
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
            {NAV_LINKS.map(({ href, label, Icon }) => (
              // No per-item stagger — the parent drawer already animates
              // in. The stagger had items at opacity 0 mid-flight which
              // made the menu read as half-empty on mobile.
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="font-serif text-[20px] text-ink hover:text-teal py-2 border-b border-line-soft last:border-b-0 inline-flex items-center gap-3"
              >
                <Icon size={18} strokeWidth={1.5} className="text-teal/70" aria-hidden />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
