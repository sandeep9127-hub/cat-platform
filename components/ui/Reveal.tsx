"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  /** Milliseconds to wait before animating in. Useful for staggering siblings. */
  delay?: number;
  /** Vertical pixels the element rises from. Default 22. */
  y?: number;
  /** Animation duration in ms. Default 720. */
  duration?: number;
  /** Render-as element. Default 'div'. */
  as?: "div" | "section" | "article" | "header" | "aside" | "ul" | "li";
  className?: string;
};

/**
 * Reveals children with a soft rise + fade once they enter the viewport.
 * Uses IntersectionObserver so it never thrashes scroll, and the
 * easing is a deep ease-out (expo) so motion settles quietly.
 *
 * Respects prefers-reduced-motion: the element renders fully visible
 * with no transform.
 */
export function Reveal({
  children,
  delay = 0,
  y = 22,
  duration = 720,
  as: Tag = "div",
  className,
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible || reduced) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -10% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible, reduced]);

  const style: React.CSSProperties = reduced
    ? {}
    : {
        opacity: visible ? 1 : 0,
        transform: visible ? "translate3d(0,0,0)" : `translate3d(0, ${y}px, 0)`,
        transition: `opacity ${duration}ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform ${duration}ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
        willChange: visible ? "auto" : "opacity, transform",
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
