"use client";

import { useState } from "react";
import { BarChart3, Loader2 } from "lucide-react";
import { VizChart, type VizSpec } from "./VizChart";

const pretty = (slug: string) =>
  slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Visualize (Phase 1). When an answer cites one or more landscapes, offer to
 * chart that landscape's REAL budget data (fetched from /api/agent/visualize —
 * deterministic, never AI-invented). User picks a landscape (if several) and a
 * chart type; the chart renders inline and is downloadable as PNG.
 */
export function VisualizePanel({ slugs }: { slugs: string[] }) {
  const [open, setOpen] = useState(false);
  const [activeSlug, setActiveSlug] = useState<string | null>(slugs.length === 1 ? slugs[0] : null);
  const [loading, setLoading] = useState(false);
  const [charts, setCharts] = useState<VizSpec[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState<VizSpec | null>(null);

  async function load(slug: string) {
    setActiveSlug(slug);
    setCharts(null);
    setShown(null);
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/agent/visualize?slug=${encodeURIComponent(slug)}`);
      const j = (await res.json()) as { charts?: VizSpec[] };
      const list = j.charts ?? [];
      setCharts(list);
      if (list.length === 1) setShown(list[0]);
      if (list.length === 0) setError("No chartable budget data for this landscape yet.");
    } catch {
      setError("Couldn't load the data. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && slugs.length === 1 && !charts && !loading) load(slugs[0]);
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted hover:text-deep-teal active:scale-[0.97] transition-[transform,color] duration-150"
      >
        <BarChart3 size={12} strokeWidth={1.9} />
        Visualize
      </button>

      {open && (
        <div className="mt-3 rounded-[10px] border border-line-soft bg-cream/40 p-3.5">
          {/* Landscape chooser (only when more than one cited) */}
          {slugs.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">Landscape</span>
              {slugs.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => load(s)}
                  className={`font-mono text-[9.5px] uppercase tracking-[0.14em] px-2.5 py-1 rounded-full border transition-colors ${
                    activeSlug === s
                      ? "border-deep-teal bg-teal-wash text-deep-teal"
                      : "border-line text-muted hover:text-deep-teal hover:border-deep-teal"
                  }`}
                >
                  {pretty(s)}
                </button>
              ))}
            </div>
          )}

          {!activeSlug && slugs.length > 1 && (
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              Pick a landscape to chart its data.
            </p>
          )}

          {loading && (
            <div className="inline-flex items-center gap-2 text-muted">
              <Loader2 size={13} className="animate-spin" />
              <span className="font-mono text-[10px] uppercase tracking-[0.16em]">Reading the data</span>
            </div>
          )}

          {error && (
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-amber-deep">{error}</p>
          )}

          {/* Chart-type options — "what's possible" */}
          {!loading && charts && charts.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">Chart</span>
              {charts.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setShown(c)}
                  className={`font-mono text-[9.5px] uppercase tracking-[0.14em] px-2.5 py-1 rounded-full border transition-colors ${
                    shown?.id === c.id
                      ? "border-deep-teal bg-teal-wash text-deep-teal"
                      : "border-line text-muted hover:text-deep-teal hover:border-deep-teal"
                  }`}
                >
                  {c.kind === "donut" ? "Funding mix" : "By theme"}
                </button>
              ))}
            </div>
          )}

          {shown && <VizChart spec={shown} />}
        </div>
      )}
    </div>
  );
}
