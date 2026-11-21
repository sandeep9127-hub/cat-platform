"use client";

import { useEffect, useState, type CSSProperties } from "react";

/**
 * The CAT logo as the talk-mode indicator (Sandeep, 21 Nov: "the centre
 * indicator should be the CAT logo, animated"). The two petals stay still;
 * the four teal arcs move:
 *   listening: the arcs breathe inner → outer, nudged by the mic level
 *   thinking:  the arcs light up one after another, in a loop
 *   speaking:  the arcs radiate outward with the Hub's voice level, plus a
 *              faint ring that expands
 *   idle:      still
 * With reduced motion nothing moves: each state is a fixed arc opacity, and
 * the state word sits under the logo.
 * Paths from public/images/cat-logo-mark-animated.svg (viewBox 0 0 84 83).
 */

export type LogoState = "idle" | "connecting" | "listening" | "thinking" | "speaking";

const TEAL = "#2D7574";
const PETAL = "#646D96";

const PETALS = [
  "M42.0731 82.9996C18.8713 82.9996 0 64.3798 0 41.4996C0 40.1814 0.0688313 38.8348 0.200758 37.4826L0.321213 36.2266H1.60033C27.8021 36.3171 50.8491 53.794 57.6577 78.7223L57.9904 79.9388L56.7916 80.3801C52.0824 82.117 47.1265 82.9996 42.0731 82.9996ZM2.89092 39.0215C2.83356 39.8532 2.81061 40.6849 2.81061 41.4996C2.81061 62.8522 20.4257 80.2273 42.0731 80.2273C46.3579 80.2273 50.5623 79.5484 54.589 78.2131C47.8263 55.548 26.8557 39.6552 2.89092 39.0215Z",
  "M42.0731 82.9996C37.0198 82.9996 32.0639 82.117 27.3547 80.3801L26.1559 79.9388L26.4886 78.7223C33.2914 53.7884 56.3442 36.3171 82.546 36.2266H83.8251L83.9455 37.4826C84.0774 38.8405 84.1463 40.1927 84.1463 41.4996C84.1463 64.3798 65.275 82.9996 42.0731 82.9996ZM29.5516 78.2131C33.5839 79.554 37.7884 80.2273 42.0731 80.2273C63.7206 80.2273 81.3357 62.8522 81.3357 41.4996C81.3357 40.6906 81.307 39.8589 81.2554 39.0215C57.2906 39.6552 36.32 55.548 29.5573 78.2131H29.5516Z",
];

// Innermost first.
const ARCS = [
  "M42.01 26.9307C35.0351 26.9307 29.1156 31.423 27.0392 37.6296C27.8881 38.0086 28.737 38.416 29.5974 38.8403C31.192 33.5616 36.1479 29.703 42.01 29.703C47.8721 29.703 52.5297 33.341 54.2677 38.3821C55.0765 37.9804 55.9197 37.5787 56.8087 37.1826C54.6004 31.2136 48.8071 26.9363 42.01 26.9363V26.9307Z",
  "M42.01 17.624C31.0716 17.624 21.7851 24.6397 18.4755 34.3428C19.3416 34.6257 20.2307 34.9256 21.1255 35.2481C24.0508 26.6312 32.2991 20.3963 42.0043 20.3963C51.7095 20.3963 59.6653 26.4219 62.7225 34.8124C63.5772 34.5069 64.4663 34.2071 65.3783 33.9185C61.9424 24.4417 52.7764 17.6297 42.0043 17.6297L42.01 17.624Z",
  "M42.0101 8.54297C26.8729 8.54297 14.0416 18.4441 9.80847 32.0229C10.6861 32.2096 11.5981 32.4189 12.5503 32.6565C16.4851 20.3055 28.2036 11.3153 42.0043 11.3153C55.805 11.3153 67.2482 20.0962 71.315 32.2322C72.2098 32.0115 73.1275 31.7965 74.0625 31.5929C69.6975 18.2348 56.9809 8.54297 42.0043 8.54297H42.0101Z",
  "M4.28473 31.0387C9.01688 14.3652 24.4236 2.77232 42.0731 2.77232C59.7226 2.77232 74.8139 14.1502 79.7124 30.5295C80.6302 30.3824 81.5651 30.241 82.523 30.1165C77.3951 12.3623 60.8526 0 42.0731 0C23.2936 0 6.38409 12.6056 1.45691 30.6993C2.21979 30.7728 3.17196 30.886 4.28473 31.0444V31.0387Z",
];

