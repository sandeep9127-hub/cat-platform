/**
 * Procedural topo-line signature for a landscape page. Each slug deterministically
 * seeds a unique combination of wave frequency, amplitude, and phase, so every
 * landscape gets its own visual fingerprint without us hand-tuning eleven SVGs.
 *
 * The treatment is editorial, not literal — these are not real contour lines for
 * the geography, they are an abstract typographic mark that says "this is a
 * different place". Renders inline as SVG so it scales cleanly at any size and
 * picks up animation tokens.
 */
type Props = {
  slug: string;
  /** Width of the SVG in pixels (height follows from aspect 1.7:1). Default 240. */
  width?: number;
  /** Optional override accent colour; defaults to deep-teal. */
  accent?: string;
  className?: string;
};

function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * Deterministic pseudo-random in [0,1) from a seed integer.
 * Mulberry32, plenty for visual variation.
 */
function rng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function LandscapeSignature({
  slug,
  width = 240,
  accent = "#334B4A",
  className,
}: Props) {
  const w = width;
  const h = Math.round(width / 1.7);
  const seed = hash(slug);
  const rand = rng(seed);

  // Six topo bands, each a smooth wave with deterministic shape.
  const lineCount = 6;
  const lines: { d: string; opacity: number; strokeWidth: number; color: string }[] = [];
  for (let i = 0; i < lineCount; i++) {
    const yBase = h * (0.18 + (i / (lineCount - 1)) * 0.72);
    const amplitude = h * (0.06 + rand() * 0.10);
    const frequency = 0.7 + rand() * 1.2; // cycles across width
    const phase = rand() * Math.PI * 2;
    const tilt = (rand() - 0.5) * h * 0.08;

    // Sample 24 points across the width and build a smooth cubic spline.
    const points: [number, number][] = [];
    const samples = 24;
    for (let s = 0; s <= samples; s++) {
      const x = (s / samples) * w;
      const t = s / samples;
      const y = yBase + Math.sin(t * frequency * Math.PI * 2 + phase) * amplitude + tilt * t;
      points.push([x, y]);
    }
    const d = pointsToCubicPath(points);
    const isAccent = i === Math.min(lineCount - 1, 1 + Math.floor(rand() * (lineCount - 2)));
    lines.push({
      d,
      opacity: 0.35 + (i / lineCount) * 0.45,
      strokeWidth: isAccent ? 1.4 : 0.85,
      color: isAccent ? "#C68C2E" : accent,
    });
  }

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      role="img"
      aria-label={`Signature mark for ${slug}`}
      className={className}
    >
      <defs>
        <linearGradient id={`sig-fade-${slug}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="rgba(0,0,0,0)" />
          <stop offset="14%" stopColor="rgba(0,0,0,1)" />
          <stop offset="86%" stopColor="rgba(0,0,0,1)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </linearGradient>
        <mask id={`sig-mask-${slug}`}>
          <rect width={w} height={h} fill={`url(#sig-fade-${slug})`} />
        </mask>
      </defs>

      <g mask={`url(#sig-mask-${slug})`} fill="none" strokeLinecap="round">
        {lines.map((l, i) => (
          <path
            key={i}
            d={l.d}
            stroke={l.color}
            strokeOpacity={l.opacity}
            strokeWidth={l.strokeWidth}
          />
        ))}
      </g>
    </svg>
  );
}

function pointsToCubicPath(points: [number, number][]): string {
  if (points.length < 2) return "";
  const [x0, y0] = points[0];
  let d = `M${x0.toFixed(2)},${y0.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const mx = (x1 + x2) / 2;
    d += ` Q${x1.toFixed(2)},${y1.toFixed(2)} ${mx.toFixed(2)},${((y1 + y2) / 2).toFixed(2)}`;
  }
  const last = points[points.length - 1];
  d += ` L${last[0].toFixed(2)},${last[1].toFixed(2)}`;
  return d;
}
