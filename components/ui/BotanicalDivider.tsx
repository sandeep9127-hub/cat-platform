/**
 * Editorial section divider — a tapered sage hairline with a small 3-leaf
 * cluster centred. Used in place of plain `border-t` rules to match the
 * agroecologyindia.org motif. Decorative only, `aria-hidden`.
 */
type Props = {
  /** Optional max width in pixels. Default 320. */
  width?: number;
  className?: string;
};

export function BotanicalDivider({ width = 320, className }: Props) {
  return (
    <div
      role="presentation"
      aria-hidden
      className={`mx-auto flex items-center justify-center ${className ?? ""}`}
      style={{ maxWidth: width }}
    >
      <span
        className="flex-1 h-px"
        style={{
          background:
            "linear-gradient(to right, transparent 0%, rgba(159,184,166,0.55) 50%, rgba(159,184,166,0.7) 100%)",
        }}
      />
      <svg
        width="36"
        height="22"
        viewBox="0 0 36 22"
        fill="none"
        className="mx-3 shrink-0"
      >
        <g stroke="#7A9683" strokeWidth="1.1" strokeLinecap="round" fill="none">
          {/* central leaf */}
          <path d="M18 3 C 14.5 7, 14.5 14, 18 19 C 21.5 14, 21.5 7, 18 3 Z" fill="rgba(159,184,166,0.20)" />
          <path d="M18 5 L 18 17" stroke="rgba(122,150,131,0.55)" />
          {/* side leaves */}
          <path
            d="M8 10 C 5 9, 3 12, 5 15 C 8.5 14.5, 9.5 12.5, 8 10 Z"
            fill="rgba(159,184,166,0.18)"
          />
          <path
            d="M28 10 C 31 9, 33 12, 31 15 C 27.5 14.5, 26.5 12.5, 28 10 Z"
            fill="rgba(159,184,166,0.18)"
          />
        </g>
      </svg>
      <span
        className="flex-1 h-px"
        style={{
          background:
            "linear-gradient(to right, rgba(159,184,166,0.7) 0%, rgba(159,184,166,0.55) 50%, transparent 100%)",
        }}
      />
    </div>
  );
}
