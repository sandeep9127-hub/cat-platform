"use client";

import { useRef } from "react";
import { Download } from "lucide-react";

export type Slice = { label: string; value: number; color: string };
export type VizSpec = {
  id: string;
  kind: "donut" | "bar" | "line";
  title: string;
  unit: string;
  series: Slice[];
  note?: string;
};

const PAPER = "#faf9f5";
const INK = "#16130d";
const MUTED = "#736f64";

function fmt(n: number): string {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

/** Serialize the chart SVG and download it as a PNG (2× for crisp sharing). */
function downloadPng(svg: SVGSVGElement, filename: string) {
  const vb = svg.viewBox.baseVal;
  const w = vb && vb.width ? vb.width : svg.clientWidth || 720;
  const h = vb && vb.height ? vb.height : svg.clientHeight || 420;
  const xml = new XMLSerializer().serializeToString(svg);
  const svg64 = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(xml)))}`;
  const img = new Image();
  img.onload = () => {
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, w, h);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    }, "image/png");
  };
  img.src = svg64;
}

function Donut({ spec }: { spec: VizSpec }) {
  const total = spec.series.reduce((s, d) => s + d.value, 0) || 1;
  const cx = 150;
  const cy = 150;
  const r = 110;
  const inner = 66;
  let angle = -Math.PI / 2;
  const arcs = spec.series.map((d) => {
    const frac = d.value / total;
    const a0 = angle;
    const a1 = angle + frac * Math.PI * 2;
    angle = a1;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const xi1 = cx + inner * Math.cos(a1);
    const yi1 = cy + inner * Math.sin(a1);
    const xi0 = cx + inner * Math.cos(a0);
    const yi0 = cy + inner * Math.sin(a0);
    const path = `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} L ${xi1} ${yi1} A ${inner} ${inner} 0 ${large} 0 ${xi0} ${yi0} Z`;
    return { path, d, pct: Math.round(frac * 100) };
  });
  return (
    <svg viewBox="0 0 640 320" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
      <rect width="640" height="320" fill={PAPER} />
      <g>
        {arcs.map((a, i) => (
          <path key={i} d={a.path} fill={a.d.color} stroke={PAPER} strokeWidth={1.5} />
        ))}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="13" fontWeight="600" fill={INK} fontFamily="Inter, system-ui, sans-serif">
          {fmt(total)}
        </text>
        <text x={cx} y={cy + 13} textAnchor="middle" fontSize="9" fill={MUTED} fontFamily="Inter, system-ui, sans-serif" letterSpacing="0.06em">
          {spec.unit.toUpperCase()}
        </text>
      </g>
      <g transform="translate(320, 56)">
        {spec.series.map((d, i) => (
          <g key={i} transform={`translate(0, ${i * 30})`}>
            <rect width="12" height="12" rx="2" y="-10" fill={d.color} />
            <text x="20" y="0" fontSize="13" fill={INK} fontFamily="Inter, system-ui, sans-serif">
              {d.label}
            </text>
            <text x="20" y="15" fontSize="11" fill={MUTED} fontFamily="Inter, system-ui, sans-serif">
              {fmt(d.value)} {spec.unit} · {arcs[i].pct}%
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

function Bars({ spec }: { spec: VizSpec }) {
  const max = Math.max(...spec.series.map((d) => d.value), 1);
  const rowH = 34;
  const top = 14;
  const labelW = 210;
  const barW = 360;
  const height = top + spec.series.length * rowH + 14;
  return (
    <svg viewBox={`0 0 640 ${height}`} xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
      <rect width="640" height={height} fill={PAPER} />
      {spec.series.map((d, i) => {
        const y = top + i * rowH;
        const w = Math.max(2, (d.value / max) * barW);
        return (
          <g key={i}>
            <text x={labelW - 8} y={y + 15} textAnchor="end" fontSize="12.5" fill={INK} fontFamily="Inter, system-ui, sans-serif">
              {d.label.length > 26 ? d.label.slice(0, 25) + "…" : d.label}
            </text>
            <rect x={labelW} y={y + 4} width={barW} height="16" rx="3" fill="#e6e3db" />
            <rect x={labelW} y={y + 4} width={w} height="16" rx="3" fill={d.color} />
            <text x={labelW + w + 8} y={y + 16} fontSize="11.5" fontWeight="600" fill={MUTED} fontFamily="Inter, system-ui, sans-serif">
              {fmt(d.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Line({ spec }: { spec: VizSpec }) {
  const W = 640;
  const H = 300;
  const padL = 56;
  const padR = 24;
  const padT = 20;
  const padB = 54;
  const max = Math.max(...spec.series.map((d) => d.value), 1);
  const n = spec.series.length;
  const x = (i: number) => padL + (i * (W - padL - padR)) / Math.max(1, n - 1);
  const y = (v: number) => padT + (1 - v / max) * (H - padT - padB);
  const stroke = "#2E7573";
  const pts = spec.series.map((d, i) => `${x(i)},${y(d.value)}`).join(" ");
  const area = `${padL},${y(0)} ${pts} ${x(n - 1)},${y(0)}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
      <rect width={W} height={H} fill={PAPER} />
      {[0, 0.5, 1].map((f, i) => {
        const gy = padT + (1 - f) * (H - padT - padB);
        return (
          <g key={i}>
            <line x1={padL} y1={gy} x2={W - padR} y2={gy} stroke="#e6e3db" strokeWidth="1" />
            <text x={padL - 8} y={gy + 4} textAnchor="end" fontSize="10" fill={MUTED} fontFamily="Inter, system-ui, sans-serif">
              {fmt(Math.round(max * f * 100) / 100)}
            </text>
          </g>
        );
      })}
      <polygon points={area} fill="rgba(46,117,115,0.10)" />
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {spec.series.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(d.value)} r="3.5" fill={stroke} stroke={PAPER} strokeWidth="1.5" />
          <text x={x(i)} y={H - padB + 18} textAnchor="middle" fontSize="10" fill={INK} fontFamily="Inter, system-ui, sans-serif">
            {d.label.length > 10 ? d.label.slice(0, 9) + "…" : d.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function VizChart({ spec }: { spec: VizSpec }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const download = () => {
    const svg = wrapRef.current?.querySelector("svg");
    if (svg) downloadPng(svg as SVGSVGElement, `${spec.id}.png`);
  };
  return (
    <figure className="mt-4 rounded-[10px] border border-line bg-paper overflow-hidden">
      <figcaption className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-1">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-teal font-semibold">
            {spec.title}
          </span>
          {spec.note && (
            <p className="font-mono text-[9.5px] uppercase tracking-[0.13em] text-muted mt-1">{spec.note}</p>
          )}
        </div>
        <button
          type="button"
          onClick={download}
          className="shrink-0 inline-flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted hover:text-deep-teal active:scale-[0.97] transition-[transform,color] duration-150"
        >
          <Download size={12} strokeWidth={1.8} /> PNG
        </button>
      </figcaption>
      <div ref={wrapRef} className="px-3 pb-3">
        {spec.kind === "donut" ? <Donut spec={spec} /> : spec.kind === "line" ? <Line spec={spec} /> : <Bars spec={spec} />}
      </div>
    </figure>
  );
}
