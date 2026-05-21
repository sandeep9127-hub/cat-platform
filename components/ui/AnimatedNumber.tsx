"use client";

import { useEffect, useRef, useState } from "react";

type AnimatedNumberProps = {
  /** The display value. If numeric (after parsing), it counts up from 0. Otherwise renders the value unchanged. */
  value: string;
  /** Animation duration in ms. Default 900. */
  duration?: number;
};

/**
 * A drop-in span that animates from 0 → the parsed numeric portion of `value`
 * when it first enters the viewport. Preserves any leading or trailing
 * non-numeric characters (e.g. "₹120 cr", "10 / 11", "+5", "₹ 60 cr").
 *
 * If the value cannot be parsed as a finite number, it renders as plain text
 * with no animation.
 *
 * Respects prefers-reduced-motion: skips the count-up entirely.
 */
export function AnimatedNumber({ value, duration = 900 }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState<string>("");
  const startedRef = useRef(false);

  // Parse: find the first contiguous numeric run (with optional decimal point).
  const match = value.match(/-?\d+(?:[.,]\d+)?/);
  const numericStr = match?.[0] ?? null;
  const numericTarget = numericStr ? Number(numericStr.replace(/,/g, "")) : NaN;
  const hasNumber = Number.isFinite(numericTarget);
  const decimals = numericStr && numericStr.includes(".")
    ? (numericStr.split(".")[1]?.length ?? 0)
    : 0;
  const prefix = hasNumber ? value.slice(0, value.indexOf(numericStr!)) : "";
  const suffix = hasNumber
    ? value.slice(value.indexOf(numericStr!) + numericStr!.length)
    : "";

  useEffect(() => {
    if (!hasNumber) {
      setDisplay(value);
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setDisplay(value);
      return;
    }
    // Default initial display: zero with the same formatting shell.
    const formatZero = decimals > 0 ? (0).toFixed(decimals) : "0";
    setDisplay(prefix + formatZero + suffix);

    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !startedRef.current) {
            startedRef.current = true;
            io.disconnect();
            runAnimation();
          }
        }
      },
      { threshold: 0.4, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();

    function runAnimation() {
      const start = performance.now();
      const from = 0;
      const to = numericTarget;
      function tick(now: number) {
        const t = Math.min(1, (now - start) / duration);
        // ease-out-expo
        const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        const current = from + (to - from) * eased;
        const rendered =
          decimals > 0 ? current.toFixed(decimals) : Math.round(current).toString();
        setDisplay(prefix + formatWithIndianGrouping(rendered) + suffix);
        if (t < 1) {
          requestAnimationFrame(tick);
        }
      }
      requestAnimationFrame(tick);
    }
  }, [value, duration, hasNumber, decimals, numericTarget, prefix, suffix]);

  return <span ref={ref}>{display || value}</span>;
}

/** Indian-style grouping (e.g. 1,23,456). Skips small numbers and decimals. */
function formatWithIndianGrouping(s: string): string {
  if (s.includes(".") || s.length <= 3) return s;
  const negative = s.startsWith("-");
  const body = negative ? s.slice(1) : s;
  const last3 = body.slice(-3);
  const rest = body.slice(0, -3);
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return (negative ? "-" : "") + (grouped ? grouped + "," + last3 : last3);
}
