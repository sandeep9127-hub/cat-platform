"use client";

import { useEffect, useState } from "react";

type Parts = { d: number; h: number; m: number; s: number; done: boolean };

function partsTo(targetMs: number): Parts {
  const ms = Math.max(0, targetMs - Date.now());
  return {
    d: Math.floor(ms / 86_400_000),
    h: Math.floor((ms % 86_400_000) / 3_600_000),
    m: Math.floor((ms % 3_600_000) / 60_000),
    s: Math.floor((ms % 60_000) / 1000),
    done: ms === 0,
  };
}

/**
 * Live countdown to launch. Ticks every second on the client. Renders neutral
 * placeholders before mount so there is no SSR/CSR hydration mismatch.
 */
export function LaunchCountdown({ target }: { target: string }) {
  const targetMs = new Date(target).getTime();
  const [t, setT] = useState<Parts | null>(null);

  useEffect(() => {
    if (!Number.isFinite(targetMs)) return;
    const tick = () => setT(partsTo(targetMs));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  if (t?.done) {
    return (
      <div className="mt-7 rounded-[12px] border border-line bg-paper px-5 py-4 text-center">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-teal font-semibold">
          The Hub is live
        </span>
      </div>
    );
  }

  const cells: [number | undefined, string][] = [
    [t?.d, "Days"],
    [t?.h, "Hrs"],
    [t?.m, "Min"],
    [t?.s, "Sec"],
  ];

  return (
    <div className="mt-7" aria-label="Countdown to launch">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-deep text-center mb-3">
        Launches in
      </div>
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {cells.map(([v, label]) => (
          <div
            key={label}
            className="rounded-[11px] border border-line bg-paper py-3.5 flex flex-col items-center"
            style={{ boxShadow: "0 1px 2px rgba(26,38,37,0.04)" }}
          >
            <span className="font-sans text-[26px] sm:text-[30px] font-semibold leading-none tracking-[-0.02em] text-deep-teal tabular-nums">
              {t ? String(v).padStart(2, "0") : "—"}
            </span>
            <span className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-muted mt-2">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
