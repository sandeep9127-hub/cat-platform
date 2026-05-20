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
      className={`relative bg-paper border border-line rounded-[2px] aspect-[5/6] sm:aspect-[5/4] lg:aspect-[5/3] overflow-hidden ${className ?? ""}`}
    >
      <div className="absolute inset-3 border border-dashed border-line pointer-events-none" />

      <div className="absolute top-4 right-4 z-10 bg-deep-teal text-cream px-3 py-2 rounded-[2px] font-mono text-[10px] uppercase tracking-[0.14em] flex items-center gap-2 shadow-[0_4px_14px_-8px_rgba(0,0,0,0.4)]">
        <span className="text-amber font-semibold text-[12px]">11</span>
        <span>landscapes</span>
      </div>

      <div className="absolute bottom-4 left-4 z-10 bg-paper/90 backdrop-blur-[4px] border border-line px-3 py-2 flex flex-col gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">
        <div className="flex gap-2 items-center">
          <span className="w-2.5 h-2.5 rounded-full bg-periwinkle shadow-[0_0_0_3px_rgba(146,156,197,0.25)]" />
          CAT focus landscape
        </div>
        <div className="flex gap-2 items-center">
          <span className="w-2.5 h-2.5 rounded-full border-2 border-amber-deep" />
          LIP published
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
          paths.map((p, i) => (
            <path
              key={p.name + i}
              d={p.d}
              fill="rgba(146,156,197,0.06)"
              stroke="rgba(46,117,115,0.25)"
              strokeWidth="0.6"
            />
          ))
        )}

        {projectPoint &&
          pins.map((pin) => {
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
                className="cursor-pointer"
              >
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 13 : 11}
                  fill="var(--periwinkle)"
                  opacity={isHovered ? 0.35 : 0.22}
                  className="transition-all duration-200"
                />
                <circle
                  cx={x}
                  cy={y}
                  r={4.5}
                  fill="var(--periwinkle)"
                  stroke={isPublished ? "var(--amber-deep)" : "var(--paper)"}
                  strokeWidth={isPublished ? 1.5 : 1.5}
                />
                {isHovered && (
                  <g>
                    <rect
                      x={x + 8}
                      y={y - 14}
                      width={pin.name.length * 6 + 14}
                      height={20}
                      rx={2}
                      fill="var(--deep-teal)"
                    />
                    <text
                      x={x + 15}
                      y={y - 1}
                      className="fill-paper font-serif"
                      fontSize="10"
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
