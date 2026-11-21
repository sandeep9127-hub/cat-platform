"use client";

import { RaisedCount } from "@/components/ui/RaisedCount";
import { palette } from "@/lib/design/palette";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoPath } from "d3-geo";
import { CATEGORIES, CATEGORY_BY_SLUG } from "@/lib/data/categories";
import { makeIndiaProjection, PROJECTION_VIEWBOX } from "./projection";

export type MapPoint = { lat: number; lon: number };

export type MapEntry = {
  id: string;
  slug: string;
  title: string;
  scaleBand: string;
  provenance: "sourced" | "self_submitted";
  stateCode: string;
  latitude: number | null;
  longitude: number | null;
  /** Internal route to open (fact sheet). */
  internalHref?: string;
  /** Legacy: external URL, honoured only when no internalHref. */
  externalUrl?: string;
  /** Intervention-category slugs (CATEGORIES); the first sets the dot colour. */
  themes?: string[];
  /** Placement precision from the data layer (see components/map/mapEntries.ts). */
  geoPrecision?: "district" | "state" | "national";
  /** Several places for multi-district programmes; falls back to latitude/longitude. */
  points?: MapPoint[];
  /** Households reached; scales the dot cloud. */
  reach?: number | null;
};

type Props = {
  entries: MapEntry[];
  /** National / multi-state programmes with no single place: listed in a strip under the map. */
  nationwide?: MapEntry[];
  totalProgrammes?: number;
  totalStates?: number;
  /** Called when the user filters by a state code; null clears filter. */
  onFilterState?: (stateCode: string | null) => void;
  /** External source of truth for the active state (overrides internal lock). */
  activeState?: string | null;
  className?: string;
  /** Hero mode: drop the card chrome so the map sits directly on the page. */
  bare?: boolean;
  /** Run an auto-advancing theme tour (lights the states per theme). Off for reduced motion. */
  phased?: boolean;
};

type StateFeature = GeoJSON.Feature<GeoJSON.Geometry, { st_code?: string; ST_NM?: string; STNAME?: string; NAME_1?: string }>;

/**
 * One palette token per intervention category, used for the dot clouds, the
 * cluster rings and the theme tour. Ten categories, ten tokens; no off-palette hex.
 */
const CATEGORY_COLOUR: Record<string, string> = {
  "agri-horti-agroforestry": palette.teal,
  "forestry-ntfp": palette.leaf,
  livestock: palette.ochre,
  fisheries: palette.periwinkle,
  nrm: palette.deepTeal,
  biodiversity: palette.tealSoft,
  nutrition: palette.redAlert,
  market: palette.periwinkleDeep,
  energy: palette.amberDeep,
  "technical-assistance": palette.periwinkleText,
};
// Theme slugs come from compiled data: look up own keys only, so a slug like
// "constructor" can never pull a prototype value into the canvas code.
const own = <T,>(o: Record<string, T>, k: string | undefined): T | undefined =>
  k && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined;
const colourFor = (e: MapEntry) => own(CATEGORY_COLOUR, e.themes?.[0]) ?? palette.teal;
const categoryName = (e: MapEntry) => own(CATEGORY_BY_SLUG, e.themes?.[0])?.short ?? "Programme";

/** #RRGGBB -> rgba(), for translucent fills. */
function hexRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  return `rgba(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}, ${alpha})`;
}

