"use client";

import { useEffect, useRef, useState, type ReactNode, type ElementType } from "react";

type StaggerRevealProps = {
  children: ReactNode;
  /** The element to render as the grid/list container. Default 'div'. */
  as?: ElementType;
  /** Classes for the container (keep the grid + gap-px here so cells stay direct children). */
  className?: string;
};

/**
 * Renders a container whose DIRECT children cascade in (soft rise + fade,
 * staggered) the first time the container scrolls into view. The container
 * itself is the grid element, so `gap-px bg-line` hairline grids stay intact
 * (no wrapper between grid and cells).
 *
 * Stagger delays live in globals.css under `.sg-in > *:nth-child(n)`.
 * Respects prefers-reduced-motion: children render fully visible, no motion.
 */
export function StaggerReveal({ children, as, className }: StaggerRevealProps) {
  const Tag = (as ?? "div") as ElementType;
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || shown || reduced) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown, reduced]);

  return (
    <Tag ref={ref} className={`${reduced ? "" : "sg"} ${shown ? "sg-in" : ""} ${className ?? ""}`}>
      {children}
    </Tag>
  );
}
