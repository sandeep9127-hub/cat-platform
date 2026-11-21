"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";
import { CatLogo } from "./CatLogo";

/**
 * Public header: logo, five text-only section links, one "Ask the Hub" button.
 *
 * Order follows importance (Landscapes first). Labels are short in the bar;
 * page titles can still say "Solutions Atlas" / "Organisations Atlas".
 * The parent site link ("The Consortium") lives in the footer and on About,
 * not here: the header only holds places inside the Hub.
 * Phones and tablets (<lg): logo, Ask button and a menu drawer with the same links.
 */

// `match` lists the route prefixes that count as "inside" a section, so a
// landscape detail page lights up Landscapes and an entry lights up Solutions.
const NAV_LINKS = [
  { href: "/landscapes", label: "Landscapes", match: ["/landscapes", "/landscape"] },
  { href: "/map", label: "Solutions", match: ["/map", "/entry", "/atlas", "/theme", "/factsheet"] },
  { href: "/organizations", label: "Organisations", match: ["/organizations", "/organisation"] },
  { href: "/principles", label: "Principles", match: ["/principles"] },
  { href: "/about", label: "About", match: ["/about"] },
];

function isActive(pathname: string, match: string[]) {
  return match.some((m) => pathname === m || pathname.startsWith(m + "/"));
}

export function BrandBar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [reduce, setReduce] = useState(false);
  const pathname = usePathname() ?? "/";
  const rowRef = useRef<HTMLDivElement>(null);

  // Publish the header's real height as --header-h so sticky bars below it
  // (the landscape tabs) sit exactly underneath instead of a guessed offset.
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const set = () =>
      document.documentElement.style.setProperty("--header-h", `${row.offsetTop + row.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(row);
    window.addEventListener("resize", set);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", set);
    };
  }, []);

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

  // Close the drawer on navigation and on Escape.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // At the top the header shows the full lockup (mark + "Transformation Hub");
  // once scrolled, the wordmark folds away and only the mark remains.
  // Disabled for reduced motion (lockup stays full).
  const collapse = scrolled && !reduce;

  return (
    <header className="sticky top-0 z-50 px-3 sm:px-4 lg:px-6 pt-2.5 sm:pt-3 pointer-events-none">
      {/* Floating bar with a margin from the edges; the transparent gutter
          passes clicks through and the bar re-enables them. */}
      <div
        className={`max-w-page mx-auto rounded-panel pointer-events-auto transition-[box-shadow] duration-300 ease-out ${
          scrolled ? "shadow-[0_10px_30px_-18px_rgba(26,38,37,0.22)]" : "shadow-none"
        }`}
        style={{ backgroundColor: "var(--paper)" }}
      >
        {/* Constant height: no padding animation (DESIGN.md: never animate layout). */}
        <div ref={rowRef} className="px-4 sm:px-6 lg:px-7 py-2.5 sm:py-3 flex items-center gap-3 sm:gap-5 lg:gap-8">
          <Link
            href="/"
            aria-label="Transformation Hub, home"
            className="flex items-center no-underline text-ink group shrink-0"
          >
            <div className="shrink-0 origin-center transition-transform duration-300 ease-out group-hover:rotate-[-4deg]">
              <CatLogo size={36} />
            </div>
            <span
              className={`max-[359px]:hidden overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin] duration-[450ms] ease-out-expo ${
                collapse ? "max-w-0 opacity-0 ml-0" : "max-w-[460px] opacity-100 ml-3 pr-[0.18em]"
              }`}
            >
              <span className="font-wordmark font-medium leading-[1.05] tracking-[-0.012em] text-[16px] sm:text-[18px] group-hover:text-teal transition-colors">
                Transformation <span className="text-teal italic font-normal">Hub</span>
              </span>
            </span>
          </Link>

          {/* Section links, text only, from 1024px (lg). */}
          <nav aria-label="Main" className="hidden lg:flex items-center gap-7 xl:gap-8 ml-auto">
            {NAV_LINKS.map(({ href, label, match }) => {
              const active = isActive(pathname, match);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`group relative py-1.5 text-[14px] whitespace-nowrap transition-colors hover:text-teal ${
                    active ? "text-ink font-medium" : "text-ink-soft"
                  }`}
                >
                  {label}
                  {/* Underline: always on the current section, grows in on hover elsewhere. */}
                  <span
                    aria-hidden
                    className={`absolute left-0 bottom-0 h-[1.5px] w-full bg-teal origin-left transition-transform duration-300 ease-out motion-reduce:transition-none ${
                      active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                    }`}
                  />
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto lg:ml-4 flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* One compact Ask button. The full ask box stays on the home band and /agent. */}
            <Link
              href="/agent"
              aria-label="Ask the Hub"
              aria-current={pathname.startsWith("/agent") ? "page" : undefined}
              className="inline-flex items-center gap-2 min-h-10 px-3.5 min-[400px]:px-4 rounded-full bg-deep-teal text-paper text-[14px] font-medium whitespace-nowrap hover:bg-teal active:scale-[0.97] transition-[background-color,transform] duration-200 ease-out-expo"
            >
              <MessageCircle size={15} strokeWidth={1.9} aria-hidden />
              <span>
                Ask<span className="hidden min-[400px]:inline"> the Hub</span>
              </span>
            </Link>

            {/* Menu: phones and tablets */}
            <button
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="site-menu"
              onClick={() => setOpen((v) => !v)}
              className="lg:hidden inline-flex items-center justify-center w-11 h-11 -mr-2.5 text-ink hover:text-teal transition-colors"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
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
          </div>
        </div>

        {/* Drawer: the same five links, text only */}
        {open && (
          <div id="site-menu" className="lg:hidden border-t border-line-soft bg-paper animate-fade-in-down rounded-b-panel overflow-hidden">
            <nav aria-label="Main" className="max-w-page mx-auto px-5 sm:px-7 py-3 flex flex-col">
              {NAV_LINKS.map(({ href, label, match }) => {
                const active = isActive(pathname, match);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={`flex items-center min-h-12 font-sans text-[19px] tracking-[-0.01em] border-b border-line-soft last:border-b-0 hover:text-teal ${
                      active ? "text-teal font-semibold" : "text-ink"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
