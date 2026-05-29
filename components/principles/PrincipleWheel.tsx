"use client";

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
  const R_OUT = 286;
  const R_IN = 150;
  const R_BAND = R_OUT + 18;
  const N = principles.length;
  const step = 360 / N;
  const SMALL = 0.7;
  const BIG = 4; // half-gaps; BIG marks the two level boundaries

  const edges = (i: number): [number, number] => {
    const a0 = i * step + (i === 0 || i === 7 ? BIG : SMALL);
    const a1 = (i + 1) * step - (i === 6 || i === 12 ? BIG : SMALL);
    return [a0, a1];
  };

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
          <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#000" floodOpacity="0.28" />
        </filter>
      </defs>

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
        const off = isActive ? 12 : 0;
        const ov = polar(0, 0, off, mid);
        const iconPos = polar(C, C, (R_IN + R_OUT) / 2 + 6, mid);
        const numPos = polar(C, C, R_OUT - 26, mid);
        const fill = isActive ? palette.accent : lv[key].sector;
        const ink = isActive ? palette.accentInk : lv[key].ink;
        // Icon markup is from our own trusted static data (lib/data/principles.ts),
        // never user input — safe to inject.
        const iconSvg = `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="transition: stroke 200ms; pointer-events:none">${p.icon}</svg>`;

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
              d={annularSector(C, C, R_IN, R_OUT, a0, a1)}
              fill={fill}
              stroke={palette.bg}
              strokeWidth="2"
              style={{ transition: "fill 200ms" }}
            />
            <text
              x={numPos.x}
              y={numPos.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="15"
              fontWeight="600"
              fill={ink}
              opacity={isActive ? 1 : 0.62}
              style={{ transition: "fill 200ms", pointerEvents: "none", fontFamily: MONO }}
            >
              {String(p.n).padStart(2, "0")}
            </text>
            <g
              transform={`translate(${(iconPos.x - 17).toFixed(2)} ${(iconPos.y - 17).toFixed(2)})`}
              dangerouslySetInnerHTML={{ __html: iconSvg }}
            />
          </g>
        );
      })}

      {/* hub */}
      <circle cx={C} cy={C} r={R_IN - 8} fill={palette.hub} filter="url(#wheelShadow)" />
      <circle cx={C} cy={C} r={R_IN - 8} fill="none" stroke={palette.hubRing} strokeWidth="1.5" />

      {activeP ? (
        <g style={{ pointerEvents: "none" }}>
          <foreignObject x={C - 122} y={C - 56} width="244" height="40">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "7px",
                fontFamily: MONO,
                fontSize: "12px",
                fontWeight: 600,
                letterSpacing: "1.5px",
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
          <foreignObject x={C - 124} y={C - 18} width="248" height="100">
            <div
              style={{
                fontFamily: SERIF,
                color: palette.hubInk,
                fontSize: "27px",
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
            y={C - 30}
            textAnchor="middle"
            fontSize="78"
            fontWeight="600"
            fill={palette.hubInk}
            style={{ fontFamily: SERIF }}
          >
            13
          </text>
          <text
            x={C}
            y={C + 26}
            textAnchor="middle"
            fontSize="16"
            fontWeight="500"
            letterSpacing="1"
            fill={palette.hubMuted}
            style={{ fontFamily: SERIF }}
          >
            principles of
          </text>
          <text
            x={C}
            y={C + 50}
            textAnchor="middle"
            fontSize="16"
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
