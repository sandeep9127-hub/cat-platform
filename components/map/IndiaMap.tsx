"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { geoPath } from "d3-geo";
import { CATEGORIES } from "@/lib/data/categories";
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
  /** Intervention-theme slugs (from CATEGORIES) this solution is tagged with.
   *  Drives the phased theme reveal. */
  themes?: string[];
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
  /** Hero mode: drop the card chrome so the map sits directly on the page. */
  bare?: boolean;
  /** Run an auto-advancing theme tour: each phase lights the states whose
   *  solutions are tagged with that theme. Pauses on hover; off for reduced
   *  motion. */
  phased?: boolean;
};

type StateFeature = GeoJSON.Feature<GeoJSON.Geometry, { st_code?: string; ST_NM?: string; STNAME?: string; NAME_1?: string }>;

// Each category lights the map in a colour drawn from the official CAT palette
// (teals + periwinkles, with the three warm accents for a few) — never the
// off-brand rainbow. Keeps the phased hero reveal within brand.
const THEME_PALETTE: Record<string, string> = {
  // Cool family (teals + periwinkles) for the prominent themes; a hint of the
  // warm accents (rose / coral) for two small themes so the tour gets a touch
  // of warmth without the off-brand gold. All from the CAT palette.
  "agri-horti-agroforestry": "#2E7573", // teal (primary)
  "technical-assistance": "#5E6990", // deep periwinkle
  market: "#929CC5", // periwinkle
  biodiversity: "#334B4A", // deep teal
  nrm: "#95B1AF", // sage teal
  nutrition: "#F8A07B", // coral (warm hint)
  livestock: "#C68F95", // dusty rose (warm hint)
  "forestry-ntfp": "#AFBADC", // soft periwinkle
  fisheries: "#5E6990", // deep periwinkle (reused; single-state)
  energy: "#B8CCCA", // pale teal (kept cool — no gold)
};

