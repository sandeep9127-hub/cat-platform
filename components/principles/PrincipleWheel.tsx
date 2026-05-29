"use client";

import { useEffect, useRef, useState } from "react";
import { type Principle, LEVELS, levelOf } from "@/lib/data/principles";

export type WheelPalette = {
  bg: string;
  accent: string;
  accentInk: string;
  hub: string;
  hubInk: string;
  hubMuted: string;
  hubRing: string;
  levels: {
    agro: { band: string; sector: string; ink: string };
    food: { band: string; sector: string; ink: string };
  };
};

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function annularSector(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  a0: number,
  a1: number,
) {
  const o0 = polar(cx, cy, rOuter, a0);
  const o1 = polar(cx, cy, rOuter, a1);
  const i1 = polar(cx, cy, rInner, a1);
  const i0 = polar(cx, cy, rInner, a0);
  const large = a1 - a0 > 180 ? 1 : 0;
  return (
    `M ${o0.x.toFixed(2)} ${o0.y.toFixed(2)} ` +
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${o1.x.toFixed(2)} ${o1.y.toFixed(2)} ` +
    `L ${i1.x.toFixed(2)} ${i1.y.toFixed(2)} ` +
    `A ${rInner} ${rInner} 0 ${large} 0 ${i0.x.toFixed(2)} ${i0.y.toFixed(2)} Z`
  );
}

function arcStroke(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p0 = polar(cx, cy, r, a0);
  const p1 = polar(cx, cy, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
}

const SERIF = "var(--font-fraunces), Georgia, serif";
const MONO = "var(--font-jetbrains), ui-monospace, monospace";

export function PrincipleWheel({
  principles,
  selected,
  hovered,
  onSelect,
  onHover,
  palette,
}: {
  principles: Principle[];
  selected: number | null;
  hovered: number | null;
  onSelect: (n: number) => void;
  onHover: (n: number | null) => void;
  palette: WheelPalette;
}) {
  const SIZE = 660;
  const C = SIZE / 2;
  const R_OUT = 270;
  const R_IN = 150;
  const R_BAND = R_OUT + 16;
  const N = principles.length;
  const step = 360 / N;
  const SMALL = 0.7;
  const BIG = 4; // half-gaps; BIG marks the two level boundaries

  const edges = (i: number): [number, number] => {
    const a0 = i * step + (i === 0 || i === 7 ? BIG : SMALL);
    const a1 = (i + 1) * step - (i === 6 || i === 12 ? BIG : SMALL);
    return [a0, a1];
  };

  // Continuous rotation so the selected sector sits under the top pointer.
  // We accumulate via shortest angular delta so the ring never spins the long
  // way around at the 13→1 wraparound.
  const [rot, setRot] = useState(0);
  const rotRef = useRef(0);
  useEffect(() => {
    if (selected == null) return;
    const idx = selected - 1;
    const targetBase = -((idx + 0.5) * step); // bring sector midpoint to top (0°)
    const cur = rotRef.current;
    // shortest delta to any angle congruent to targetBase (mod 360)
    let delta = ((targetBase - cur + 540) % 360) - 180;
    const next = cur + delta;
    rotRef.current = next;
    setRot(next);
  }, [selected, step]);

  const active = hovered ?? selected;
  const activeP = active ? principles.find((p) => p.n === active) : null;
  const lv = palette.levels;

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="ae-wheel"
      role="group"
      aria-label="Wheel of the 13 principles of agroecology, split into agroecosystem (1–7) and food-system (8–13) transformation"
    >
      <defs>
        <filter id="wheelShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#000" floodOpacity="0.22" />
        </filter>
      </defs>

      {/* ROTATING RING — sectors + bands rotate so the active sits at top */}
      <g
        style={{
          transition: "transform 620ms cubic-bezier(.22,.61,.36,1)",
          transform: `rotate(${rot}deg)`,
          transformOrigin: `${C}px ${C}px`,
        }}
      >
        {/* continuous outer ring, two colours meeting at the level boundaries */}
        <path
          d={arcStroke(C, C, R_BAND, 1.4, 7 * step - 1.4)}
          fill="none"
          stroke={lv.agro.band}
          strokeWidth="7"
        />
        <path
          d={arcStroke(C, C, R_BAND, 7 * step + 1.4, 360 - 1.4)}
          fill="none"
          stroke={lv.food.band}
          strokeWidth="7"
        />
        {[1.4, 7 * step - 1.4, 7 * step + 1.4, 360 - 1.4].map((a, idx) => {
          const p = polar(C, C, R_BAND, a);
          const col = idx < 2 ? lv.agro.band : lv.food.band;
          return <circle key={idx} cx={p.x} cy={p.y} r="3.5" fill={col} />;
        })}

        {principles.map((p, i) => {
          const [a0, a1] = edges(i);
          const mid = (a0 + a1) / 2;
          const key = levelOf(p.n);
          const isActive = p.n === active;
          const isSelected = p.n === selected;
          // The active wedge grows outward — wider reach + a small lift — so
          // the slot under the top pointer reads as "chosen".
          const rOuter = isActive ? R_OUT + 22 : R_OUT;
          const off = isActive ? 8 : 0;
          const ov = polar(0, 0, off, mid);
          const iconPos = polar(C, C, (R_IN + rOuter) / 2 + 6, mid);
          const numPos = polar(C, C, rOuter - 22, mid);
          const fill = isActive ? palette.accent : lv[key].sector;
          const ink = isActive ? palette.accentInk : lv[key].ink;
          // Colourful emblem badge — the common icon used across wheel,
          // sidebar and detail. Active grows a touch.
          const emSize = isActive ? 58 : 48;

          return (
            <g
              key={p.n}
              transform={`translate(${ov.x.toFixed(2)} ${ov.y.toFixed(2)})`}
              style={{ transition: "transform 220ms cubic-bezier(.2,.8,.2,1)", cursor: "pointer" }}
              onMouseEnter={() => onHover(p.n)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onSelect(p.n)}
              role="button"
              aria-pressed={isSelected}
              aria-label={`${p.n}. ${p.title}`}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(p.n);
                }
              }}
            >
              <path
                d={annularSector(C, C, R_IN, rOuter, a0, a1)}
                fill={fill}
                stroke={palette.bg}
                strokeWidth="2"
                style={{ transition: "fill 200ms, d 220ms cubic-bezier(.2,.8,.2,1)" }}
              />
              {/* number + icon counter-rotate so they stay upright as the ring turns */}
              <g transform={`rotate(${-rot} ${numPos.x.toFixed(2)} ${numPos.y.toFixed(2)})`}>
                <text
                  x={numPos.x}
                  y={numPos.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="14"
                  fontWeight="600"
                  fill={ink}
                  opacity={isActive ? 1 : 0.6}
                  style={{ transition: "fill 200ms", pointerEvents: "none", fontFamily: MONO }}
                >
                  {String(p.n).padStart(2, "0")}
                </text>
              </g>
              <g transform={`rotate(${-rot} ${iconPos.x.toFixed(2)} ${iconPos.y.toFixed(2)})`}>
                <image
                  href={`/images/principle-icons/p${p.n}.png?v=4`}
                  x={(iconPos.x - emSize / 2).toFixed(2)}
                  y={(iconPos.y - emSize / 2).toFixed(2)}
                  width={emSize}
                  height={emSize}
                  style={{ pointerEvents: "none", transition: "width 200ms, height 200ms" }}
                />
              </g>
            </g>
          );
        })}
      </g>

      {/* FIXED TOP POINTER — marks the active slot */}
      <g style={{ pointerEvents: "none" }}>
        <path
          d={`M ${C - 13} ${C - R_BAND - 16} L ${C + 13} ${C - R_BAND - 16} L ${C} ${C - R_BAND + 2} Z`}
          fill={palette.hub}
        />
      </g>

      {/* HUB (fixed) */}
      <circle cx={C} cy={C} r={R_IN - 8} fill={palette.hub} filter="url(#wheelShadow)" />
      <circle cx={C} cy={C} r={R_IN - 8} fill="none" stroke={palette.hubRing} strokeWidth="1.5" />

      {activeP ? (
        <g style={{ pointerEvents: "none" }}>
          <foreignObject x={C - 122} y={C - 64} width="244" height="34">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "7px",
                fontFamily: MONO,
                fontSize: "11.5px",
                fontWeight: 600,
                letterSpacing: "1.4px",
                textTransform: "uppercase",
              }}
            >
              <span
                style={{
                  width: "9px",
                  height: "9px",
                  borderRadius: "999px",
                  background: lv[levelOf(activeP.n)].band,
                }}
              />
              <span style={{ color: palette.hubMuted }}>
                {LEVELS[levelOf(activeP.n)].short} · {String(activeP.n).padStart(2, "0")}
              </span>
            </div>
          </foreignObject>
          <foreignObject x={C - 124} y={C - 30} width="248" height="78">
            <div
              style={{
                fontFamily: SERIF,
                color: palette.hubInk,
                fontSize: "25px",
                fontWeight: 600,
                lineHeight: 1.08,
                textAlign: "center",
                textWrap: "balance",
              }}
            >
              {activeP.title}
            </div>
          </foreignObject>
        </g>
      ) : (
        <g style={{ pointerEvents: "none" }}>
          <text
            x={C}
            y={C - 34}
            textAnchor="middle"
            fontSize="72"
            fontWeight="600"
            fill={palette.hubInk}
            style={{ fontFamily: SERIF }}
          >
            13
          </text>
          <text
            x={C}
            y={C + 20}
            textAnchor="middle"
            fontSize="15"
            fontWeight="500"
            letterSpacing="1"
            fill={palette.hubMuted}
            style={{ fontFamily: SERIF }}
          >
            principles of
          </text>
          <text
            x={C}
            y={C + 42}
            textAnchor="middle"
            fontSize="15"
            fontWeight="500"
            letterSpacing="1"
            fill={palette.hubMuted}
            style={{ fontFamily: SERIF }}
          >
            agroecology
          </text>
        </g>
      )}

    </svg>
  );
}
