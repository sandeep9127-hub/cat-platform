"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { geoPath } from "d3-geo";
import {
  makeIndiaProjection,
  PROJECTION_VIEWBOX,
  scaleCoreRadius,
  scaleHaloRadius,
} from "./projection";

export type MapEntry = {
  id: string;
  slug: string;
  title: string;
  scaleBand: string;
  provenance: "sourced" | "self_submitted";
  stateCode: string;
  latitude: number | null;
  longitude: number | null;
  /**
   * Optional internal route to navigate to instead of `/entry/{slug}`.
   * Atlas-routed records use `/atlas/{id}` (their Hub description page).
   */
  internalHref?: string;
  /**
   * Legacy: external URL to open in a new tab. Honored only when no
   * internalHref is provided.
   */
  externalUrl?: string;
};

type Props = {
  entries: MapEntry[];
  totalProgrammes?: number;
  totalStates?: number;
  /** Called when the user filters by a state code; null clears filter. */
  onFilterState?: (stateCode: string | null) => void;
  /** External source of truth for the active state (overrides internal lock). */
  activeState?: string | null;
  className?: string;
};

type StateFeature = GeoJSON.Feature<GeoJSON.Geometry, { st_code?: string; ST_NM?: string; STNAME?: string; NAME_1?: string }>;

