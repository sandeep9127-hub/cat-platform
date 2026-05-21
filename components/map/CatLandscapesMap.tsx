"use client";

import { useEffect, useMemo, useState } from "react";
import { geoPath } from "d3-geo";
import { makeIndiaProjection, PROJECTION_VIEWBOX } from "./projection";

export type LandscapePin = {
  slug: string;
  name: string;
  district: string;
  stateCode: string;
  latitude: number;
  longitude: number;
  lipStatus: "published" | "in_preparation";
};

type Props = {
  pins: LandscapePin[];
  className?: string;
};

type StateFeature = GeoJSON.Feature<
  GeoJSON.Geometry,
  { ST_NM?: string; STNAME?: string; NAME_1?: string }
>;

/**
 * A focused India map showing ONLY CAT's 11 focus landscapes as periwinkle
 * pins. Visually distinct from the Solutions Atlas (which uses teal/amber for
 * programme dots) so a reader always knows which lane they are in.
 */
export function CatLandscapesMap({ pins, className }: Props) {
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

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

  const { paths, projectPoint } = useMemo(() => {
    if (!geojson) return { paths: [] as { name: string; d: string }[], projectPoint: null };
    const projection = makeIndiaProjection(geojson);
    const pathGen = geoPath(projection);
    const paths = (geojson.features as StateFeature[]).map((f) => {
      const props = f.properties || {};
      const name = props.ST_NM || props.STNAME || props.NAME_1 || "";
      return { name, d: pathGen(f) || "" };
    });
    return { paths, projectPoint: (lon: number, lat: number) => projection([lon, lat]) };
  }, [geojson]);

  return (
    <div
      className={`relative border border-line rounded-[10px] aspect-[5/6] sm:aspect-[5/4] lg:aspect-[5/3] overflow-hidden ${className ?? ""}`}
      style={{
        background:
          "radial-gradient(ellipse 70% 60% at 50% 5%, rgba(208,218,239,0.55), transparent 70%), linear-gradient(180deg, rgba(251,248,242,1) 0%, rgba(244,237,221,0.85) 100%)",
        boxShadow: "0 1px 2px rgba(26,38,37,0.04), 0 12px 32px -16px rgba(146,156,197,0.30)",
      }}
    >
      <div className="absolute inset-3 border border-dashed border-line pointer-events-none rounded-[6px]" />

      <div
        className="absolute top-4 right-4 z-10 text-cream px-3.5 py-2.5 rounded-[8px] font-mono text-[10px] uppercase tracking-[0.14em] flex items-center gap-2 border border-paper/10"
        style={{
          background: "linear-gradient(135deg, #334B4A 0%, #2E7573 60%, #334B4A 100%)",
          boxShadow:
            "0 10px 28px -12px rgba(26,38,37,0.45), 0 2px 6px rgba(26,38,37,0.18), inset 0 1px 0 rgba(255,255,255,0.10)",
        }}
      >
        <span className="text-amber font-semibold text-[12px] tabular-nums">11</span>
        <span>landscapes</span>
      </div>

      <div
        className="absolute bottom-4 left-4 z-10 px-3.5 py-3 flex flex-col gap-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft rounded-[8px] backdrop-blur-md border border-line/80"
        style={{
          background: "rgba(251,248,242,0.92)",
          boxShadow: "0 6px 16px -10px rgba(26,38,37,0.20), 0 1px 2px rgba(26,38,37,0.04)",
        }}
      >
        <div className="flex gap-2 items-center">
          <span className="w-2.5 h-2.5 rounded-full bg-periwinkle shadow-[0_0_0_3px_rgba(146,156,197,0.25)]" />
          CAT focus landscape
        </div>
        <div className="flex gap-2 items-center">
          <span className="w-2.5 h-2.5 rounded-full border-2 border-amber-deep" />
          Investment plan published
        </div>
      </div>

      <svg
        viewBox={`0 0 ${PROJECTION_VIEWBOX.width} ${PROJECTION_VIEWBOX.height}`}
        className="w-full h-full block"
        role="img"
        aria-label="Map of India showing CAT's eleven focus landscapes"
      >
        <ellipse
          cx={PROJECTION_VIEWBOX.width / 2}
          cy={PROJECTION_VIEWBOX.height - 35}
          rx={140}
          ry={6}
          fill="rgba(44,69,68,0.10)"
        />

        {paths.length === 0 ? (
          <text
            x={PROJECTION_VIEWBOX.width / 2}
            y={PROJECTION_VIEWBOX.height / 2}
            textAnchor="middle"
            className="font-mono fill-muted"
            fontSize="9"
            letterSpacing="0.16em"
          >
            LOADING INDIA BASEMAP…
          </text>
        ) : (
          <g className="map-country">
            {paths.map((p, i) => (
              <path
                key={p.name + i}
                d={p.d}
                fill="rgba(146,156,197,0.06)"
                stroke="rgba(46,117,115,0.25)"
                strokeWidth="0.6"
              />
            ))}
          </g>
        )}

        {projectPoint &&
          pins.map((pin, idx) => {
            const pt = projectPoint(pin.longitude, pin.latitude);
            if (!pt) return null;
            const [x, y] = pt;
            const isHovered = hovered === pin.slug;
            const isPublished = pin.lipStatus === "published";
            return (
              <g
                key={pin.slug}
                onMouseEnter={() => setHovered(pin.slug)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => {
                  window.location.href = `/landscape/${pin.slug}`;
                }}
                className="cursor-pointer dot-group"
                style={{ color: "var(--periwinkle)" }}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 14 : 12}
                  className="dot-halo"
                  fill="var(--periwinkle)"
                  opacity={isHovered ? 0.40 : 0.24}
                  style={{ animationDelay: `${(idx % 11) * 0.32}s` }}
                />
                <circle
                  cx={x}
                  cy={y}
                  r={4.5}
                  className="dot-core"
                  fill="var(--periwinkle)"
                  stroke={isPublished ? "var(--amber-deep)" : "var(--paper)"}
                  strokeWidth={isPublished ? 1.8 : 1.5}
                />
                {isHovered && (
                  <g style={{ filter: "drop-shadow(0 4px 10px rgba(26,38,37,0.35))" }}>
                    <rect
                      x={x + 8}
                      y={y - 16}
                      width={pin.name.length * 6 + 16}
                      height={22}
                      rx={5}
                      fill="var(--deep-teal)"
                      stroke="rgba(251,248,242,0.08)"
                    />
                    <text
                      x={x + 16}
                      y={y - 2}
                      className="fill-paper font-sans"
                      fontSize="10.5"
                      fontStyle="italic"
                    >
                      {pin.name}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
      </svg>
    </div>
  );
}
