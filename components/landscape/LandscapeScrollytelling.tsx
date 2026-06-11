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
const ZOOM = 3.6;
const CX = VB.width / 2;
const CY = VB.height / 2;
const INTRO = -1; // establishing wide shot

/**
 * Cartographic scrollytelling for the landscapes index, bookended by wide shots
 * so an international audience is always oriented:
 *   Beat 0  establishing shot  full India, all 11 pins
 *   Beats 1..11  guided dive    camera flies deep into each region
 *   Beat 12 pull-back close      back out to all-of-India, journey complete
 * A persistent corner locator keeps the national context visible during deep
 * zooms. Reduced motion and small screens collapse to a static overview.
 */
export function LandscapeScrollytelling({ pins }: { pins: Pin[] }) {
  const N = pins.length;
  const OUTRO = N; // pull-back wide shot

  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [active, setActive] = useState(INTRO);
  const [reduced, setReduced] = useState(false);

  const mapGroupRef = useRef<SVGGElement | null>(null);
  const pinRefs = useRef<Array<SVGCircleElement | null>>([]);
  const haloRef = useRef<SVGCircleElement | null>(null);
  const camRef = useRef({ s: 1, tx: 0, ty: 0 });
  const activeRef = useRef<number>(INTRO);
  const chapterRefs = useRef<Array<HTMLDivElement | null>>([]);
  const introDone = useRef(false);

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
      return xy ? { x: xy[0], y: xy[1] } : { x: CX, y: CY };
    });
    return { paths, points };
  }, [geojson, pins]);

  const isLandscape = (a: number) => a >= 0 && a < N;

  function targetFor(a: number) {
    if (!isLandscape(a) || !points.length) return { s: 1, tx: 0, ty: 0 }; // overview
    const p = points[a];
    return { s: ZOOM, tx: CX - p.x * ZOOM, ty: CY - p.y * ZOOM };
  }

  function applyCamera(s: number, tx: number, ty: number) {
    if (mapGroupRef.current) {
      mapGroupRef.current.setAttribute("transform", `translate(${tx} ${ty}) scale(${s})`);
    }
    const ai = activeRef.current;
    pinRefs.current.forEach((c, i) => {
      if (!c) return;
      const base = isLandscape(ai) && i === ai ? 3.6 : 2.1;
      c.setAttribute("r", String(base / s));
    });
    if (haloRef.current) haloRef.current.setAttribute("r", String(8 / s));
  }

  // Active beat = nearest the viewport centre.
  useEffect(() => {
    const els = chapterRefs.current.filter(Boolean) as HTMLDivElement[];
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        let best: number | null = null;
        let bestRatio = 0;
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio >= bestRatio) {
            bestRatio = e.intersectionRatio;
            best = Number((e.target as HTMLElement).dataset.idx);
          }
        }
        if (best !== null) setActive(best);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.5, 1] },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [points.length]);

  // Camera flight on active change.
  useEffect(() => {
    activeRef.current = active;
    if (!points.length) return;
    const t = targetFor(active);
    if (reduced) {
      camRef.current = { s: 1, tx: 0, ty: 0 };
      applyCamera(1, 0, 0);
      return;
    }
    const tween = gsap.to(camRef.current, {
      ...t,
      duration: 1.5,
      ease: "power3.inOut",
      overwrite: true,
      onUpdate: () => applyCamera(camRef.current.s, camRef.current.tx, camRef.current.ty),
    });
    return () => {
      tween.kill();
    };
  }, [active, points, reduced]);

  // Seat the camera wide on mount + a one-time pin drop-in for the establishing shot.
  useEffect(() => {
    if (!points.length) return;
    camRef.current = { s: 1, tx: 0, ty: 0 };
    applyCamera(1, 0, 0);
    if (!reduced && !introDone.current) {
      introDone.current = true;
      const circles = pinRefs.current.filter(Boolean) as SVGCircleElement[];
      gsap.from(circles, { attr: { opacity: 0 }, duration: 0.6, stagger: 0.05, ease: "power2.out", delay: 0.25 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points.length, reduced]);

  const connectorEnd = active < 0 ? -1 : active >= N ? N - 1 : active;
  const connectorPts = points.slice(0, connectorEnd + 1).map((p) => `${p.x},${p.y}`).join(" ");
  const activePoint = isLandscape(active) ? points[active] : { x: CX, y: CY };
  const mapLabel = active < 0 ? "All of India" : active >= N ? "Eleven landscapes" : pins[active]?.name;

  function pinFill(i: number): { fill: string; opacity: number } {
    if (active >= N) return { fill: TEAL, opacity: 0.85 }; // outro: all complete
    if (active < 0) return { fill: SLATE, opacity: 0.5 }; // intro: none yet
    if (i === active) return { fill: AMBER, opacity: 1 };
    if (i < active) return { fill: TEAL, opacity: 0.9 };
    return { fill: SLATE, opacity: 0.42 };
  }

  return (
    <section className="relative bg-cream border-t border-line">
      <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 grid grid-cols-1 lg:grid-cols-[0.92fr_1.08fr] gap-8 lg:gap-14">
        {/* Map spine — sticky on desktop */}
        <div className="lg:sticky lg:top-[10vh] self-start order-1 lg:order-none mt-8 lg:mt-16">
          <div
            className="relative rounded-[12px] border border-line overflow-hidden"
            style={{
              background:
                "radial-gradient(ellipse 70% 55% at 50% 8%, rgba(208,218,239,0.45), transparent 70%), linear-gradient(180deg, rgba(251,248,242,1) 0%, rgba(244,237,221,0.85) 100%)",
            }}
          >
            <svg viewBox={`0 0 ${VB.width} ${VB.height}`} className="w-full h-auto block" role="img" aria-label="Map of India with the eleven CAT landscapes">
              <g ref={mapGroupRef}>
                {paths.map((d, i) => (
                  <path key={i} d={d} fill="rgba(94,103,144,0.07)" stroke="rgba(94,103,144,0.30)" strokeWidth={0.4} vectorEffect="non-scaling-stroke" />
                ))}
                {!reduced && connectorEnd > 0 && (
                  <polyline
                    points={connectorPts}
                    fill="none"
                    stroke={AMBER}
                    strokeWidth={1.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="3 4"
                    opacity={0.75}
                    vectorEffect="non-scaling-stroke"
                  />
                )}
                {!reduced && isLandscape(active) && (
                  <circle ref={haloRef} cx={activePoint.x} cy={activePoint.y} r={2.2} fill={AMBER} opacity={0.16}>
                    <animate attributeName="opacity" values="0.08;0.22;0.08" dur="2.6s" repeatCount="indefinite" />
                  </circle>
                )}
                {points.map((p, i) => {
                  const { fill, opacity } = pinFill(i);
                  return (
                    <circle
                      key={i}
                      ref={(el) => {
                        pinRefs.current[i] = el;
                      }}
                      cx={p.x}
                      cy={p.y}
                      r={isLandscape(active) && i === active ? 3.6 : 2.1}
                      fill={fill}
                      opacity={opacity}
                      stroke="#faf9f5"
                      strokeWidth={0.7}
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })}
              </g>
            </svg>

            {/* Persistent "you are here" locator — only during the dive */}
            {isLandscape(active) && (
              <div className="absolute bottom-3 right-3 w-[64px] sm:w-[76px] rounded-[6px] border border-line/80 bg-paper/90 backdrop-blur-sm p-1 transition-opacity duration-300">
                <svg viewBox={`0 0 ${VB.width} ${VB.height}`} className="w-full h-auto block" aria-hidden>
                  {paths.map((d, i) => (
                    <path key={i} d={d} fill="rgba(94,103,144,0.10)" stroke="rgba(94,103,144,0.35)" strokeWidth={0.5} />
                  ))}
                  <circle cx={activePoint.x} cy={activePoint.y} r={14} fill={AMBER} opacity={0.18} />
                  <circle cx={activePoint.x} cy={activePoint.y} r={7} fill={AMBER} stroke="#faf9f5" strokeWidth={2} />
                </svg>
              </div>
            )}

            <div className="absolute top-3 left-4 font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
              {isLandscape(active) ? (
                <>
                  <span className="text-amber-deep font-semibold tabular-nums">{String(active + 1).padStart(2, "0")}</span>
                  <span className="text-line"> / </span>
                  {String(N).padStart(2, "0")}
                </>
              ) : (
                <span className="text-deep-teal font-semibold">{mapLabel}</span>
              )}
            </div>
            {isLandscape(active) && (
              <div className="absolute bottom-3 left-4 font-mono text-[9.5px] uppercase tracking-[0.14em] text-deep-teal font-semibold max-w-[55%]">
                {mapLabel}
              </div>
            )}
          </div>
        </div>

        {/* Beats */}
        <div className="order-2 lg:order-none pb-10">
          {/* Beat 0 — establishing shot */}
          <div
            data-idx={INTRO}
            ref={(el) => {
              chapterRefs.current[0] = el;
            }}
            className="lg:min-h-[88vh] flex flex-col justify-center pt-14 lg:pt-24 pb-12 lg:pb-0"
          >
            <span className="eyebrow">A journey across India</span>
            <h2 className="font-sans font-semibold text-[clamp(32px,4.4vw,60px)] tracking-[-0.035em] leading-[1.0] text-ink mt-3 max-w-[16ch]">
              Eleven landscapes, one transformation
            </h2>
            <p className="text-[16.5px] sm:text-[18px] text-ink-soft leading-[1.6] mt-6 max-w-[52ch]">
              From the Himalayan valleys of Pangi to the Sundarbans delta, eleven places
              where the Consortium works to transform India&apos;s food systems, each one a
              different climate, community, and way of farming.
            </p>
          </div>

          {/* Beats 1..N — the dive */}
          {pins.map((pin, i) => {
            const profile = LANDSCAPES[pin.slug];
            const anchor = ANCHORS[pin.slug];
            const isActive = i === active;
            return (
              <div
                key={pin.slug}
                data-idx={i}
                ref={(el) => {
                  chapterRefs.current[i + 1] = el;
                }}
                className="lg:min-h-[82vh] flex flex-col justify-center py-12 lg:py-0"
              >
                <div className={"transition-opacity duration-500 " + (reduced ? "opacity-100" : isActive ? "opacity-100" : "lg:opacity-35")}>
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
                          <span className="inline-flex items-center justify-center w-12 h-12 rounded-[7px] bg-paper border border-line p-1">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={anchor.logo} alt={anchor.name} className="max-h-full max-w-full object-contain" />
                          </span>
                          <span className="font-sans text-[13px] text-ink leading-tight max-w-[18ch]">{anchor.short}</span>
                        </div>
                      </div>
                    )}
                    <div>
                      <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">Investment plan</span>
                      <div className="mt-1.5 font-sans text-[14px]">
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

          {/* Beat N+1 — pull-back close */}
          <div
            data-idx={OUTRO}
            ref={(el) => {
              chapterRefs.current[N + 1] = el;
            }}
            className="lg:min-h-[80vh] flex flex-col justify-center py-14 lg:py-0"
          >
            <span className="eyebrow">One country</span>
            <h2 className="font-sans font-semibold text-[clamp(30px,4vw,54px)] tracking-[-0.035em] leading-[1.02] text-ink mt-3 max-w-[16ch]">
              Eleven landscapes, working as one
            </h2>
            <p className="text-[16px] text-ink-soft leading-[1.6] mt-5 max-w-[50ch]">
              Different states, climates and communities, one effort to make India&apos;s
              food systems work for people and the land. Explore any landscape in depth, or
              meet the partners delivering them on the ground.
            </p>
            <Link
              href="/map"
              className="group mt-7 inline-flex w-fit items-center gap-2 rounded-full border border-line text-ink px-6 py-3 text-[14px] font-medium hover:border-deep-teal hover:text-deep-teal transition-colors"
            >
              See the Solutions Atlas
              <span className="transition-transform duration-200 ease-out-expo group-hover:translate-x-0.5">&rarr;</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
