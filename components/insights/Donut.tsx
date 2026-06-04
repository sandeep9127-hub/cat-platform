/** Server-rendered SVG donut. Segments are drawn as stroked arcs. */
export type DonutSeg = { label: string; value: number; color: string };

export function Donut({
  segments,
  size = 220,
  thickness = 34,
  centerTop,
  centerSub,
}: {
  segments: DonutSeg[];
  size?: number;
  thickness?: number;
  centerTop?: string;
  centerSub?: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Donut chart"
        className="shrink-0"
      >
        <g transform={`rotate(-90 ${c} ${c})`}>
          <circle cx={c} cy={c} r={r} fill="none" stroke="#eee7da" strokeWidth={thickness} />
          {segments.map((s, i) => {
            const frac = s.value / total;
            const len = frac * circ;
            const dash = `${len} ${circ - len}`;
            const el = (
              <circle
                key={i}
                cx={c}
                cy={c}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={thickness}
                strokeDasharray={dash}
                strokeDashoffset={-offset}
              />
            );
            offset += len;
            return el;
          })}
        </g>
        {centerTop && (
          <text
            x={c}
            y={c - 2}
            textAnchor="middle"
            className="font-serif"
            style={{ fontSize: 24, fontWeight: 500, fill: "#1a2625" }}
          >
            {centerTop}
          </text>
        )}
        {centerSub && (
          <text
            x={c}
            y={c + 16}
            textAnchor="middle"
            className="font-mono"
            style={{ fontSize: 9, letterSpacing: "0.12em", fill: "#6b7271" }}
          >
            {centerSub}
          </text>
        )}
      </svg>
      <ul className="space-y-2.5 list-none p-0 m-0">
        {segments.map((s, i) => (
          <li key={i} className="flex items-center gap-2.5 text-[13px]">
            <span
              className="w-3 h-3 rounded-[3px] shrink-0"
              style={{ background: s.color }}
              aria-hidden
            />
            <span className="text-ink-soft">{s.label}</span>
            <span className="font-mono text-[11px] text-muted tabular-nums">
              ₹{(s.value / 1e7).toFixed(2)} Cr · {((s.value / total) * 100).toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