/** Small seeded PRNG so each programme's dot cloud is identical on every render. */
function seeded(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const VB_W = PROJECTION_VIEWBOX.width;
const VB_H = PROJECTION_VIEWBOX.height;
const MIN_K = 1;
const MAX_K = 8;
const CLUSTER_PX = 30; // programmes closer than this (on screen) merge into a chip

type View = { k: number; tx: number; ty: number };
type Placed = { entry: MapEntry; anchors: [number, number][]; dots: [number, number][]; colour: string };
type Cluster = { x: number; y: number; members: Placed[] };

function clampView(v: View): View {
  const k = Math.min(MAX_K, Math.max(MIN_K, v.k));
  return {
    k,
    tx: Math.min(0, Math.max(VB_W * (1 - k), v.tx)),
    ty: Math.min(0, Math.max(VB_H * (1 - k), v.ty)),
  };
}

export function IndiaMap({
  entries, nationwide = [], totalProgrammes, totalStates, onFilterState,
  activeState: externalActive, className, bare = false, phased = false,
}: Props) {
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [lockedState, setLockedState] = useState<string | null>(null);
  const [reduce, setReduce] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [engaged, setEngaged] = useState(false);
  const [tourStarted, setTourStarted] = useState(false);
  const [view, setView] = useState<View>({ k: 1, tx: 0, ty: 0 });
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [tip, setTip] = useState<{ x: number; y: number; members: Placed[] } | null>(null);
  // Touch has no hover, so a first tap on a single programme pins its preview
  // (with an Open link); a second tap on the same marker opens it.
  const [pinned, setPinned] = useState<string | null>(null);
  const lastPointer = useRef<string>("mouse");

  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number; view: View; moved: boolean } | null>(null);

  // External clear (e.g. from the AtlasSection chip) wins over internal lock.
  useEffect(() => {
    if (externalActive === null && lockedState) setLockedState(null);
  }, [externalActive, lockedState]);

  useEffect(() => {
    let cancelled = false;
    fetch("/geo/india-states.json")
      .then((r) => {
        if (!r.ok && process.env.NODE_ENV !== "production") {
          console.warn("India basemap missing: run `npm run geo:download`.");
        }
        return r.ok ? r.json() : null;
      })
      .then((j) => {
        if (!cancelled && j) setGeojson(j as GeoJSON.FeatureCollection);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMq = () => setReduce(mq.matches);
    onMq();
    mq.addEventListener("change", onMq);
    return () => mq.removeEventListener("change", onMq);
  }, []);

  // Track the stage size (canvas and chip positions follow it).
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setBox({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const { paths, project } = useMemo(() => {
    if (!geojson) return { paths: [] as { code: string; name: string; d: string }[], project: null };
    const projection = makeIndiaProjection(geojson);
    const pathGen = geoPath(projection);
    const paths = (geojson.features as StateFeature[]).map((f) => {
      const props = f.properties || {};
      const code = (props.st_code as string) || inferStateCode(props.ST_NM || props.STNAME || props.NAME_1 || "");
      const name = props.ST_NM || props.STNAME || props.NAME_1 || code;
      return { code, name, d: pathGen(f) || "" };
    });
    return { paths, project: (lon: number, lat: number) => projection([lon, lat]) };
  }, [geojson]);

  // Each programme: its place(s) in viewBox units and a fixed dot cloud.
  // Dot count and scatter radius grow with sqrt(reach); no reach = one small cluster.
  const placed = useMemo<Placed[]>(() => {
    if (!project) return [];
    const out: Placed[] = [];
    for (const entry of entries) {
      const pts = entry.points?.length
        ? entry.points
        : entry.latitude != null && entry.longitude != null
          ? [{ lat: entry.latitude, lon: entry.longitude }]
          : [];
      const anchors = pts.map((p) => project(p.lon, p.lat)).filter(Boolean) as [number, number][];
      if (!anchors.length) continue;
      const s = Math.sqrt(Math.max(0, entry.reach ?? 0));
      const total = entry.reach ? Math.round(Math.min(56, Math.max(10, 6 + s / 9))) : 12;
      const radius = entry.reach ? Math.min(9, Math.max(3, 1.6 + s / 70)) : 3.4;
      const rand = seeded(entry.id);
      const dots: [number, number][] = [];
      const per = Math.max(3, Math.round(total / anchors.length));
      for (const [ax, ay] of anchors) {
        const r = anchors.length > 1 ? radius * 0.7 : radius;
        for (let i = 0; i < per; i++) {
          const ang = rand() * Math.PI * 2;
          const d = r * Math.sqrt(rand());
          dots.push([ax + Math.cos(ang) * d, ay + Math.sin(ang) * d]);
        }
      }
      out.push({ entry, anchors, dots, colour: colourFor(entry) });
    }
    return out;
  }, [entries, project]);

  const activeState = externalActive ?? lockedState ?? hoveredState;
  const visibleCount = activeState ? entries.filter((e) => e.stateCode === activeState).length : entries.length;

  // ── Phased theme tour (home page) ──────────────────────────────────────
  const phaseThemes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entries) for (const t of e.themes ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
    return CATEGORIES.filter((c) => (counts.get(c.slug) ?? 0) > 0)
      .map((c) => ({ slug: c.slug, short: c.short, color: own(CATEGORY_COLOUR, c.slug) ?? palette.teal, count: counts.get(c.slug) ?? 0 }))
      .sort((a, b) => b.count - a.count);
  }, [entries]);

  useEffect(() => {
    if (!phased || reduce || phaseThemes.length === 0) return;
    const id = setTimeout(() => setTourStarted(true), 1400);
    return () => clearTimeout(id);
  }, [phased, reduce, phaseThemes.length]);

  const tourRunning = phased && !reduce && tourStarted && phaseThemes.length > 1 && !activeState && !engaged && view.k === 1;
  useEffect(() => {
    if (!tourRunning) return;
    const id = setInterval(() => setPhaseIdx((i) => (i + 1) % phaseThemes.length), 2800);
    return () => clearInterval(id);
  }, [tourRunning, phaseThemes.length]);
  useEffect(() => {
    if (phaseIdx >= phaseThemes.length && phaseThemes.length > 0) setPhaseIdx(0);
  }, [phaseThemes.length, phaseIdx]);

  const themeMode = phased && !reduce && tourStarted && phaseThemes.length > 0 && !activeState && view.k === 1;
  const activeTheme = themeMode ? phaseThemes[Math.min(phaseIdx, phaseThemes.length - 1)] : null;
  const themeStates = useMemo(() => {
    if (!activeTheme) return null;
    const s = new Set<string>();
    for (const e of entries) if ((e.themes ?? []).includes(activeTheme.slug) && e.stateCode) s.add(e.stateCode);
    return s;
  }, [activeTheme, entries]);

  const isDim = useCallback(
    (e: MapEntry) =>
      activeState ? e.stateCode !== activeState : activeTheme ? !(e.themes ?? []).includes(activeTheme.slug) : false,
    [activeState, activeTheme]
  );

  // ── Geometry: viewBox units -> stage pixels ────────────────────────────
  const fit = useMemo(() => {
    const s = box.w && box.h ? Math.min(box.w / VB_W, box.h / VB_H) : 0;
    return { s, ox: (box.w - VB_W * s) / 2, oy: (box.h - VB_H * s) / 2 };
  }, [box]);
  const toScreen = useCallback(
    (x: number, y: number): [number, number] => [fit.ox + fit.s * (view.k * x + view.tx), fit.oy + fit.s * (view.k * y + view.ty)],
    [fit, view]
  );

  // ── Clusters: greedy merge of nearby programmes in screen space ────────
  const clusters = useMemo<Cluster[]>(() => {
    if (!fit.s) return [];
    const items = [...placed].sort((a, b) => (b.entry.reach ?? 0) - (a.entry.reach ?? 0));
    const pos = new Map(items.map((p) => [p, toScreen(p.anchors[0][0], p.anchors[0][1])]));
    const used = new Set<Placed>();
    const out: Cluster[] = [];
    for (const p of items) {
      if (used.has(p)) continue;
      const [px, py] = pos.get(p)!;
      const members = [p];
      used.add(p);
      for (const q of items) {
        if (used.has(q)) continue;
        const [qx, qy] = pos.get(q)!;
        if (Math.hypot(qx - px, qy - py) < CLUSTER_PX) {
          members.push(q);
          used.add(q);
        }
      }
      const x = members.reduce((a, m) => a + pos.get(m)![0], 0) / members.length;
      const y = members.reduce((a, m) => a + pos.get(m)![1], 0) / members.length;
      // Programmes that share one point (e.g. a state centre) can never split
      // by zooming. Once zoomed in, fan them out on a small circle instead.
      const colocated =
        members.length > 1 &&
        members.every((m) => Math.hypot(m.anchors[0][0] - p.anchors[0][0], m.anchors[0][1] - p.anchors[0][1]) < 0.6);
      if (colocated && view.k >= 3) {
        const R = Math.max(16, members.length * 5);
        members.forEach((m, i) => {
          const a = (i / members.length) * Math.PI * 2 - Math.PI / 2;
          out.push({ x: x + Math.cos(a) * R, y: y + Math.sin(a) * R, members: [m] });
        });
      } else {
        out.push({ x, y, members });
      }
    }
    return out;
  }, [placed, fit, toScreen, view.k]);

  // ── Canvas: the dot-density layer ──────────────────────────────────────
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || !box.w) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(box.w * dpr);
    cv.height = Math.round(box.h * dpr);
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, box.w, box.h);
    const r = Math.min(2.6, 1.5 + (view.k - 1) * 0.15);
    for (const p of placed) {
      ctx.fillStyle = hexRgba(p.colour, isDim(p.entry) ? 0.12 : 0.55);
      ctx.beginPath();
      for (const [x, y] of p.dots) {
        const [sx, sy] = toScreen(x, y);
        ctx.moveTo(sx + r, sy);
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
      }
      ctx.fill();
    }
  }, [placed, box, view, toScreen, isDim]);

  // ── Zoom and pan ───────────────────────────────────────────────────────
  const zoomAt = useCallback(
    (factor: number, sx?: number, sy?: number) => {
      setView((v) => {
        if (!fit.s) return v;
        const cx = sx ?? box.w / 2;
        const cy = sy ?? box.h / 2;
        const px = ((cx - fit.ox) / fit.s - v.tx) / v.k;
        const py = ((cy - fit.oy) / fit.s - v.ty) / v.k;
        const k = Math.min(MAX_K, Math.max(MIN_K, v.k * factor));
        return clampView({ k, tx: (cx - fit.ox) / fit.s - k * px, ty: (cy - fit.oy) / fit.s - k * py });
      });
      setTip(null);
      setPinned(null);
    },
    [fit, box]
  );

  // Ctrl/Cmd + scroll (and trackpad pinch) zooms; plain scroll keeps scrolling the page.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * 0.01), e.clientX - rect.left, e.clientY - rect.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (view.k === 1 || (e.target as HTMLElement).closest("button")) return;
    drag.current = { x: e.clientX, y: e.clientY, view, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !fit.s) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    if (!d.moved) (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    d.moved = true;
    setTip(null);
    setView(clampView({ k: d.view.k, tx: d.view.tx + dx / fit.s, ty: d.view.ty + dy / fit.s }));
  };
  const onPointerUp = () => {
    // Swallow the click that ends a drag so it doesn't lock a state.
    if (drag.current?.moved) setTimeout(() => (drag.current = null), 0);
    else drag.current = null;
  };
  const dragged = () => !!drag.current?.moved;

  // ── State hover / lock (filters the list) ──────────────────────────────
  const handleStateEnter = (code: string) => {
    if (lockedState || drag.current) return;
    setHoveredState(code);
    onFilterState?.(code);
  };
  const handleStateLeave = () => {
    if (lockedState) return;
    setHoveredState(null);
    onFilterState?.(null);
  };
  const handleStateClick = (code: string) => {
    if (dragged()) return;
    if (lockedState === code) {
      setLockedState(null);
      onFilterState?.(null);
    } else {
      setLockedState(code);
      onFilterState?.(code);
    }
  };

  const open = (e: MapEntry) => {
    if (e.internalHref) window.location.href = e.internalHref;
    else if (e.externalUrl) window.open(e.externalUrl, "_blank", "noopener,noreferrer");
    else window.location.href = `/entry/${e.slug}`;
  };
  const showTip = (c: Cluster) => {
    setEngaged(true);
    setTip({ x: c.x, y: c.y, members: c.members });
  };
  const hideTip = () => {
    if (pinned) return; // a pinned (tapped) preview stays until dismissed
    setEngaged(false);
    setTip(null);
  };
  const unpin = () => {
    setPinned(null);
    setEngaged(false);
    setTip(null);
  };

  const ready = paths.length > 0;

  return (
    <div className={className}>
      <div
        className={
          bare
            ? "map-bare relative p-0 aspect-[4/5] overflow-visible"
            : "relative border border-line p-3 sm:p-5 lg:p-6 aspect-[4/5] rounded-card overflow-hidden bg-paper"
        }
      >
        {!bare && (
          <div className="absolute inset-2 sm:inset-3 lg:inset-3.5 border border-dashed border-line pointer-events-none rounded-card" />
        )}

        {/* Counter */}
        {!bare && (
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 lg:top-8 lg:right-8 z-20 px-3 py-2 rounded-card font-mono text-[11px] uppercase tracking-[0.14em] flex items-center gap-2 max-w-[calc(100%-2rem)] text-ink-soft bg-paper/90 border border-line backdrop-blur-sm">
            <span className="text-ink font-semibold tabular-nums">{visibleCount}</span>
            <span>on the map</span>
            {nationwide.length > 0 && !activeState && (
              <>
                <span className="text-line">·</span>
                <span className="text-ink font-semibold tabular-nums">{nationwide.length}</span>
                <span>nationwide</span>
              </>
            )}
            <span className="sr-only">
              {totalProgrammes ?? entries.length} programmes across {totalStates ?? new Set(entries.map((e) => e.stateCode)).size} states
            </span>
          </div>
        )}

        {/* Filter chip */}
        {activeState && (
          <div className="absolute top-4 left-4 sm:top-6 sm:left-6 lg:top-8 lg:left-8 z-20 px-3 py-1.5 rounded-card text-[13px] flex items-center gap-2 text-ink bg-paper border border-line">
            <span className="text-muted">State:</span> <span className="font-medium">{stateNameFor(activeState)}</span>
            <button
              onClick={() => {
                setLockedState(null);
                setHoveredState(null);
                onFilterState?.(null);
              }}
              className="ml-1 inline-flex items-center min-h-8 px-1.5 text-teal hover:text-deep-teal"
              aria-label="Clear state filter"
            >
              Clear ×
            </button>
          </div>
        )}

        {/* Map stage: SVG basemap, canvas dots, cluster chips */}
        <div
          ref={stageRef}
          className="relative w-full h-full"
          style={{ touchAction: view.k > 1 ? "none" : "pan-y", cursor: view.k > 1 ? "grab" : undefined }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClick={(e) => {
            // Tapping empty map closes a pinned preview.
            const t = e.target as HTMLElement;
            if (pinned && !t.closest("button") && !t.closest("[data-map-tip]")) unpin();
          }}
          onDoubleClick={(e) => {
            if ((e.target as HTMLElement).closest("button")) return;
            const rect = stageRef.current!.getBoundingClientRect();
            zoomAt(2, e.clientX - rect.left, e.clientY - rect.top);
          }}
        >
          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            className="absolute inset-0 w-full h-full block"
            role="img"
            aria-label="Map of India showing food systems programmes"
            aria-busy={!ready}
          >
            {!ready ? (
              <g aria-hidden="true" className="motion-safe:animate-pulse">
                <rect x={VB_W * 0.18} y={VB_H * 0.1} width={VB_W * 0.64} height={VB_H * 0.78} rx={VB_W * 0.2} fill="rgba(46, 117, 115, 0.06)" />
              </g>
            ) : (
              <g className="map-country" transform={`translate(${view.tx} ${view.ty}) scale(${view.k})`}>
                {paths.map((p) => {
                  const hoverActive = !!activeState && activeState === p.code;
                  const themeLit = !activeState && !!themeStates?.has(p.code) && !!activeTheme;
                  return (
                    <path
                      key={p.code + p.name}
                      d={p.d}
                      vectorEffect="non-scaling-stroke"
                      className={`map-state ${hoverActive ? "active" : ""}`}
                      style={{
                        ...(themeLit && activeTheme ? { fill: hexRgba(activeTheme.color, 0.35), stroke: activeTheme.color } : {}),
                        // The active-state drop shadow is in map units, so it balloons when zoomed.
                        ...(view.k > 1 ? { filter: "none" } : {}),
                      }}
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
          </svg>

          <canvas ref={canvasRef} aria-hidden className="absolute inset-0 w-full h-full pointer-events-none" />

          {/* Chips and single-programme markers: real buttons for hover, focus and click. */}
          {clusters.map((c) => {
            const many = c.members.length > 1;
            const first = c.members[0];
            const dimAll = c.members.every((m) => isDim(m.entry));
            const label = many
              ? `${c.members.length} programmes: ${c.members.slice(0, 3).map((m) => m.entry.title).join("; ")}${c.members.length > 3 ? "; and more" : ""}. Zoom in`
              : `${first.entry.title}, ${stateNameFor(first.entry.stateCode)}, ${categoryName(first.entry)}`;
            return (
              <button
                key={c.members.map((m) => m.entry.id).join("|")}
                type="button"
                aria-label={label}
                className="absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline-2 focus-visible:outline-teal"
                style={{ left: c.x, top: c.y, opacity: dimAll ? 0.35 : 1 }}
                onMouseEnter={() => showTip(c)}
                onMouseLeave={hideTip}
                onFocus={() => showTip(c)}
                onBlur={hideTip}
                onPointerDown={(e) => (lastPointer.current = e.pointerType)}
                onClick={() => {
                  if (dragged()) return;
                  if (many) return zoomAt(view.k >= MAX_K ? 1 : 3, c.x, c.y);
                  // Touch: first tap previews, second tap (same marker) opens.
                  if (lastPointer.current === "touch" && pinned !== first.entry.id) {
                    setPinned(first.entry.id);
                    showTip(c);
                    return;
                  }
                  open(first.entry);
                }}
              >
                {many ? <ClusterChip members={c.members} /> : <SingleMarker colour={first.colour} />}
              </button>
            );
          })}

          {/* Tooltip */}
          {tip && (
            <div
              role={pinned ? "dialog" : "tooltip"}
              aria-label={pinned ? "Programme preview" : undefined}
              data-map-tip
              className={`absolute z-30 max-w-[260px] min-w-[180px] px-3.5 py-3 rounded-card border border-line bg-paper text-ink shadow-[0_10px_28px_-14px_rgba(26,38,37,0.35)] ${pinned ? "" : "pointer-events-none"}`}
              style={{
                left: Math.min(tip.x + 14, Math.max(0, box.w - 260)),
                top: tip.y + 14 > box.h - (pinned ? 170 : 120) ? tip.y - 14 - (pinned ? 160 : 110) : tip.y + 14,
              }}
            >
              {tip.members.slice(0, 4).map((m) => (
                <div key={m.entry.id} className="mb-1.5 last:mb-0">
                  <div className="text-[13.5px] font-medium leading-snug">{m.entry.title}</div>
                  <div className="text-[12px] text-muted mt-0.5 flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ background: m.colour }} aria-hidden />
                    {stateNameFor(m.entry.stateCode)} · {categoryName(m.entry)}
                  </div>
                </div>
              ))}
              {tip.members.length > 4 && (
                <div className="text-[12px] text-muted mt-1">and {tip.members.length - 4} more. Click to zoom in.</div>
              )}
              {pinned && tip.members.length === 1 && (
                <div className="mt-2.5 pt-2 border-t border-line flex items-center justify-between gap-3">
                  <a
                    href={tip.members[0].entry.internalHref ?? `/entry/${tip.members[0].entry.slug}`}
                    className="inline-flex items-center min-h-10 text-[14px] font-medium text-teal hover:text-deep-teal"
                  >
                    Open fact sheet →
                  </a>
                  <button type="button" onClick={unpin} aria-label="Close preview" className="inline-flex items-center justify-center w-10 h-10 -mr-2 text-muted hover:text-ink">
                    ×
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Zoom controls */}
        {ready && (
          <div className={`absolute z-20 flex flex-col rounded-card border border-line bg-paper/95 overflow-hidden ${bare ? "right-0 bottom-10" : "right-4 bottom-4 sm:right-6 sm:bottom-6 lg:right-8 lg:bottom-8"}`}>
            <button type="button" aria-label="Zoom in" onClick={() => zoomAt(2)} className="w-9 h-9 text-[18px] text-ink-soft hover:bg-teal-wash hover:text-teal border-b border-line">+</button>
            <button type="button" aria-label="Zoom out" onClick={() => zoomAt(0.5)} disabled={view.k === 1} className="w-9 h-9 text-[18px] text-ink-soft hover:bg-teal-wash hover:text-teal disabled:text-muted/40 border-b border-line">−</button>
            <button type="button" aria-label="Reset map view" onClick={() => setView({ k: 1, tx: 0, ty: 0 })} disabled={view.k === 1} className="w-9 h-9 text-[11px] text-ink-soft hover:bg-teal-wash hover:text-teal disabled:text-muted/40">⟲</button>
          </div>
        )}

        {/* Legend */}
        {!bare && (
          <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 lg:bottom-8 lg:left-8 z-20 px-3 py-2.5 hidden sm:flex flex-col gap-1.5 text-[12px] text-ink-soft rounded-card border border-line bg-paper/92 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <svg width="18" height="12" aria-hidden>
                {[[4, 6], [8, 3], [11, 8], [14, 5], [6, 9]].map(([x, y], i) => (
                  <circle key={i} cx={x} cy={y} r={1.5} fill={palette.teal} opacity={0.6} />
                ))}
              </svg>
              Programme, dots grow with reach
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-paper border border-ink text-[10px] text-ink">3</span>
              Group, click to zoom in
            </div>
          </div>
        )}

        {/* Phased theme tour caption (home page) */}
        {activeTheme && (
          <div className="absolute left-3 bottom-3 sm:left-4 sm:bottom-4 z-20 flex flex-col gap-2 pointer-events-none select-none max-w-[calc(100%-2rem)]">
            <div key={activeTheme.slug} className="inline-flex items-center gap-2.5 px-3 py-2 rounded-card border border-line bg-paper/92 animate-scope-pop w-fit">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: activeTheme.color }} />
              <span className="font-sans text-[13px] font-medium text-ink leading-none whitespace-nowrap">
                {activeTheme.short}
                <RaisedCount n={activeTheme.count} srLabel={`, ${activeTheme.count} programmes`} />
              </span>
            </div>
            <div className="flex gap-1 pl-0.5">
              {phaseThemes.map((t, i) => (
                <span
                  key={t.slug}
                  className="h-[3px] rounded-full transition-[width,background-color] duration-500 ease-out"
                  style={{ width: i === phaseIdx ? 16 : 7, background: i === phaseIdx ? activeTheme.color : "rgba(26,38,37,0.16)" }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Nationwide strip: programmes with no single place on the map */}
      {nationwide.length > 0 && (
        <details className="group mt-3 rounded-card border border-line bg-paper">
          <summary className="flex items-center justify-between gap-3 min-h-11 px-4 cursor-pointer list-none text-[14px] text-ink">
            <span>
              <span className="font-medium">Nationwide</span>{" "}
              <span className="text-muted tabular-nums">({nationwide.length})</span>
              <span className="text-muted hidden sm:inline"> · national and multi-state programmes, not tied to one place</span>
            </span>
            <span aria-hidden className="text-muted transition-transform group-open:rotate-180">▾</span>
          </summary>
          <ul className="list-none m-0 px-4 pb-3 pt-1 border-t border-line">
            {nationwide.map((e) => (
              <li key={e.id} className="py-2 border-b border-line last:border-b-0">
                <a href={e.internalHref ?? `/entry/${e.slug}`} className="flex items-center gap-2 text-[14px] text-ink hover:text-teal">
                  <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: colourFor(e) }} aria-hidden />
                  <span className="min-w-0">{e.title}</span>
                  <span className="ml-auto text-[12px] text-muted shrink-0">{categoryName(e)}</span>
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

/** Numbered chip: paper fill, 1px ink stroke, a thin ring split by category share. */
function ClusterChip({ members }: { members: Placed[] }) {
  const counts = new Map<string, number>();
  for (const m of members) counts.set(m.colour, (counts.get(m.colour) ?? 0) + 1);
  const R = 14, C = 2 * Math.PI * R;
  let offset = 0;
  const n = members.length;
  return (
    <svg width={34} height={34} viewBox="0 0 34 34" aria-hidden className="block">
      <g transform="rotate(-90 17 17)">
        {[...counts.entries()].map(([col, k]) => {
          const len = (k / n) * C;
          const el = (
            <circle key={col} cx={17} cy={17} r={R} fill="none" stroke={col} strokeWidth={2.5} strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} />
          );
          offset += len;
          return el;
        })}
      </g>
      <circle cx={17} cy={17} r={11} fill="var(--paper)" stroke="var(--ink)" strokeWidth={1} />
      <text x={17} y={17} textAnchor="middle" dominantBaseline="central" fontSize={n > 99 ? 9 : 11} fontWeight={600} fill="var(--ink)" fontFamily="var(--font-inter), system-ui">
        {n}
      </text>
    </svg>
  );
}

/** A single programme: its core dot in the category colour, with a paper ring; 24px hit area. */
function SingleMarker({ colour }: { colour: string }) {
  return (
    <span className="flex items-center justify-center w-6 h-6">
      <span className="block w-[9px] h-[9px] rounded-full ring-2 ring-paper" style={{ background: colour }} />
    </span>
  );
}

function stateNameFor(code: string): string {
  return STATE_NAMES[code] ?? code;
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