export function IndiaMap({ entries, totalProgrammes, totalStates, onFilterState, activeState: externalActive, className }: Props) {
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [lockedState, setLockedState] = useState<string | null>(null);

  // External clear (e.g., from the AtlasSection chip) wins over internal lock.
  useEffect(() => {
    if (externalActive === null && lockedState) setLockedState(null);
  }, [externalActive, lockedState]);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; entry: MapEntry } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

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
    if (!geojson) return { paths: [] as { code: string; name: string; d: string }[], projectPoint: null };
    const projection = makeIndiaProjection(geojson);
    const pathGen = geoPath(projection);
    const paths = (geojson.features as StateFeature[]).map((f) => {
      const props = f.properties || {};
      const code = (props.st_code as string) || inferStateCode(props.ST_NM || props.STNAME || props.NAME_1 || "");
      const name = props.ST_NM || props.STNAME || props.NAME_1 || code;
      const d = pathGen(f) || "";
      return { code, name, d };
    });
    return { paths, projectPoint: (lon: number, lat: number) => projection([lon, lat]) };
  }, [geojson]);

  const activeState = externalActive ?? lockedState ?? hoveredState;

  const visibleEntries = activeState
    ? entries.filter((e) => e.stateCode === activeState)
    : entries;

  const handleStateEnter = (code: string) => {
    if (lockedState) return;
    setHoveredState(code);
    onFilterState?.(code);
  };
  const handleStateLeave = () => {
    if (lockedState) return;
    setHoveredState(null);
    onFilterState?.(null);
  };
  const handleStateClick = (code: string) => {
    if (lockedState === code) {
      setLockedState(null);
      onFilterState?.(null);
    } else {
      setLockedState(code);
      onFilterState?.(code);
    }
  };

  const handleDotEnter = (e: React.MouseEvent, entry: MapEntry) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ x: e.clientX - rect.left + 14, y: e.clientY - rect.top + 12, entry });
  };

  return (
    <div
      ref={wrapRef}
      className={`relative border border-line p-3 sm:p-5 lg:p-6 aspect-[4/5] rounded-[10px] overflow-hidden ${className ?? ""}`}
      style={{
        background:
          "radial-gradient(ellipse 70% 55% at 50% 10%, rgba(232,242,235,0.65), transparent 70%), linear-gradient(180deg, rgba(248,243,232,1) 0%, rgba(244,237,221,0.85) 100%)",
        boxShadow: "0 1px 2px rgba(26,38,37,0.04), 0 12px 32px -16px rgba(46,117,115,0.20)",
      }}
    >
      <div className="absolute inset-2 sm:inset-3 lg:inset-3.5 border border-dashed border-line pointer-events-none rounded-[6px]" />

      {/* Counter */}
      <div
        className="absolute top-4 right-4 sm:top-6 sm:right-6 lg:top-8 lg:right-8 z-10 px-3 py-2 sm:px-4 sm:py-2.5 rounded-[8px] font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.14em] flex items-center gap-2 max-w-[calc(100%-2rem)] text-cream border border-paper/10"
        style={{
          background: "linear-gradient(135deg, #334B4A 0%, #2E7573 60%, #334B4A 100%)",
          boxShadow:
            "0 10px 28px -12px rgba(26,38,37,0.45), 0 2px 6px rgba(26,38,37,0.18), inset 0 1px 0 rgba(255,255,255,0.10)",
        }}
      >
        <span className="text-amber text-[12px] sm:text-[13px] font-semibold tracking-[0.06em] tabular-nums">
          {visibleEntries.length}
        </span>
        <span>programmes</span>
        <span className="text-teal-soft hidden sm:inline">·</span>
        <span className="text-amber text-[12px] sm:text-[13px] font-semibold tracking-[0.06em] hidden sm:inline tabular-nums">
          {totalStates ?? new Set(entries.map((e) => e.stateCode)).size}
        </span>
        <span className="hidden sm:inline">states</span>
        <span className="text-teal-soft hidden lg:inline">·</span>
        <span className="hidden lg:inline">2026</span>
      </div>

      {/* Filter chip */}
      {activeState && (
        <div
          className="absolute top-4 left-4 sm:top-6 sm:left-6 lg:top-8 lg:left-8 z-10 px-3 py-2 rounded-[8px] font-mono text-[10px] uppercase tracking-[0.14em] font-semibold flex items-center gap-2 text-deep-teal"
          style={{
            background: "linear-gradient(135deg, rgba(248,202,124,0.95), rgba(248,202,124,0.75))",
            boxShadow:
              "0 8px 22px -10px rgba(198,140,46,0.55), 0 2px 4px rgba(198,140,46,0.20), inset 0 1px 0 rgba(255,255,255,0.30)",
          }}
        >
          Filter: <span>{stateNameFor(activeState)}</span>
          <button
            onClick={() => {
              setLockedState(null);
              setHoveredState(null);
              onFilterState?.(null);
            }}
            className="bg-transparent border-0 cursor-pointer text-inherit pl-1.5 ml-1 border-l border-deep-teal/40 hover:text-deep-teal/70 transition-colors"
            aria-label="Clear filter"
          >
            CLEAR ×
          </button>
        </div>
      )}

      {/* Legend */}
      <div
        className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 lg:bottom-8 lg:left-8 z-10 px-3.5 py-3 flex flex-col gap-2 font-mono text-[9px] sm:text-[9.5px] uppercase tracking-[0.14em] text-ink-soft rounded-[8px] backdrop-blur-md border border-line/80"
        style={{
          background: "rgba(251,248,242,0.92)",
          boxShadow: "0 6px 16px -10px rgba(26,38,37,0.20), 0 1px 2px rgba(26,38,37,0.04)",
        }}
      >
        <div className="flex gap-2 items-center">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-deep shadow-[0_0_0_3px_rgba(217,166,85,0.22)]" />
          Solution
        </div>
      </div>

      {/* SVG */}
      <svg
        viewBox={`0 0 ${PROJECTION_VIEWBOX.width} ${PROJECTION_VIEWBOX.height}`}
        className="w-full h-full block"
        role="img"
        aria-label="Map of India showing food systems programmes by state"
      >
        <ellipse
          cx={PROJECTION_VIEWBOX.width / 2}
          cy={PROJECTION_VIEWBOX.height - 35}
          rx={140}
          ry={6}
          fill="rgba(44,69,68,0.12)"
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
            <tspan x={PROJECTION_VIEWBOX.width / 2} dy="0">RUN `NPM RUN GEO:DOWNLOAD`</tspan>
            <tspan x={PROJECTION_VIEWBOX.width / 2} dy="14">TO LOAD THE INDIA BASEMAP</tspan>
          </text>
        ) : (
          <g className="map-country">
            {paths.map((p) => (
              <path
                key={p.code + p.name}
                d={p.d}
                className={`map-state ${activeState === p.code ? "active" : ""}`}
                data-code={p.code}
                onMouseEnter={() => handleStateEnter(p.code)}
                onMouseLeave={handleStateLeave}
                onClick={() => handleStateClick(p.code)}
              >
                <title>{p.name}</title>
              </path>
            ))}
          </g>
        )}

        {projectPoint && (
          <g>
            {entries.map((entry, idx) => {
              if (entry.latitude == null || entry.longitude == null) return null;
              const pt = projectPoint(entry.longitude, entry.latitude);
              if (!pt) return null;
              const [x, y] = pt;
              const isAmber = entry.provenance === "sourced";
              const halo = scaleHaloRadius(entry.scaleBand);
              const core = scaleCoreRadius(entry.scaleBand);
              const dim = activeState && entry.stateCode !== activeState;
              // Stagger halo pulse so pins breathe in a wave, not unison.
              const haloDelay = `${(idx % 8) * 0.45}s`;
              return (
                <g
                  key={entry.id}
                  opacity={dim ? 0.18 : 1}
                  onMouseMove={(e) => handleDotEnter(e, entry)}
                  onMouseLeave={() => setTooltip(null)}
                  onClick={() => {
                    // Priority: internal Hub page (atlas record description or
                    // full entry) > legacy external URL > default entry slug.
                    if (entry.internalHref) {
                      window.location.href = entry.internalHref;
                    } else if (entry.externalUrl) {
                      window.open(entry.externalUrl, "_blank", "noopener,noreferrer");
                    } else {
                      window.location.href = `/entry/${entry.slug}`;
                    }
                  }}
                  className="cursor-pointer dot-group"
                  style={{ color: isAmber ? "var(--amber-deep)" : "var(--teal)" }}
                >
                  <circle
                    cx={x}
                    cy={y}
                    r={halo}
                    className="dot-halo"
                    fill={isAmber ? "var(--amber-deep)" : "var(--teal)"}
                    opacity={isAmber ? 0.18 : 0.15}
                    style={{ animationDelay: haloDelay }}
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r={core}
                    className="dot-core"
                    fill={isAmber ? "var(--amber-deep)" : "var(--teal)"}
                  />
                </g>
              );
            })}
          </g>
        )}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-20 pointer-events-none text-cream px-3.5 py-3 min-w-[200px] rounded-[8px] border border-paper/10"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            background: "linear-gradient(135deg, #334B4A 0%, #2E7573 100%)",
            boxShadow:
              "0 12px 32px -12px rgba(26,38,37,0.55), 0 4px 10px rgba(26,38,37,0.20), inset 0 1px 0 rgba(255,255,255,0.10)",
          }}
        >
          <div className="font-sans text-[13.5px] font-medium text-paper leading-snug">
            {tooltip.entry.title}
          </div>
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-amber mt-2 flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-px bg-amber/70" />
            {stateNameFor(tooltip.entry.stateCode)} · {humaniseScale(tooltip.entry.scaleBand)}
          </div>
        </div>
      )}
    </div>
  );
}

