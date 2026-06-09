"use client";

import { useEffect, useState } from "react";

/** Counts down, then forwards the browser to the new home. */
export function MovedRedirect({ to, seconds = 5 }: { to: string; seconds?: number }) {
  const [n, setN] = useState(seconds);
  useEffect(() => {
    const tick = setInterval(() => setN((x) => (x > 0 ? x - 1 : 0)), 1000);
    const go = setTimeout(() => window.location.replace(to), seconds * 1000);
    return () => {
      clearInterval(tick);
      clearTimeout(go);
    };
  }, [to, seconds]);
  return <span className="tabular-nums">{n}</span>;
}
