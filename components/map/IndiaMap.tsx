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
      className={`relative bg-cream border border-line p-3 sm:p-5 lg:p-6 aspect-[4/5] rounded-[2px] ${className ?? ""}`}
    >
      <div className="absolute inset-2 sm:inset-3 lg:inset-3.5 border border-dashed border-line pointer-events-none" />

      {/* Counter */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 lg:top-8 lg:right-8 z-10 bg-deep-teal text-cream px-2.5 py-2 sm:px-3.5 sm:py-2.5 rounded-[2px] font-mono text-[9px] sm:text-[10px] uppercase tracking-mono-mid flex items-center gap-1.5 sm:gap-2 shadow-[0_4px_14px_-8px_rgba(0,0,0,0.4)] max-w-[calc(100%-2rem)]">
        <span className="text-amber text-[12px] sm:text-[13px] font-semibold tracking-[0.06em]">
          {visibleEntries.length}
        </span>
        <span>programmes</span>
        <span className="text-teal-soft hidden sm:inline">·</span>
        <span className="text-amber text-[12px] sm:text-[13px] font-semibold tracking-[0.06em] hidden sm:inline">
          {totalStates ?? new Set(entries.map((e) => e.stateCode)).size}
        </span>
        <span className="hidden sm:inline">states</span>
        <span className="text-teal-soft hidden lg:inline">·</span>
        <span className="hidden lg:inline">2026</span>
      </div>

      {/* Filter chip */}
      {activeState && (
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 lg:top-8 lg:left-8 z-10 bg-amber text-deep-teal px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-[2px] font-mono text-[9px] sm:text-[10px] uppercase tracking-mono-mid font-semibold flex items-center gap-2">
          Filter: <span>{stateNameFor(activeState)}</span>
          <button
            onClick={() => {
              setLockedState(null);
              setHoveredState(null);
              onFilterState?.(null);
            }}
            className="bg-transparent border-0 cursor-pointer text-inherit pl-1 ml-1 border-l border-deep-teal/30"
            aria-label="Clear filter"
          >
            CLEAR ×
          </button>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 lg:bottom-8 lg:left-8 z-10 bg-paper/90 backdrop-blur-[4px] border border-line px-2.5 py-2 sm:px-3.5 sm:py-3 flex flex-col gap-1.5 font-mono text-[9px] sm:text-[9.5px] uppercase tracking-mono-mid text-ink-soft">
        <div className="flex gap-2 items-center">
          <span className="w-2.5 h-2.5 rounded-full bg-teal shadow-[0_0_0_3px_rgba(46,117,115,0.18)]" />
          Self-submitted
        </div>
        <div className="flex gap-2 items-center">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-deep shadow-[0_0_0_3px_rgba(217,166,85,0.22)]" />
          CAT-sourced
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
          <g>
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
            {entries.map((entry) => {
              if (entry.latitude == null || entry.longitude == null) return null;
              const pt = projectPoint(entry.longitude, entry.latitude);
              if (!pt) return null;
              const [x, y] = pt;
              const isAmber = entry.provenance === "sourced";
              const halo = scaleHaloRadius(entry.scaleBand);
              const core = scaleCoreRadius(entry.scaleBand);
              const dim = activeState && entry.stateCode !== activeState;
              return (
                <g
                  key={entry.id}
                  opacity={dim ? 0.18 : 1}
                  onMouseMove={(e) => handleDotEnter(e, entry)}
                  onMouseLeave={() => setTooltip(null)}
                  onClick={() => {
                    window.location.href = `/entry/${entry.slug}`;
                  }}
                  className="cursor-pointer"
                >
                  <circle
                    cx={x}
                    cy={y}
                    r={halo}
                    fill={isAmber ? "var(--amber-deep)" : "var(--teal)"}
                    opacity={isAmber ? 0.18 : 0.15}
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
          className="absolute z-20 pointer-events-none bg-deep-teal text-cream px-3 py-2.5 min-w-[180px] rounded-[2px] shadow-[0_8px_24px_-10px_rgba(0,0,0,0.4)]"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="font-serif text-[13.5px] font-medium text-paper">{tooltip.entry.title}</div>
          <div className="font-mono text-[9px] uppercase tracking-mono-mid text-amber mt-1">
            {stateNameFor(tooltip.entry.stateCode)} · {humaniseScale(tooltip.entry.scaleBand)} ·{" "}
            {tooltip.entry.provenance === "sourced" ? "CAT-sourced" : "Self-submitted"}
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
