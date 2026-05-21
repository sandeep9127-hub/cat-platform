"use client";

import { useRef, type ReactNode, type CSSProperties } from "react";

type SpotlightCardProps = {
  /** Spotlight tint colour, any valid CSS colour. Default a soft amber. */
  spotlight?: string;
  /** Spotlight radius in pixels. Default 220. */
  radius?: number;
  className?: string;
  children: ReactNode;
  style?: CSSProperties;
  as?: "div" | "a" | "li";
  /** When rendering as an anchor. */
  href?: string;
  ariaLabel?: string;
};

/**
 * A wrapper that tracks the cursor on hover and exposes its position via
 * --mx and --my CSS variables, so a radial-gradient layer can follow the
 * pointer. Adds a subtle 1px hairline ring that also illuminates near the
 * cursor — the surface feels alive.
 *
 * Skipped entirely on touch (pointerType === "touch") and when the user
 * prefers reduced motion. Coexists peacefully with floating-tile shadows.
 */
export function SpotlightCard({
  spotlight = "rgba(248,202,124,0.28)",
  radius = 220,
  className = "",
  children,
  style,
  as = "div",
  href,
  ariaLabel,
}: SpotlightCardProps) {
  const ref = useRef<HTMLElement | null>(null);

  function onPointerMove(e: React.PointerEvent<HTMLElement>) {
    if (e.pointerType === "touch") return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
    el.style.setProperty("--spot-opacity", "1");
  }

  function onPointerLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--spot-opacity", "0");
  }

  const layerStyle: CSSProperties = {
    background: `radial-gradient(${radius}px circle at var(--mx, 50%) var(--my, 50%), ${spotlight}, transparent 60%)`,
    opacity: "var(--spot-opacity, 0)" as unknown as number,
    transition: "opacity 220ms ease-out",
  };

  const content = (
    <>
      <span
        aria-hidden
        className="absolute inset-0 pointer-events-none rounded-[inherit] z-0"
        style={layerStyle}
      />
      <span className="relative z-[1]">{children}</span>
    </>
  );

  const sharedProps = {
    ref: ref as React.RefObject<never>,
    className: `relative ${className}`,
    style: { ...style, ["--spot-opacity" as string]: 0 } as CSSProperties,
    onPointerMove,
    onPointerLeave,
  };

  if (as === "a" && href) {
    return (
      <a {...sharedProps} href={href} aria-label={ariaLabel}>
        {content}
      </a>
    );
  }
  if (as === "li") {
    return <li {...sharedProps}>{content}</li>;
  }
  return <div {...sharedProps}>{content}</div>;
}
