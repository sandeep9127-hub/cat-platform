/**
 * Decorative botanical sprigs used at section corners to echo the
 * agroecologyindia.org watercolour framing. SVG, low opacity, aria-hidden.
 *
 * Four variants positioned at corners. Use sparingly — these are ambient,
 * not informational.
 */

type SprigProps = {
  variant?: "wheat" | "grass" | "leafy" | "fern";
  className?: string;
  flip?: boolean;
};

export function Sprig({ variant = "wheat", className, flip }: SprigProps) {
  const transform = flip ? "scaleX(-1)" : undefined;
  return (
    <svg
      aria-hidden
      width="140"
      height="200"
      viewBox="0 0 140 200"
      fill="none"
      className={className}
      style={{ transform }}
    >
      {variant === "wheat" && (
        <g stroke="#929CC5" strokeOpacity="0.55" strokeWidth="1.2" strokeLinecap="round" fill="none">
          <path d="M70 195 C70 160, 68 130, 70 100 C72 70, 70 40, 72 12" />
          {Array.from({ length: 11 }).map((_, i) => {
            const y = 30 + i * 14;
            const dx = 11 + (i % 2) * 3;
            return (
              <g key={i}>
                <path d={`M70 ${y} C${70 - dx} ${y - 3}, ${70 - dx - 4} ${y + 4}, ${70 - dx - 7} ${y + 9}`} />
                <path d={`M70 ${y} C${70 + dx} ${y - 3}, ${70 + dx + 4} ${y + 4}, ${70 + dx + 7} ${y + 9}`} />
              </g>
            );
          })}
        </g>
      )}
      {variant === "grass" && (
        <g stroke="#7A8C7A" strokeOpacity="0.42" strokeWidth="1.2" strokeLinecap="round" fill="none">
          {Array.from({ length: 9 }).map((_, i) => {
            const x = 20 + i * 12;
            const sway = (i % 3) - 1;
            return (
              <path
                key={i}
                d={`M${x} 200 Q${x + sway * 6} 130, ${x + sway * 14} ${30 + (i % 4) * 12}`}
              />
            );
          })}
        </g>
      )}
      {variant === "leafy" && (
        <g fill="#C68C2E" fillOpacity="0.18" stroke="#C68C2E" strokeOpacity="0.45" strokeWidth="1">
          <path d="M70 195 Q60 150, 72 100 Q60 60, 75 15" fill="none" />
          {[
            [40, 60],
            [100, 80],
            [38, 110],
            [102, 130],
            [44, 160],
            [98, 175],
          ].map(([cx, cy], i) => (
            <ellipse key={i} cx={cx} cy={cy} rx="14" ry="7" transform={`rotate(${i % 2 ? 30 : -30} ${cx} ${cy})`} />
          ))}
        </g>
      )}
      {variant === "fern" && (
        <g stroke="#2E7573" strokeOpacity="0.40" strokeWidth="1" strokeLinecap="round" fill="none">
          <path d="M70 195 Q60 130, 72 75 Q66 40, 78 8" />
          {Array.from({ length: 10 }).map((_, i) => {
            const y = 30 + i * 16;
            const len = 18 - i * 1.2;
            return (
              <g key={i}>
                <path d={`M70 ${y} q-${len} -3 -${len + 4} -${len * 0.5}`} />
                <path d={`M70 ${y} q${len} -3 ${len + 4} -${len * 0.5}`} />
              </g>
            );
          })}
        </g>
      )}
    </svg>
  );
}
