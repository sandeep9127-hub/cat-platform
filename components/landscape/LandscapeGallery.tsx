"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useCallback } from "react";
import { gsap } from "gsap";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { LandscapePhoto } from "@/lib/data/landscapes";

function formatDate(iso: string): string {
  const [y, m] = iso.split("-");
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const month = Number(m) >= 1 && Number(m) <= 12 ? months[Number(m) - 1] : m;
  return `${month} ${y}`;
}

/**
 * Documentary gallery with a GSAP scroll-reveal stagger and a click-to-zoom
 * lightbox. Each frame is treated as primary source material. Keyboard: arrows
 * navigate, Escape closes. Reduced motion skips the reveal.
 */
export function LandscapeGallery({ photos }: { photos: LandscapePhoto[] }) {
  const gridRef = useRef<HTMLUListElement | null>(null);
  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);
  const [open, setOpen] = useState<number | null>(null);

  // Scroll-reveal: figures rise + fade in, staggered, once on enter.
  useEffect(() => {
    const els = itemRefs.current.filter(Boolean) as HTMLLIElement[];
    if (!els.length || !gridRef.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    gsap.set(els, { opacity: 0, y: 22 });
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            io.disconnect();
            gsap.to(els, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.1 });
          }
        }
      },
      { threshold: 0.18 },
    );
    io.observe(gridRef.current);
    return () => io.disconnect();
  }, [photos.length]);

  const close = useCallback(() => setOpen(null), []);
  const step = useCallback(
    (d: number) => setOpen((o) => (o == null ? o : (o + d + photos.length) % photos.length)),
    [photos.length],
  );

  // Lightbox keyboard + body scroll lock.
  useEffect(() => {
    if (open == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close, step]);

  const active = open != null ? photos[open] : null;

  return (
    <>
      <ul
        ref={gridRef}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mt-8 list-none p-0"
      >
        {photos.map((p, i) => {
          // Uniform frame for every card so grid rows stay even regardless of
          // the source orientation; portrait shots are centre-cropped here and
          // shown in full inside the lightbox.
          const aspect = "4 / 3";
          return (
            <li
              key={p.src}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
            >
              <button
                type="button"
                onClick={() => setOpen(i)}
                aria-label={`Enlarge photograph: ${p.caption}`}
                className="group relative block w-full text-left overflow-hidden rounded-[8px] border border-line bg-paper transition-all duration-300 ease-out hover:-translate-y-0.5 cursor-zoom-in"
                style={{ boxShadow: "0 1px 2px rgba(26,38,37,0.04), 0 10px 24px -16px rgba(46,117,115,0.20)" }}
              >
                <div className="relative w-full bg-cream overflow-hidden" style={{ aspectRatio: aspect }}>
                  <Image
                    src={p.src}
                    alt={p.alt ?? p.caption}
                    fill
                    sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.05]"
                  />
                  <div
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 h-12 pointer-events-none"
                    style={{ background: "linear-gradient(0deg, rgba(26,38,37,0.25) 0%, transparent 100%)" }}
                  />
                  {/* zoom affordance */}
                  <span className="absolute top-2.5 right-2.5 inline-flex items-center justify-center w-7 h-7 rounded-full bg-deep-teal/85 text-paper opacity-0 group-hover:opacity-100 transition-opacity duration-200" aria-hidden>
                    <ChevronRight size={14} strokeWidth={2} className="rotate-[-45deg]" />
                  </span>
                </div>
                <figcaption className="px-4 py-3">
                  <p className="font-sans text-[13.5px] text-[color:var(--navy-teal)] leading-snug">
                    {p.caption}
                  </p>
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted mt-1.5 inline-flex items-center gap-1.5">
                    <span className="inline-block w-3 h-px bg-amber-deep" />
                    {p.credit}{p.date ? ` · ${formatDate(p.date)}` : ""}
                  </p>
                </figcaption>
              </button>
            </li>
          );
        })}
      </ul>

      {active && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-8 animate-scope-pop"
          style={{ background: "rgba(22,19,13,0.86)", backdropFilter: "blur(6px)" }}
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label={active.caption}
        >
          <button
            onClick={close}
            aria-label="Close"
            className="absolute top-4 right-4 sm:top-6 sm:right-6 inline-flex items-center justify-center w-10 h-10 rounded-full border border-paper/25 text-paper hover:bg-paper/10 transition-colors"
          >
            <X size={18} strokeWidth={2} />
          </button>
          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); step(-1); }}
                aria-label="Previous"
                className="absolute left-3 sm:left-6 inline-flex items-center justify-center w-10 h-10 rounded-full border border-paper/25 text-paper hover:bg-paper/10 transition-colors"
              >
                <ChevronLeft size={20} strokeWidth={2} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); step(1); }}
                aria-label="Next"
                className="absolute right-3 sm:right-6 inline-flex items-center justify-center w-10 h-10 rounded-full border border-paper/25 text-paper hover:bg-paper/10 transition-colors"
              >
                <ChevronRight size={20} strokeWidth={2} />
              </button>
            </>
          )}
          <figure className="relative max-w-[min(1100px,92vw)] max-h-[88vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={active.src}
                alt={active.alt ?? active.caption}
                className="max-h-[78vh] w-auto max-w-full object-contain rounded-[8px]"
                style={{ boxShadow: "0 30px 80px -20px rgba(0,0,0,0.6)" }}
              />
            </div>
            <figcaption className="mt-3 flex items-baseline justify-between gap-4 flex-wrap">
              <p className="font-sans text-[14px] text-paper leading-snug">{active.caption}</p>
              <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-[color:#f8ca7c] inline-flex items-center gap-1.5">
                <span className="inline-block w-3 h-px bg-[#f8ca7c]" />
                {active.credit}{active.date ? ` · ${formatDate(active.date)}` : ""}
                {photos.length > 1 && (
                  <span className="text-paper/50 ml-2">{(open ?? 0) + 1} / {photos.length}</span>
                )}
              </p>
            </figcaption>
          </figure>
        </div>
      )}
    </>
  );
}
