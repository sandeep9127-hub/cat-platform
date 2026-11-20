"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

// useLayoutEffect on the client (runs before paint), useEffect on the server.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

type RevealProps = {
  children: ReactNode;
  /** Milliseconds to wait before animating in. Useful for staggering siblings. */
  delay?: number;
  /** Vertical pixels the element rises from. Default 16. */
  y?: number;
  /** Animation duration in ms. Default 500. */
  duration?: number;
  /** Render-as element. Default 'div'. */
  as?: "div" | "section" | "article" | "header" | "aside" | "ul" | "li";
  className?: string;
};

/**
 * Reveals children with a soft rise + fade as they scroll into view.
 *
 * Server-rendered content is always visible: nothing is hidden before JS
 * runs. On mount, an element that is already on screen (a page hero, the
 * first fold) stays put with no animation, so above-the-fold content never
 * fades. Only elements that start below the fold are hidden and then revealed
 * by an IntersectionObserver. The single page-level fade is `.route-fade`
 * in app/(public)/template.tsx.
 *
 * Respects prefers-reduced-motion: nothing is ever hidden or moved.
 */
type Phase = "static" | "hidden" | "shown";

export function Reveal({
  children,
  delay = 0,
  y = 16,
  duration = 500,
  as: Tag = "div",
  className,
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [phase, setPhase] = useState<Phase>("static");

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return; // already in view
    setPhase("hidden");
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setPhase("shown");
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -10% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const style: React.CSSProperties | undefined =
    phase === "static"
      ? undefined
      : {
          opacity: phase === "shown" ? 1 : 0,
          transform: phase === "shown" ? "none" : `translate3d(0, ${y}px, 0)`,
          transition: `opacity ${duration}ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform ${duration}ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
        };

  // The component must be polymorphic but we keep things simple with a switch.
  const props = { ref: ref as React.RefObject<never>, style, className };
  switch (Tag) {
    case "section":
      return <section {...props}>{children}</section>;
    case "article":
      return <article {...props}>{children}</article>;
    case "header":
      return <header {...props}>{children}</header>;
    case "aside":
      return <aside {...props}>{children}</aside>;
    case "ul":
      return <ul {...props}>{children}</ul>;
    case "li":
      return <li {...props}>{children}</li>;
    default:
      return <div {...props}>{children}</div>;
  }
}
