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
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
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
