"use client";

import { useEffect, useRef } from "react";

type ParallaxBannerProps = {
  /** Optional image source. */
  src?: string;
  /** Optional video source — takes precedence over `src`. Autoplays muted in a loop. */
  videoSrc?: string;
  /** Optional poster image while the video buffers. */
  poster?: string;
  alt?: string;
  /** How strongly the back layer shifts relative to scroll. 0 = static, 0.5 = strong. Default 0.25. */
  strength?: number;
  /** Optional caption shown bottom-left. */
  caption?: string;
  /** Override the aspect ratio. Default 5.9 / 1 (LinkedIn cover) — pass a string like "21 / 9". */
  aspect?: string;
  /** Override the min height in px. Default 160. */
  minHeight?: number;
};

/**
 * Editorial parallax banner. The image translates vertically opposite to
 * scroll direction inside its frame, producing depth without animating
 * layout properties (transform only). Falls back gracefully if reduced
 * motion is preferred or IntersectionObserver is unavailable.
 */
export function ParallaxBanner({
  src,
  videoSrc,
  poster,
  alt,
  strength = 0.25,
  caption,
  aspect = "5.9 / 1",
  minHeight = 160,
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

  const hasVideo = Boolean(videoSrc);
  const hasImage = !hasVideo && Boolean(src);
  const hasMedia = hasVideo || hasImage;

  return (
    <section
      aria-label={hasVideo ? "Looping hero animation" : hasImage ? "Cover image" : "Brand banner"}
      ref={frameRef}
      className="relative w-full overflow-hidden border-y border-line"
      style={{
        aspectRatio: aspect,
        minHeight,
        background: hasMedia
          ? undefined
          : // Editorial gradient base: deep-teal pool with warm amber bloom
            "radial-gradient(ellipse 60% 120% at 12% 50%, rgba(248,202,124,0.32), transparent 60%), radial-gradient(ellipse 70% 140% at 92% 60%, rgba(146,156,197,0.30), transparent 65%), linear-gradient(110deg, #1f3534 0%, #2c4544 40%, #334B4A 70%, #3a5856 100%)",
      }}
    >
      {/* Back parallax layer */}
      <div
        ref={imgRef}
        aria-hidden
        className="absolute will-change-transform"
        style={
          hasImage
            ? {
                inset: "-15% 0",
                backgroundImage: `url(${src})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }
            : hasVideo
              ? { inset: "-15% 0" }
              : { inset: "-20% 0" }
        }
      >
        {hasVideo && (
          <video
            src={videoSrc}
            poster={poster}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
          />
        )}
        {!hasMedia && (
          // Soft horizon line + repeating diagonal hatch motif. Pure CSS, no asset cost.
          <div
            className="absolute inset-0"
            style={{
              background:
                "repeating-linear-gradient(115deg, rgba(248,202,124,0.04) 0px, rgba(248,202,124,0.04) 1px, transparent 1px, transparent 14px), radial-gradient(ellipse 80% 50% at 50% 100%, rgba(46,117,115,0.45), transparent 70%)",
            }}
          />
        )}
      </div>

      {/* Mid layer — large brand glyph row (only on the no-media variant) */}
      {!hasMedia && (
        <div
          aria-hidden
          className="absolute will-change-transform pointer-events-none"
          style={{
            inset: 0,
            transform: "translate3d(0,0,0)",
          }}
        >
          <BrandGlyphRow />
        </div>
      )}

      {/* Optional alt text */}
      {hasMedia && alt && <span className="sr-only">{alt}</span>}

      {/* Legibility veil (media variant only) */}
      {hasMedia && (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, rgba(26,38,37,0.30) 0%, rgba(26,38,37,0.04) 38%, rgba(26,38,37,0.04) 62%, rgba(26,38,37,0.30) 100%), linear-gradient(180deg, rgba(26,38,37,0.20) 0%, rgba(26,38,37,0.0) 35%, rgba(26,38,37,0.0) 60%, rgba(26,38,37,0.30) 100%)",
          }}
        />
      )}

      {/* Thin amber underline */}
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

/**
 * Repeating arch + leaf glyph (echo of the CAT mark) used as a typographic
 * texture across the parallax band. Low opacity so it reads as ambient.
 */
function BrandGlyphRow() {
  // Distribute six glyphs across the banner at varied vertical positions.
  const items = Array.from({ length: 8 });
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 1200 200"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 opacity-90"
    >
      <defs>
        <g id="cat-glyph" fill="none" strokeLinecap="round">
          <path d="M-26 6 A 26 26 0 0 1 26 6" stroke="#FBF8F2" strokeOpacity="0.18" strokeWidth="1.4" />
          <path d="M-18 6 A 18 18 0 0 1 18 6" stroke="#FBF8F2" strokeOpacity="0.13" strokeWidth="1.4" />
          <path d="M-9 6 A 9 9 0 0 1 9 6" stroke="#F8CA7C" strokeOpacity="0.55" strokeWidth="1.4" />
          <path
            d="M0 9 C -10 14, -12 26, -5 34 C 0 30, 1 24, 0 9 Z"
            stroke="#929CC5"
            strokeOpacity="0.35"
            strokeWidth="1.2"
          />
          <path
            d="M0 9 C 10 14, 12 26, 5 34 C 0 30, -1 24, 0 9 Z"
            stroke="#929CC5"
            strokeOpacity="0.35"
            strokeWidth="1.2"
          />
        </g>
      </defs>
      {items.map((_, i) => {
        const x = 80 + i * 140;
        const y = 60 + ((i % 3) - 1) * 38;
        const scale = 0.85 + ((i * 13) % 7) * 0.07;
        return <use key={i} href="#cat-glyph" transform={`translate(${x} ${y}) scale(${scale})`} />;
      })}
    </svg>
  );
}
