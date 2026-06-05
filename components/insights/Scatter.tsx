/**
 * Server-rendered SVG bubble scatter. x and y are linear; bubble area encodes a
 * third value. Built for "investment vs land reached, sized by engagement".
 */
export type Point = {
  label: string;
  x: number;
  y: number;
  size: number;
  color: string;
};

export function Scatter({
  points,
  width = 920,
  height = 460,
  xLabel,
  yLabel,
}: {
  points: Point[];
  width?: number;
  height?: number;
  xLabel: string;
  yLabel: string;
}) {
  const m = { top: 24, right: 28, bottom: 52, left: 64 };
  const iw = width - m.left - m.right;
  const ih = height - m.top - m.bottom;
  const xMax = Math.max(...points.map((p) => p.x), 1) * 1.08;
  const yMax = Math.max(...points.map((p) => p.y), 1) * 1.12;
  const sMax = Math.max(...points.map((p) => p.size), 1);
  const sx = (v: number) => m.left + (v / xMax) * iw;
  const sy = (v: number) => m.top + ih - (v / yMax) * ih;
  const sr = (v: number) => 6 + Math.sqrt(v / sMax) * 30;
  const xTicks = 5;
  const yTicks = 4;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto"
      role="img"
      aria-label="Bubble scatter of investment versus land reached"
    >
      {/* gridlines */}
      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const v = (yMax / yTicks) * i;
        const y = sy(v);
        return (
          <g key={`y${i}`}>
            <line x1={m.left} y1={y} x2={width - m.right} y2={y} stroke="#eee7da" strokeWidth={1} />
            <text x={m.left - 10} y={y + 3} textAnchor="end" className="font-mono" style={{ fontSize: 9.5, fill: "#9aa0a0" }}>
              {Math.round(v).toLocaleString("en-IN")}
            </text>
          </g>
        );
      })}
      {Array.from({ length: xTicks + 1 }, (_, i) => {
        const v = (xMax / xTicks) * i;
        const x = sx(v);
        return (
          <text key={`x${i}`} x={x} y={height - m.bottom + 18} textAnchor="middle" className="font-mono" style={{ fontSize: 9.5, fill: "#9aa0a0" }}>
            ₹{v.toFixed(1)}
          </text>
        );
      })}
      {/* axis labels */}
      <text x={m.left + iw / 2} y={height - 8} textAnchor="middle" className="font-mono" style={{ fontSize: 10, letterSpacing: "0.08em", fill: "#6b7271" }}>
        {xLabel}
      </text>
      <text
        transform={`rotate(-90 14 ${m.top + ih / 2})`}
        x={14}
        y={m.top + ih / 2}
        textAnchor="middle"
        className="font-mono"
        style={{ fontSize: 10, letterSpacing: "0.08em", fill: "#6b7271" }}
      >
        {yLabel}
      </text>
      {/* bubbles */}
      {points.map((p, i) => {
        const cx = sx(p.x);
        const cy = sy(p.y);
        const rr = sr(p.size);
        return (
          <g key={i} className="group">
            <circle cx={cx} cy={cy} r={rr} fill={p.color} fillOpacity={0.22} stroke={p.color} strokeWidth={1.5} className="transition-[fill-opacity] duration-200 ease-out-expo group-hover:[fill-opacity:0.4]" />
            <circle cx={cx} cy={cy} r={2.5} fill={p.color} />
            <text x={cx} y={cy - rr - 5} textAnchor="middle" className="font-sans" style={{ fontSize: 10.5, fontWeight: 600, fill: "#3a4544" }}>
              {p.label.length > 22 ? p.label.slice(0, 21) + "…" : p.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
