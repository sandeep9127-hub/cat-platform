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
  ArrowUpRight,
} from "lucide-react";
import { CatLogo } from "./CatLogo";

const PARENT_SITE = "https://www.agroecologyindia.org";

const NAV_LINKS = [
  { href: "/principles", label: "Principles", Icon: Compass },
  { href: "/landscapes", label: "Landscapes", Icon: Layers },
  { href: "/map", label: "Solutions Atlas", Icon: MapIcon },
  { href: "/organizations", label: "Organisations Atlas", Icon: Users },
  { href: "/about", label: "About", Icon: Info },
];

export function BrandBar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 64);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMq = () => setReduce(mq.matches);
    onMq();
    mq.addEventListener("change", onMq);
    return () => mq.removeEventListener("change", onMq);
  }, []);

  // Anthropic-style brand fold: at the top the header shows the full lockup
  // (mark + "Transformation Hub"); once scrolled, the wordmark collapses away
  // and only the mark remains. Disabled for reduced motion (lockup stays full).
  const collapse = scrolled && !reduce;

  return (
    <header className="sticky top-0 z-50 px-3 sm:px-4 lg:px-6 pt-2.5 sm:pt-3 pointer-events-none">
      {/* Floating, detached bar — rounded, shadowed, with a margin from the edges.
          pointer-events: the transparent gutter passes clicks through; the bar itself
          re-enables them. */}
      <div
        className={`max-w-page mx-auto rounded-[18px] pointer-events-auto transition-[box-shadow] duration-300 ease-out ${
          scrolled
            ? "shadow-[0_10px_30px_-18px_rgba(26,38,37,0.22)]"
            : "shadow-none"
        }`}
        style={{
          // Same fill as the body (--paper) so the bar reads as a floating nav
          // rather than a distinct white card/strip. Opaque so content scrolling
          // underneath is masked cleanly; a whisper of shadow appears only on
          // scroll to lift it off the content.
          backgroundColor: "var(--paper)",
        }}
      >
        <div
          className={`px-4 sm:px-6 lg:px-7 flex items-center gap-3 sm:gap-5 lg:gap-7 transition-[padding] duration-300 ease-out ${
            scrolled ? "py-2 sm:py-2.5" : "py-3 sm:py-3.5"
          }`}
        >
        <Link
          href="/"
          aria-label="Transformation Hub — home"
          className="flex items-center no-underline text-ink group shrink-0"
        >
          {/* The mark stays put and crisp; only the wordmark folds away. The
              logo is rendered ONCE at 36px (re-sizing the SVG mid-scroll made
              the smallest arch flicker at sub-pixel sizes). */}
          <div className="shrink-0 origin-center transition-transform duration-300 ease-out group-hover:rotate-[-4deg]">
            <CatLogo size={36} />
          </div>
          {/* Wordmark — collapses to zero width (and fades) on scroll, leaving
              just the mark. overflow-hidden + max-width is what animates the fold. */}
          <span
            className={`overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin] duration-[450ms] ease-out-expo ${
              collapse ? "max-w-0 opacity-0 ml-0" : "max-w-[460px] opacity-100 ml-3 pr-[0.18em]"
            }`}
          >
            <span className="font-serif font-medium leading-[1.05] tracking-[-0.012em] text-[16px] sm:text-[18px] group-hover:text-teal transition-colors">
              Transformation <span className="text-teal italic font-normal">Hub</span>
            </span>
          </span>
        </Link>
        <nav className="ml-auto flex items-center gap-3.5 lg:gap-4 xl:gap-5">
          {NAV_LINKS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="hidden xl:inline-flex items-center gap-1.5 text-[13px] whitespace-nowrap text-ink-soft hover:text-teal transition-colors group relative py-1"
            >
              <Icon size={13} strokeWidth={1.7} className="text-muted group-hover:text-teal transition-colors" aria-hidden />
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
          {/* The parent organisation — clearly external, opens in a new tab so the
              Hub stays open. Deliberately not called "Home" (it leaves the Hub). */}
          <a
            href={PARENT_SITE}
            target="_blank"
            rel="noreferrer"
            className="hidden xl:inline-flex items-center gap-1 text-[13px] whitespace-nowrap text-muted hover:text-teal transition-colors group py-1"
          >
            <span>The Consortium</span>
            <ArrowUpRight size={12} strokeWidth={1.8} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
          </a>
          {/* Ask — single highlighted entry point (replaces the old floating widget) */}
          <Link
            href="/agent"
            className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[10px] sm:text-[10.5px] tracking-mono-mid uppercase px-4 py-2 rounded-full bg-deep-teal text-paper hover:bg-teal active:scale-[0.97] transition-[transform,background-color] duration-200 ease-out-expo whitespace-nowrap shrink-0"
          >
            <MessageCircle size={12} strokeWidth={2} aria-hidden />
            Ask the Hub
          </Link>
          {/* Mobile + tablet hamburger */}
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="xl:hidden p-2 -mr-2 text-ink hover:text-teal transition-colors"
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
        <div className="xl:hidden border-t border-line-soft bg-paper animate-fade-in-down rounded-b-[18px] overflow-hidden">
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
            <Link
              href="/agent"
              onClick={() => setOpen(false)}
              className="mt-3 inline-flex font-mono text-[11px] tracking-mono-mid uppercase px-5 py-2.5 rounded-full bg-deep-teal text-paper hover:bg-teal active:scale-[0.97] transition-[transform,background-color] duration-200 ease-out-expo w-fit items-center gap-2"
            >
              <MessageCircle size={14} strokeWidth={2} aria-hidden />
              Ask the Hub
            </Link>
            {/* Parent organisation — clearly external, new tab. Not "Home". */}
            <a
              href={PARENT_SITE}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="mt-4 pt-4 border-t border-line-soft text-[14px] text-muted hover:text-teal inline-flex items-center gap-1.5"
            >
              <span>Visit the Consortium · agroecologyindia.org</span>
              <ArrowUpRight size={14} strokeWidth={1.8} aria-hidden />
            </a>
          </nav>
        </div>
      )}
      </div>
    </header>
  );
}
