"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { geoPath } from "d3-geo";
import { gsap } from "gsap";
import { makeIndiaProjection, PROJECTION_VIEWBOX as VB } from "@/components/map/projection";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { ANCHORS } from "@/lib/data/anchors";

export type Pin = {
  slug: string;
  name: string;
  district: string;
  stateCode: string;
  latitude: number;
  longitude: number;
  lipStatus: "published" | "in_preparation";
};

const TEAL = "#2e7573";
const SLATE = "#5e6790";
const AMBER = "#946616";

/**
 * Cartographic scrollytelling for the landscapes index. The India map is the
 * spine: it stays in view while the 11 landscape chapters scroll past, and the
 * active landscape blooms on the map with a connector tracing the journey. The
 * map drifts gently toward each region (GSAP). Reduced motion and small screens
 * collapse to a static map with a clean stacked reading order.
 */
export function LandscapeScrollytelling({ pins }: { pins: Pin[] }) {
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [active, setActive] = useState(0);
  const [reduced, setReduced] = useState(false);
  const groupRef = useRef<SVGGElement | null>(null);
  const chapterRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/geo/india-states.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelled && j) setGeojson(j as GeoJSON.FeatureCollection);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const { paths, points } = useMemo(() => {
    if (!geojson) return { paths: [] as string[], points: [] as { x: number; y: number }[] };
    const proj = makeIndiaProjection(geojson);
    const pathGen = geoPath(proj);
    const paths = (geojson.features as GeoJSON.Feature[]).map((f) => pathGen(f) || "");
    const points = pins.map((p) => {
      const xy = proj([p.longitude, p.latitude]);
      return xy ? { x: xy[0], y: xy[1] } : { x: VB.width / 2, y: VB.height / 2 };
    });
    return { paths, points };
  }, [geojson, pins]);

  // Active chapter = the one nearest the viewport centre.
  useEffect(() => {
    const els = chapterRefs.current.filter(Boolean) as HTMLDivElement[];
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        let best = -1;
        let bestRatio = 0;
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio >= bestRatio) {
            bestRatio = e.intersectionRatio;
            best = Number((e.target as HTMLElement).dataset.idx);
          }
        }
        if (best >= 0) setActive(best);
      },
      { rootMargin: "-42% 0px -42% 0px", threshold: [0, 0.5, 1] },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [points.length]);

  // GSAP: drift the map toward the active region (subtle; pins stay legible).
  useEffect(() => {
    if (!groupRef.current || !points.length) return;
    const p = points[active] ?? { x: VB.width / 2, y: VB.height / 2 };
    if (reduced) {
      gsap.set(groupRef.current, { x: 0, y: 0, scale: 1, transformOrigin: "0 0" });
      return;
    }
    const s = 1.18;
    const tx = VB.width / 2 - p.x * s;
    const ty = VB.height / 2 - p.y * s;
    gsap.to(groupRef.current, {
      x: tx,
      y: ty,
      scale: s,
      transformOrigin: "0 0",
      duration: 1.15,
      ease: "power3.inOut",
      overwrite: true,
    });
  }, [active, points, reduced]);

  const connector = points.slice(0, active + 1).map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <section className="relative bg-cream border-t border-line">
      <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-14 lg:pt-20">
        <span className="eyebrow">A journey across India</span>
        <h2 className="font-sans font-semibold text-[clamp(30px,4vw,56px)] tracking-[-0.035em] leading-[1.02] text-ink mt-3 max-w-[18ch]">
          Eleven landscapes, one transformation
        </h2>
      </div>

      <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 grid grid-cols-1 lg:grid-cols-[0.92fr_1.08fr] gap-8 lg:gap-14">
        {/* Map spine — sticky on desktop */}
        <div className="lg:sticky lg:top-[12vh] self-start order-1 lg:order-none mt-8 lg:mt-16">
          <div
            className="relative rounded-[12px] border border-line overflow-hidden"
            style={{
              background:
                "radial-gradient(ellipse 70% 55% at 50% 8%, rgba(208,218,239,0.45), transparent 70%), linear-gradient(180deg, rgba(251,248,242,1) 0%, rgba(244,237,221,0.85) 100%)",
            }}
          >
            <svg viewBox={`0 0 ${VB.width} ${VB.height}`} className="w-full h-auto block" role="img" aria-label="Map of India with the eleven CAT landscapes">
              <g ref={groupRef}>
                {paths.map((d, i) => (
                  <path key={i} d={d} fill="rgba(94,103,144,0.07)" stroke="rgba(94,103,144,0.28)" strokeWidth={0.4} />
                ))}
                {/* Journey connector */}
                {!reduced && points.length > 1 && (
                  <polyline
                    points={connector}
                    fill="none"
                    stroke={AMBER}
                    strokeWidth={0.9}
                    strokeLinecap="round"
                    strokeDasharray="2 3"
                    opacity={0.7}
                  />
                )}
                {points.map((p, i) => {
                  const isActive = i === active;
                  const visited = i <= active;
                  return (
                    <g key={i}>
                      {isActive && (
                        <circle cx={p.x} cy={p.y} r={6.5} fill={AMBER} opacity={0.16}>
                          {!reduced && <animate attributeName="r" values="5;8;5" dur="2.4s" repeatCount="indefinite" />}
                        </circle>
                      )}
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={isActive ? 3.4 : 2}
                        fill={isActive ? AMBER : visited ? TEAL : SLATE}
                        opacity={isActive ? 1 : visited ? 0.85 : 0.4}
                        stroke="#faf9f5"
                        strokeWidth={0.6}
                      />
                    </g>
                  );
                })}
              </g>
            </svg>
            <div className="absolute top-3 left-4 font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
              <span className="text-amber-deep font-semibold tabular-nums">{String(active + 1).padStart(2, "0")}</span>
              <span className="text-line"> / </span>
              {String(pins.length).padStart(2, "0")}
            </div>
          </div>
        </div>

        {/* Chapters */}
        <div className="order-2 lg:order-none pb-10">
          {pins.map((pin, i) => {
            const profile = LANDSCAPES[pin.slug];
            const anchor = ANCHORS[pin.slug];
            const isActive = i === active;
            return (
              <div
                key={pin.slug}
                data-idx={i}
                ref={(el) => {
                  chapterRefs.current[i] = el;
                }}
                className="lg:min-h-[78vh] flex flex-col justify-center py-12 lg:py-0"
              >
                <div
                  className={
                    "transition-opacity duration-500 " +
                    (reduced ? "opacity-100" : isActive ? "opacity-100" : "lg:opacity-40")
                  }
                >
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-teal font-semibold flex items-center gap-2 flex-wrap">
                    <span className="text-amber-deep tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                    <span className="text-line">/</span>
                    {profile?.region ?? pin.stateCode}
                  </div>
                  <h3 className="font-sans font-semibold text-[clamp(30px,4.2vw,56px)] tracking-[-0.03em] leading-[1.0] text-ink mt-3">
                    {pin.name}
                  </h3>
                  <p className="text-[15.5px] sm:text-[16.5px] text-ink-soft leading-[1.6] mt-4 max-w-[48ch]">
                    {profile?.context}
                  </p>

                  <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4">
                    {anchor && (
                      <div>
                        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">Anchor partner</span>
                        <div className="mt-1.5 flex items-center gap-2.5">
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-[7px] bg-paper border border-line p-1">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={anchor.logo} alt={anchor.name} className="max-h-full max-w-full object-contain" />
                          </span>
                          <span className="font-sans text-[13px] text-ink leading-tight max-w-[18ch]">{anchor.short}</span>
                        </div>
                      </div>
                    )}
                    <div>
                      <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">Investment plan</span>
                      <div className="mt-1.5 font-sans text-[14px] text-ink">
                        {pin.lipStatus === "published" ? (
                          <span className="text-deep-teal font-medium">Published</span>
                        ) : (
                          <span className="text-amber-deep font-medium">In preparation</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/landscape/${pin.slug}`}
                    className="group mt-7 inline-flex items-center gap-2 rounded-full bg-deep-teal text-paper px-6 py-3 text-[14px] font-medium hover:bg-teal active:scale-[0.97] transition-[transform,background-color] duration-150 ease-out-expo"
                  >
                    Open {pin.name}
                    <span className="transition-transform duration-200 ease-out-expo group-hover:translate-x-0.5">&rarr;</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
