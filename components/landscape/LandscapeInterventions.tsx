"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { categoryIconFor } from "@/components/ui/CategoryIcon";
import { CATEGORIES } from "@/lib/data/categories";
import { LANDSCAPE_INTERVENTIONS } from "@/lib/data/landscape-interventions";

const COLOUR_BY_SLUG: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, c.colourHex]),
);

// Booklet category names → our taxonomy slug (for icon + colour). Falls back to
// agri-horti-agroforestry. Keyed on lowercased, trimmed names.
const NAME_TO_SLUG: Record<string, string> = {
  "agriculture, horticulture & agroforestry": "agri-horti-agroforestry",
  "natural resource management": "nrm",
  "nrm - private": "nrm",
  "nrm - community": "nrm",
  "forestry & ntfp": "forestry-ntfp",
  "agroforestry & ntfp": "forestry-ntfp",
  "livestock management": "livestock",
  biodiversity: "biodiversity",
  nutrition: "nutrition",
  energy: "energy",
  "energy & infrastructure": "energy",
  fisheries: "fisheries",
  aquaculture: "fisheries",
  market: "market",
  "market development": "market",
  "processing, value addition and markets": "market",
  "post-harvest, processing & markets": "market",
  "institutional strengthening": "market",
  "knowledge building": "technical-assistance",
  agritech: "technical-assistance",
  "other livelihood sources": "market",
};

function slugFor(name: string): string {
  return NAME_TO_SLUG[name.trim().toLowerCase()] ?? "agri-horti-agroforestry";
}

/**
 * "What the plan does on the ground" — the landscape's priority interventions,
 * verbatim from the Landscape Investment Plan, grouped by theme. A masonry of
 * category cards (CAT icon + colour per theme) that fade/rise in on scroll.
 */
export function LandscapeInterventions({
  slug,
  landscapeName,
}: {
  slug: string;
  landscapeName: string;
}) {
  const groups = LANDSCAPE_INTERVENTIONS[slug];
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    const els = cardRefs.current.filter(Boolean) as HTMLDivElement[];
    if (!els.length || !wrapRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.set(els, { opacity: 0, y: 24 });
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            io.disconnect();
            gsap.to(els, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", stagger: 0.08 });
          }
        }
      },
      { threshold: 0.08 },
    );
    io.observe(wrapRef.current);
    return () => io.disconnect();
  }, [slug]);

  if (!groups || groups.length === 0) return null;

  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <section className="mt-16 lg:mt-20 max-w-page mx-auto px-5 sm:px-7 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 mb-8">
        <div>
          <span className="eyebrow">On the ground</span>
          <h2 className="font-sans font-semibold text-[clamp(26px,3vw,40px)] tracking-[-0.03em] leading-[1.05] text-ink mt-3">
            What the plan does on the ground
          </h2>
          <p className="font-sans text-[15px] text-ink-soft leading-[1.55] mt-3 max-w-[60ch]">
            Priority interventions from the {landscapeName} Landscape Investment Plan, grouped by theme.
            Verbatim from the plan, not a summary.
          </p>
        </div>
        <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted pb-1.5">
          <strong className="text-deep-teal text-[13px] font-semibold tabular-nums">{total}</strong> interventions
          <span className="text-line"> · </span>
          {groups.length} themes
        </p>
      </div>

      <div ref={wrapRef} className="columns-1 lg:columns-2 gap-5 [column-fill:balance]">
        {groups.map((g, i) => {
          const sg = slugFor(g.category);
          const Icon = categoryIconFor(sg);
          const colour = COLOUR_BY_SLUG[sg] ?? "#2e7573";
          return (
            <div
              key={g.category + i}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              className="break-inside-avoid mb-5 relative overflow-hidden rounded-[11px] border border-line bg-paper"
              style={{ boxShadow: "0 1px 2px rgba(26,38,37,0.04), 0 14px 32px -26px rgba(26,38,37,0.22)" }}
            >
              <span aria-hidden className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: colour }} />
              <div className="p-5 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span
                    className="inline-flex items-center justify-center w-9 h-9 rounded-[8px] shrink-0"
                    style={{ background: `${colour}1a` }}
                  >
                    <Icon size={18} strokeWidth={1.8} style={{ color: colour }} aria-hidden />
                  </span>
                  <h3 className="font-sans text-[15.5px] font-semibold tracking-[-0.01em] text-ink leading-tight">
                    {g.category}
                  </h3>
                  <span className="ml-auto font-mono text-[10px] tabular-nums text-muted">
                    {g.items.length}
                  </span>
                </div>
                <ul className="list-none p-0 m-0 flex flex-col">
                  {g.items.map((it, k) => (
                    <li
                      key={it.title + k}
                      className={k > 0 ? "pt-3 mt-3 border-t border-line/70" : ""}
                    >
                      <p className="font-sans text-[14px] font-semibold text-deep-teal leading-snug">
                        {it.title}
                      </p>
                      {it.body && (
                        <p className="font-sans text-[13px] text-ink-soft leading-[1.55] mt-1">
                          {it.body}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
