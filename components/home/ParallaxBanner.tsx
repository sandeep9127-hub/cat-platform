"use client";

import { useEffect, useRef } from "react";

type ParallaxBannerProps = {
  src: string;
  alt: string;
  /** How strongly the image shifts relative to scroll. 0 = static, 0.5 = strong. Default 0.25. */
  strength?: number;
  /** Optional caption shown bottom-left over the image. */
  caption?: string;
};

/**
 * Editorial parallax banner. The image translates vertically opposite to
 * scroll direction inside its frame, producing depth without animating
 * layout properties (transform only). Falls back gracefully if reduced
 * motion is preferred or IntersectionObserver is unavailable.
 */
export function ParallaxBanner({
  src,
  alt,
  strength = 0.25,
  caption,
}: ParallaxBannerProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLDivElement | null>(null);
  const ticking = useRef(false);

  useEffect(() => {
    const frame = frameRef.current;
    const img = imgRef.current;
    if (!frame || !img) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    function update() {
      const rect = frame!.getBoundingClientRect();
      const viewportH = window.innerHeight || document.documentElement.clientHeight;
      // Progress: -1 (well below) → 0 (centered) → 1 (well above). Roughly.
      const progress = (rect.top + rect.height / 2 - viewportH / 2) / viewportH;
      const shift = -progress * rect.height * strength;
      img!.style.transform = `translate3d(0, ${shift.toFixed(2)}px, 0)`;
      ticking.current = false;
    }

    function onScroll() {
      if (!ticking.current) {
        ticking.current = true;
        window.requestAnimationFrame(update);
      }
    }

    // Initial position
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [strength]);

  return (
    <section
      aria-label="Cover image"
      ref={frameRef}
      className="relative w-full overflow-hidden border-y border-line bg-deep-teal"
      style={{ aspectRatio: "5.9 / 1", minHeight: 140 }}
    >
      {/* Parallax image layer — extends 30% above and below for headroom */}
      <div
        ref={imgRef}
        aria-hidden
        className="absolute will-change-transform"
        style={{
          inset: "-15% 0",
          backgroundImage: `url(${src})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      {/* Sceenreader-only alt */}
      <span className="sr-only">{alt}</span>
      {/* Editorial gradient veil for legibility + tonal continuity */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, rgba(26,38,37,0.35) 0%, rgba(26,38,37,0.08) 38%, rgba(26,38,37,0.08) 62%, rgba(26,38,37,0.35) 100%), linear-gradient(180deg, rgba(26,38,37,0.20) 0%, rgba(26,38,37,0.0) 35%, rgba(26,38,37,0.0) 65%, rgba(26,38,37,0.25) 100%)",
        }}
      />
      {/* Thin amber underline as brand signature */}
      <div
        aria-hidden
        className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber to-transparent"
      />
      {caption && (
        <span className="absolute bottom-3 left-5 sm:left-7 lg:left-10 font-mono text-[9.5px] uppercase tracking-[0.16em] text-paper/85 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
          <span className="inline-block w-4 h-px bg-amber align-middle mr-2" />
          {caption}
        </span>
      )}
    </section>
  );
}
