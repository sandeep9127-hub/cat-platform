"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  PRINCIPLES,
  PRINCIPLE_LEVELS,
  type Principle,
  type PrincipleLevel,
} from "@/lib/data/principles";

const LEVEL_ORDER: PrincipleLevel[] = ["efficiency", "resilience", "equity"];

const LEVEL_ACCENT: Record<
  PrincipleLevel,
  { dot: string; rail: string; text: string; chip: string; ring: string }
> = {
  efficiency: {
    dot: "bg-amber-deep",
    rail: "bg-amber-deep",
    text: "text-amber-deep",
    chip: "text-amber-deep border-amber-deep/30 bg-amber-deep/[0.06]",
    ring: "ring-amber-deep/40",
  },
  resilience: {
    dot: "bg-teal",
    rail: "bg-teal",
    text: "text-teal",
    chip: "text-teal border-teal/30 bg-teal/[0.06]",
    ring: "ring-teal/40",
  },
  equity: {
    dot: "bg-periwinkle",
    rail: "bg-periwinkle",
    text: "text-periwinkle",
    chip: "text-periwinkle border-periwinkle/30 bg-periwinkle/[0.06]",
    ring: "ring-periwinkle/40",
  },
};

export function PrinciplesExplorer() {
  const [activeSlug, setActiveSlug] = useState<string>(PRINCIPLES[0].slug);
  const railRef = useRef<HTMLDivElement | null>(null);

  // Read ?p= or hash on first paint so external links can deep-link.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("p");
    const fromHash = window.location.hash.replace("#", "");
    const candidate = fromQuery || fromHash;
    if (candidate && PRINCIPLES.some((p) => p.slug === candidate)) {
      setActiveSlug(candidate);
    }
  }, []);

  // Keep the URL hash in sync — shareable links work.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const next = `#${activeSlug}`;
    if (window.location.hash !== next) {
      window.history.replaceState(null, "", next);
    }
  }, [activeSlug]);

  // Keyboard navigation on the rail — up/down arrows step through principles.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!railRef.current?.contains(document.activeElement)) return;
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      const idx = PRINCIPLES.findIndex((p) => p.slug === activeSlug);
      const next = e.key === "ArrowDown"
        ? (idx + 1) % PRINCIPLES.length
        : (idx - 1 + PRINCIPLES.length) % PRINCIPLES.length;
      setActiveSlug(PRINCIPLES[next].slug);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeSlug]);

  const active: Principle = useMemo(
    () => PRINCIPLES.find((p) => p.slug === activeSlug) ?? PRINCIPLES[0],
    [activeSlug],
  );
  const accent = LEVEL_ACCENT[active.level];

  return (
    <div className="bg-paper">
      {/* Editorial header */}
      <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-12 sm:pt-14 lg:pt-16 pb-8 sm:pb-10">
        <div className="flex items-center gap-3 mb-5">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
            Reference
          </span>
          <span className="h-px w-12 bg-line" />
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-amber-deep">
            13 principles
          </span>
        </div>
        <h1 className="font-serif text-[36px] sm:text-[48px] lg:text-[60px] leading-[0.98] tracking-[-0.018em] text-ink max-w-[22ch]">
          The principles of <span className="text-teal italic font-normal">agroecology</span>.
        </h1>
        <p className="mt-6 font-serif text-[17px] sm:text-[19px] leading-[1.55] text-ink-soft max-w-[68ch]">
          Thirteen working principles, organised by operational level. Pick any from the rail to
          read its definition, how it shows up in Indian landscapes, and the practical levers behind
          it.
        </p>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
          Source · HLPE Report 14 (2019), UN Committee on World Food Security ·{" "}
          <a
            href="https://www.fao.org/3/ca5602en/ca5602en.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal hover:underline underline-offset-4"
          >
            Read the source
          </a>
        </p>
      </section>

      {/* Explorer */}
      <section className="border-t border-line-soft">
        <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 py-10 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8 lg:gap-14">
            {/* LEFT RAIL */}
            <aside
              ref={railRef}
              className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto pr-1"
              aria-label="Choose a principle"
            >
              <nav className="space-y-7">
                {LEVEL_ORDER.map((level) => {
                  const meta = PRINCIPLE_LEVELS[level];
                  const principles = PRINCIPLES.filter((p) => p.level === level);
                  const levelAccent = LEVEL_ACCENT[level];
                  return (
                    <div key={level}>
                      <div className="flex items-baseline gap-2 mb-2.5 px-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${levelAccent.dot}`} />
                        <span className={`font-mono text-[9.5px] uppercase tracking-[0.16em] ${levelAccent.text}`}>
                          {meta.title}
                        </span>
                      </div>
                      <ul className="space-y-0.5">
                        {principles.map((p) => {
                          const isActive = p.slug === activeSlug;
                          return (
                            <li key={p.slug} className="relative">
                              {/* Active rail indicator */}
                              {isActive && (
                                <span
                                  aria-hidden
                                  className={`absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r ${levelAccent.rail}`}
                                />
                              )}
                              <button
                                type="button"
                                onClick={() => setActiveSlug(p.slug)}
                                aria-pressed={isActive}
                                className={`w-full text-left flex items-baseline gap-3 px-3 py-2 rounded-md transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 ${levelAccent.ring} focus-visible:ring-offset-2 focus-visible:ring-offset-paper ${
                                  isActive
                                    ? "bg-ink/[0.04] text-ink"
                                    : "text-ink-soft hover:text-ink hover:bg-ink/[0.02]"
                                }`}
                              >
                                <span className="font-mono text-[10.5px] tabular-nums text-muted w-5 shrink-0">
                                  {String(p.number).padStart(2, "0")}
                                </span>
                                <span
                                  className={`font-serif text-[15px] leading-[1.3] ${
                                    isActive ? "font-medium" : ""
                                  }`}
                                >
                                  {p.name}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </nav>

              <p className="mt-8 px-1 font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted">
                ↑ ↓ Arrow keys to browse
              </p>
            </aside>

            {/* RIGHT DETAIL PANEL */}
            <article
              key={active.slug}
              className="min-w-0 animate-fade-up"
              aria-live="polite"
            >
              {/* Crumb */}
              <div className="flex items-center gap-3 mb-4">
                <span className={`w-1.5 h-1.5 rounded-full ${accent.dot}`} />
                <span className={`font-mono text-[10px] uppercase tracking-[0.16em] ${accent.text}`}>
                  {PRINCIPLE_LEVELS[active.level].title}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  · Principle {String(active.number).padStart(2, "0")} of 13
                </span>
              </div>

              {/* Title */}
              <h2 className="font-serif text-[40px] sm:text-[52px] lg:text-[60px] leading-[0.98] tracking-[-0.018em] text-ink">
                {active.name}
              </h2>

              {/* Definition */}
              <p className="mt-6 font-serif text-[20px] sm:text-[22px] leading-[1.5] text-ink-soft max-w-[60ch]">
                {active.definition}
              </p>

              {/* Divider — dynamic gradient classnames don't survive Tailwind JIT,
                  so we use the solid accent rail color at low opacity. */}
              <div className={`mt-10 h-px w-16 ${accent.rail} opacity-50`} />

              {/* In India */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-3 md:gap-10">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-amber-deep">
                    In India
                  </span>
                </div>
                <p className="font-serif text-[17px] leading-[1.6] text-ink-soft max-w-[68ch]">
                  {active.inIndia}
                </p>
              </div>

              {/* Levers */}
              <div className="mt-10 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-3 md:gap-10">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                    Practical levers
                  </span>
                </div>
                <ul className="flex flex-wrap gap-2">
                  {active.levers.map((lever) => (
                    <li
                      key={lever}
                      className={`font-mono text-[10px] uppercase tracking-[0.1em] px-2.5 py-1.5 rounded-full border ${accent.chip}`}
                    >
                      {lever}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Prev / Next */}
              <nav className="mt-14 flex items-center justify-between border-t border-line-soft pt-6">
                <PrevNextLink
                  label="Previous"
                  direction="prev"
                  current={active}
                  onSelect={setActiveSlug}
                />
                <PrevNextLink
                  label="Next"
                  direction="next"
                  current={active}
                  onSelect={setActiveSlug}
                />
              </nav>

              {/* Connect to practice */}
              <div className="mt-14 rounded-xl border border-line-soft bg-cream/40 p-6 sm:p-8">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-amber-deep">
                  Where this meets practice
                </span>
                <h3 className="mt-3 font-serif text-[20px] sm:text-[22px] leading-[1.2] tracking-[-0.01em] text-ink">
                  Principles describe a direction. Programmes are where the work happens.
                </h3>
                <div className="mt-5 flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/landscapes"
                    className="inline-flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] px-5 py-2.5 rounded-full bg-gradient-to-br from-deep-teal to-teal text-paper hover:from-teal hover:to-deep-teal transition-all whitespace-nowrap"
                  >
                    Browse landscapes →
                  </Link>
                  <Link
                    href="/map"
                    className="inline-flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] px-5 py-2.5 rounded-full border border-line text-ink hover:border-teal hover:text-teal transition-colors whitespace-nowrap"
                  >
                    Solutions atlas →
                  </Link>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}

function PrevNextLink({
  label,
  direction,
  current,
  onSelect,
}: {
  label: string;
  direction: "prev" | "next";
  current: Principle;
  onSelect: (slug: string) => void;
}) {
  const idx = PRINCIPLES.findIndex((p) => p.slug === current.slug);
  const next =
    direction === "next"
      ? PRINCIPLES[(idx + 1) % PRINCIPLES.length]
      : PRINCIPLES[(idx - 1 + PRINCIPLES.length) % PRINCIPLES.length];

  return (
    <button
      type="button"
      onClick={() => onSelect(next.slug)}
      className={`group flex flex-col gap-1 ${
        direction === "next" ? "items-end text-right" : "items-start text-left"
      }`}
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted group-hover:text-teal transition-colors">
        {direction === "prev" ? "← " : ""}
        {label}
        {direction === "next" ? " →" : ""}
      </span>
      <span className="font-serif text-[15px] text-ink group-hover:text-teal transition-colors">
        {next.name}
      </span>
    </button>
  );
}