// Static, so a plain <style> is safe (the CSP allows inline styles).
const CSS = `
.catlogo-arc, .catlogo-group { transform-box: view-box; transform-origin: 42px 41.5px; }
@keyframes catlogo-breathe { 0%,100% { opacity: .5; transform: scale(.985); } 50% { opacity: 1; transform: scale(1.02); } }
@keyframes catlogo-think { 0%,100% { opacity: .22; } 18% { opacity: 1; } 40% { opacity: .22; } }
@keyframes catlogo-ring { 0% { opacity: .28; transform: scale(1); } 100% { opacity: 0; transform: scale(1.32); } }
.catlogo-listening .catlogo-arc { animation: catlogo-breathe 2.4s ease-in-out infinite; }
.catlogo-thinking .catlogo-arc { animation: catlogo-think 1.6s ease-in-out infinite; }
.catlogo-ring { transform-box: view-box; transform-origin: 42px 41.5px; animation: catlogo-ring 1.8s ease-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .catlogo-arc, .catlogo-ring, .catlogo-group { animation: none !important; transition: none !important; }
}
`;

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

/** Fixed arc opacities per state when motion is reduced (innermost first). */
const STILL: Record<LogoState, number[]> = {
  idle: [0.55, 0.55, 0.55, 0.55],
  connecting: [0.35, 0.35, 0.35, 0.35],
  listening: [1, 1, 1, 1],
  thinking: [1, 0.35, 1, 0.35],
  speaking: [1, 0.8, 0.6, 0.4],
};

export function CatLogo({
  state,
  micLevel = 0,
  voiceLevel = 0,
  label,
  className = "",
}: {
  state: LogoState;
  /** Mic input level 0–1 (listening). */
  micLevel?: number;
  /** The Hub's playback level 0–1 (speaking). */
  voiceLevel?: number;
  /** State word shown under the logo when motion is reduced. */
  label?: string;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const moving = !reduced && (state === "listening" || state === "thinking" || state === "speaking");

  const arcStyle = (i: number): CSSProperties => {
    if (reduced || !moving) return { opacity: STILL[state][i] };
    if (state === "listening") {
      // Staggered breathe, inner → outer.
      return { animationDelay: `${i * 0.28}s` };
    }
    if (state === "thinking") {
      return { animationDelay: `${i * 0.4}s` };
    }
    // Speaking: outer arcs push out further with the voice, like sound leaving the mark.
    const v = Math.min(1, voiceLevel * 1.15);
    return {
      opacity: 0.45 + 0.55 * Math.min(1, v * (1.4 - i * 0.2) + 0.15),
      transform: `scale(${1 + v * (0.025 + i * 0.022)})`,
      transition: "transform 90ms linear, opacity 90ms linear",
    };
  };

  // Listening: the whole arc group swells a little with the reader's voice.
  const groupScale = !reduced && state === "listening" ? 1 + Math.min(1, micLevel) * 0.05 : 1;

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <style>{CSS}</style>
      <svg
        viewBox="-10 -12 104 104"
        role="img"
        aria-label={label ? `CAT logo, ${label.toLowerCase()}` : "CAT logo"}
        className={`catlogo-${moving ? state : "still"} w-full h-auto overflow-visible`}
        style={{ width: "min(45vmin, 340px, 30svh)" }}
      >
        {moving && state === "speaking" && (
          <circle className="catlogo-ring" cx="42" cy="41.5" r="44" fill="none" stroke={TEAL} strokeWidth="1.2" />
        )}
        <g
          className="catlogo-group"
          style={{ transform: `scale(${groupScale})`, transition: reduced ? undefined : "transform 120ms linear" }}
        >
          {ARCS.map((d, i) => (
            <path key={i} d={d} fill={TEAL} className="catlogo-arc" style={arcStyle(i)} />
          ))}
        </g>
        {PETALS.map((d, i) => (
          <path key={i} d={d} fill={PETAL} />
        ))}
      </svg>
      {reduced && label && (
        <span className="text-[13px] font-semibold uppercase tracking-[0.14em] text-ink-soft">{label}</span>
      )}
    </div>
  );
}