/** #RRGGBB → rgba() at the given alpha, for translucent state fills. */
function hexRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function IndiaMap({ entries, totalProgrammes, totalStates, onFilterState, activeState: externalActive, className, bare = false, phased = false }: Props) {
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [lockedState, setLockedState] = useState<string | null>(null);
  const [reduce, setReduce] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [dotPaused, setDotPaused] = useState(false);
  const [tourStarted, setTourStarted] = useState(false);

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

  // ── Phased theme tour ────────────────────────────────────────────────────
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMq = () => setReduce(mq.matches);
    onMq();
    mq.addEventListener("change", onMq);
    return () => mq.removeEventListener("change", onMq);
  }, []);

  // The themes that actually have mapped solutions, busiest first. Each becomes
  // one phase of the tour; the count is the number of pins that light up.
  const phaseThemes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entries) for (const t of e.themes ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
    return CATEGORIES.filter((c) => (counts.get(c.slug) ?? 0) > 0)
      .map((c) => ({
        slug: c.slug,
        short: c.short,
        color: THEME_PALETTE[c.slug] ?? "#2E7573",
        count: counts.get(c.slug) ?? 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [entries]);

  // Let every pin land first (entrance pop), then begin the tour.
  useEffect(() => {
    if (!phased || reduce || phaseThemes.length === 0) return;
    const id = setTimeout(() => setTourStarted(true), 1400);
    return () => clearTimeout(id);
  }, [phased, reduce, phaseThemes.length]);

  // Pause while the user is engaging the map (hovering a state or a dot).
  const tourRunning =
    phased && !reduce && tourStarted && phaseThemes.length > 1 && !activeState && !dotPaused;
  useEffect(() => {
    if (!tourRunning) return;
    const id = setInterval(() => setPhaseIdx((i) => (i + 1) % phaseThemes.length), 2800);
    return () => clearInterval(id);
  }, [tourRunning, phaseThemes.length]);
  useEffect(() => {
    if (phaseIdx >= phaseThemes.length && phaseThemes.length > 0) setPhaseIdx(0);
  }, [phaseThemes.length, phaseIdx]);

  // Theme highlight is active only when the tour has started and the user isn't
  // manually filtering by state.
  const themeMode = phased && !reduce && tourStarted && phaseThemes.length > 0 && !activeState;
  const activeTheme = themeMode ? phaseThemes[Math.min(phaseIdx, phaseThemes.length - 1)] : null;
  const themeStates = useMemo(() => {
    if (!activeTheme) return null;
    const s = new Set<string>();
    for (const e of entries) if ((e.themes ?? []).includes(activeTheme.slug) && e.stateCode) s.add(e.stateCode);
    return s;
  }, [activeTheme, entries]);

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
      className={
        (bare
          ? "map-bare relative p-0 aspect-[4/5] overflow-visible"
          : "relative border border-line p-3 sm:p-5 lg:p-6 aspect-[4/5] rounded-[10px] overflow-hidden") +
        ` ${className ?? ""}`
      }
      style={
        bare
          ? undefined
          : {
              background:
                "radial-gradient(ellipse 70% 55% at 50% 10%, rgba(232,242,235,0.65), transparent 70%), linear-gradient(180deg, rgba(248,243,232,1) 0%, rgba(244,237,221,0.85) 100%)",
              boxShadow: "0 1px 2px rgba(26,38,37,0.04), 0 12px 32px -16px rgba(46,117,115,0.20)",
            }
      }
    >
      {!bare && (
        <div className="absolute inset-2 sm:inset-3 lg:inset-3.5 border border-dashed border-line pointer-events-none rounded-[6px]" />
      )}

      {/* Counter */}
      {!bare && (
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
      )}

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
      {!bare && (
      <div
        className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 lg:bottom-8 lg:left-8 z-10 px-3.5 py-3 flex flex-col gap-2 font-mono text-[9px] sm:text-[9.5px] uppercase tracking-[0.14em] text-ink-soft rounded-[8px] backdrop-blur-md border border-line/80"
        style={{
          background: "rgba(251,248,242,0.92)",
          boxShadow: "0 6px 16px -10px rgba(26,38,37,0.20), 0 1px 2px rgba(26,38,37,0.04)",
        }}
      >
        <div className="flex gap-2 items-center">
          <span className="w-2.5 h-2.5 rounded-full shadow-[0_0_0_3px_rgba(94,103,144,0.22)]" style={{ background: "#5e6990" }} />
          Solution
        </div>
      </div>
      )}

      {/* Phased theme tour caption — names the theme lighting up, with its live
          count and a progress bar across the themes. Hidden while filtering. */}
      {activeTheme && (
        <div className="absolute left-3 bottom-3 sm:left-4 sm:bottom-4 z-10 flex flex-col gap-2 pointer-events-none select-none max-w-[calc(100%-2rem)]">
          <div
            key={activeTheme.slug}
            className="inline-flex items-center gap-2.5 px-3 py-2 rounded-[10px] backdrop-blur-md border border-line/70 animate-scope-pop w-fit"
            style={{
              background: "rgba(251,248,242,0.92)",
              boxShadow: "0 8px 22px -12px rgba(26,38,37,0.30), 0 1px 2px rgba(26,38,37,0.04)",
            }}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: activeTheme.color, boxShadow: `0 0 0 3px ${activeTheme.color}33` }}
            />
            <span className="font-sans text-[13px] sm:text-[13.5px] font-medium text-ink leading-none whitespace-nowrap">
              {activeTheme.short}
            </span>
            <span className="font-mono text-[11px] tabular-nums text-muted leading-none">
              {activeTheme.count}
            </span>
          </div>
          <div className="flex gap-1 pl-0.5">
            {phaseThemes.map((t, i) => (
              <span
                key={t.slug}
                className="h-[3px] rounded-full transition-all duration-500 ease-out"
                style={{
                  width: i === phaseIdx ? 16 : 7,
                  background: i === phaseIdx ? activeTheme.color : "rgba(26,38,37,0.16)",
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* SVG */}
      <svg
        viewBox={`0 0 ${PROJECTION_VIEWBOX.width} ${PROJECTION_VIEWBOX.height}`}
        className="w-full h-full block"
        role="img"
        aria-label="Map of India showing food systems programmes by state"
      >
        {/* Ground-shadow ellipse: gives the card map a sense of lift. On the
            bare hero map it reads as a floating grey bulb, so omit it there. */}
        {!bare && (
          <ellipse
            cx={PROJECTION_VIEWBOX.width / 2}
            cy={PROJECTION_VIEWBOX.height - 35}
            rx={140}
            ry={6}
            fill="rgba(44,69,68,0.12)"
          />
        )}

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
            {paths.map((p) => {
              const hoverActive = !!activeState && activeState === p.code;
              const themeLit = !activeState && !!themeStates?.has(p.code) && !!activeTheme;
              return (
              <path
                key={p.code + p.name}
                d={p.d}
                // Hover/lock → teal .active (CSS). Theme tour → the category's
                // palette colour, applied inline so it overrides the CSS.
                className={`map-state ${hoverActive ? "active" : ""}`}
                style={
                  themeLit && activeTheme
                    ? { fill: hexRgba(activeTheme.color, 0.5), stroke: activeTheme.color, strokeWidth: 1.2 }
                    : undefined
                }
                data-code={p.code}
                onMouseEnter={() => handleStateEnter(p.code)}
                onMouseLeave={handleStateLeave}
                onClick={() => handleStateClick(p.code)}
              >
                <title>{p.name}</title>
              </path>
              );
            })}
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
              // Dim if filtered out by an active state, or — during the theme
              // tour — if this solution isn't tagged with the current theme.
              const dim = activeState
                ? entry.stateCode !== activeState
                : themeMode && activeTheme
                  ? !(entry.themes ?? []).includes(activeTheme.slug)
                  : false;
              // Two independent staggers: a quick entrance wave (pins drop in),
              // and a slower travelling breathe wave once they have landed.
              const popDelay = `${(idx % 12) * 0.035}s`;
              const haloDelay = `${0.4 + (idx % 7) * 0.3}s`;
              return (
                <g
                  key={entry.id}
                  onMouseEnter={() => setDotPaused(true)}
                  onMouseMove={(e) => handleDotEnter(e, entry)}
                  onMouseLeave={() => {
                    setTooltip(null);
                    setDotPaused(false);
                  }}
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
                  style={
                    {
                      color: isAmber ? "#5e6990" : "var(--teal)",
                      opacity: dim ? 0.12 : 1,
                      transition: "opacity 0.6s ease",
                      "--pop-delay": popDelay,
                      "--halo-delay": haloDelay,
                    } as React.CSSProperties
                  }
                >
                  <circle
                    cx={x}
                    cy={y}
                    r={halo}
                    className="dot-halo"
                    fill={isAmber ? "#5e6990" : "var(--teal)"}
                    opacity={isAmber ? 0.18 : 0.15}
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r={core}
                    className="dot-core"
                    fill={isAmber ? "#5e6990" : "var(--teal)"}
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
          className="absolute z-20 pointer-events-none text-cream px-3.5 py-3 min-w-[200px] rounded-[8px] border border-paper/10 animate-scope-pop"
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
