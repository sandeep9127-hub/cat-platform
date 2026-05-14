/**
 * CAT logo — four concentric arches above two crossed leaf shapes.
 * Stroke colours match the official brand palette.
 */
export function CatLogo({ className, size = 34 }: { className?: string; size?: number }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Consortium for Agroecological Transformations"
    >
      {/* Concentric arches, darkest at top */}
      <g fill="none" strokeWidth="2.2" strokeLinecap="round">
        <path d="M9 30 A 23 23 0 0 1 55 30" stroke="#334B4A" />
        <path d="M14 30 A 18 18 0 0 1 50 30" stroke="#2E7573" />
        <path d="M19 30 A 13 13 0 0 1 45 30" stroke="#5E6E5A" opacity=".85" />
        <path d="M24 30 A 8 8 0 0 1 40 30" stroke="#7CA77B" opacity=".75" />
      </g>
      {/* Crossed leaves below the arches */}
      <g fill="none" stroke="#929CC5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M32 32 C 22 36, 18 46, 26 56 C 30 52, 34 46, 32 32 Z" />
        <path d="M32 32 C 42 36, 46 46, 38 56 C 34 52, 30 46, 32 32 Z" />
      </g>
    </svg>
  );
}
