/**
 * Squarified-ish treemap via recursive weighted bisection — robust (always a
 * valid tiling), no dependency. Server-rendered SVG. Each cell is a category.
 */
export type TreeItem = { label: string; value: number; color: string; sub?: string };

type Rect = TreeItem & { x: number; y: number; w: number; h: number };

function layout(items: TreeItem[], x: number, y: number, w: number, h: number, out: Rect[]) {
  if (items.length === 0) return;
  if (items.length === 1) {
    out.push({ ...items[0], x, y, w, h });
    return;
  }
  const total = items.reduce((s, i) => s + i.value, 0);
  // Split index that best balances the two halves.
  let best = 1;
  let bestDiff = Infinity;
  let acc = 0;
  for (let i = 0; i < items.length - 1; i++) {
    acc += items[i].value;
    const diff = Math.abs(acc - total / 2);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i + 1;
    }
  }
  const a = items.slice(0, best);
  const b = items.slice(best);
  const aSum = a.reduce((s, i) => s + i.value, 0);
  const frac = total > 0 ? aSum / total : 0.5;
  if (w >= h) {
    const aw = w * frac;
    layout(a, x, y, aw, h, out);
    layout(b, x + aw, y, w - aw, h, out);
  } else {
    const ah = h * frac;
    layout(a, x, y, w, ah, out);
    layout(b, x, y + ah, w, h - ah, out);
  }
}

export function Treemap({
  items,
  width = 920,
  height = 460,
}: {
  items: TreeItem[];
  width?: number;
  height?: number;
}) {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const rects: Rect[] = [];
  layout(sorted, 0, 0, width, height, rects);
  const grand = sorted.reduce((s, i) => s + i.value, 0);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto"
      role="img"
      aria-label="Treemap of budget allocation by category"
    >
      {rects.map((r, i) => {
        const pct = grand > 0 ? (r.value / grand) * 100 : 0;
        const big = r.w > 120 && r.h > 64;
        const med = r.w > 78 && r.h > 44;
        return (
          <g key={i} className="group">
            <rect
              x={r.x + 1.5}
              y={r.y + 1.5}
              width={Math.max(0, r.w - 3)}
              height={Math.max(0, r.h - 3)}
              rx={5}
              fill={r.color}
              className="transition-opacity duration-200 group-hover:opacity-90"
            />
            {med && (
              <text
                x={r.x + 12}
                y={r.y + 22}
                fill="#fbf8f2"
                className="font-sans"
                style={{ fontSize: big ? 13 : 11, fontWeight: 600 }}
              >
                {r.label.length > (big ? 26 : 16)
                  ? r.label.slice(0, big ? 25 : 15) + "…"
                  : r.label}
              </text>
            )}
            {big && (
              <>
                <text
                  x={r.x + 12}
                  y={r.y + 44}
                  fill="#fbf8f2"
                  className="font-serif"
                  style={{ fontSize: 19, fontWeight: 500 }}
                >
                  ₹{(r.value / 1e7).toFixed(2)} Cr
                </text>
                <text
                  x={r.x + 12}
                  y={r.y + 62}
                  fill="#fbf8f2"
                  className="font-mono"
                  style={{ fontSize: 10, opacity: 0.85, letterSpacing: "0.05em" }}
                >
                  {pct.toFixed(1)}%
                </text>
              </>
            )}
            {!big && med && (
              <text
                x={r.x + 12}
                y={r.y + 38}
                fill="#fbf8f2"
                className="font-mono"
                style={{ fontSize: 9.5, opacity: 0.9 }}
              >
                ₹{(r.value / 1e7).toFixed(1)} Cr
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
