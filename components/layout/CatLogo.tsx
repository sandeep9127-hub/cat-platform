/**
 * CAT mark, rendered inline as SVG so individual paths can animate. Three
 * concentric arches and two crossed leaves. The arches stagger-pulse on
 * hover when a parent has the `group` class — see globals.css `.cat-arch-*`.
 */
export function CatLogo({
  className,
  size = 36,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      role="img"
      aria-label="Consortium for Agroecological Transformations"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
    >
      <g strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path
          d="M9 30 A 23 23 0 0 1 55 30"
          stroke="#334B4A"
          strokeWidth="2.6"
          className="cat-arch cat-arch-3"
        />
        <path
          d="M16 30 A 16 16 0 0 1 48 30"
          stroke="#2E7573"
          strokeWidth="2.6"
          className="cat-arch cat-arch-2"
        />
        <path
          d="M24 30 A 8 8 0 0 1 40 30"
          stroke="#929CC5"
          strokeWidth="2.6"
          className="cat-arch cat-arch-1"
        />
        <path
          d="M32 33 C 22 38, 20 50, 28 58 C 32 53, 34 46, 32 33 Z"
          stroke="#929CC5"
          strokeWidth="2.4"
          className="cat-leaf cat-leaf-left"
        />
        <path
          d="M32 33 C 42 38, 44 50, 36 58 C 32 53, 30 46, 32 33 Z"
          stroke="#929CC5"
          strokeWidth="2.4"
          className="cat-leaf cat-leaf-right"
        />
      </g>
    </svg>
  );
}