function stateNameFor(code: string): string {
  return STATE_NAMES[code] ?? code;
}

function humaniseScale(s: string): string {
  return s.replace(/_/g, "-");
}

/* Standard state code → display name. Used for filter chip and tooltip text. */
const STATE_NAMES: Record<string, string> = {
  AP: "Andhra Pradesh",
  AR: "Arunachal Pradesh",
  AS: "Assam",
  BR: "Bihar",
  CG: "Chhattisgarh",
  CH: "Chandigarh",
  DL: "Delhi",
  DN: "Dadra & Nagar Haveli",
  GA: "Goa",
  GJ: "Gujarat",
  HR: "Haryana",
  HP: "Himachal Pradesh",
  JK: "Jammu & Kashmir",
  JH: "Jharkhand",
  KA: "Karnataka",
  KL: "Kerala",
  LA: "Ladakh",
  LD: "Lakshadweep",
  MP: "Madhya Pradesh",
  MH: "Maharashtra",
  MN: "Manipur",
  ML: "Meghalaya",
  MZ: "Mizoram",
  NL: "Nagaland",
  OD: "Odisha",
  PB: "Punjab",
  PY: "Puducherry",
  RJ: "Rajasthan",
  SK: "Sikkim",
  TN: "Tamil Nadu",
  TG: "Telangana",
  TR: "Tripura",
  UP: "Uttar Pradesh",
  UK: "Uttarakhand",
  WB: "West Bengal",
  AN: "Andaman & Nicobar",
};

/* Best-effort code inference when GeoJSON uses full state names. */
function inferStateCode(name: string): string {
  const normalized = name.trim().toLowerCase();
  for (const [code, n] of Object.entries(STATE_NAMES)) {
    if (n.toLowerCase() === normalized) return code;
  }
  return name.slice(0, 2).toUpperCase();
}
