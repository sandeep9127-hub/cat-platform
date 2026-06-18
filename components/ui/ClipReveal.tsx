"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Reveals its children with a clip-path wipe (bottom → up) plus a slight
 * settle-scale once they enter the viewport — like a photograph developing.
 * The motion lives in the `.clip-reveal` / `.clip-reveal.in` CSS (globals.css),
 * which also handles prefers-reduced-motion (fades instead of moving).
 *
 * Wrap an <img>/<Image> (or any visual). Pass rounding/sizing via className;
 * overflow is hidden so the settle-scale never spills.
 */
export function ClipReveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  /** Stagger delay in ms (applied as transition-delay). */
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;

    let io: IntersectionObserver | null = null;
    const inView = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight || 0;
      return r.top < vh * 0.92 && r.bottom > 0;
    };
    const cleanup = () => {
      io?.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
    const reveal = () => {
      setShown(true);
      cleanup();
    };
    const onScroll = () => {
      if (inView()) reveal();
    };

    // Already in view at mount → still animates (initial clipped state paints
    // first). Otherwise IO (efficient) + a scroll/rect fallback so the reveal
    // never gets stuck if IO doesn't fire.
    if (inView()) {
      reveal();
      return;
    }
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) reveal();
        },
        { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
      );
      io.observe(el);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return cleanup;
  }, [shown]);

  return (
    <div
      ref={ref}
      className={`clip-reveal overflow-hidden ${shown ? "in" : ""} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms, ${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
