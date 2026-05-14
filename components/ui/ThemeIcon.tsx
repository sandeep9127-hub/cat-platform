/**
 * One icon per controlled-vocabulary theme. Single stroke, scales with
 * currentColor so it can be tinted by the theme's hex value.
 * Slugs match PRODUCT.md §10.1.
 */
type Props = { slug: string; size?: number; className?: string };

export function ThemeIcon({ slug, size = 22, className }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };

  switch (slug) {
    case "soil-land":
      return (
        <svg {...common}>
          <path d="M3 16h18" />
          <path d="M3 19h18" />
          <path d="M3 13h18" />
          <path d="M9 13c0-2.5 1.3-5 3-7 1.7 2 3 4.5 3 7" />
        </svg>
      );
    case "water":
      return (
        <svg {...common}>
          <path d="M12 3c-3 4-5 7.5-5 10.5a5 5 0 0 0 10 0C17 10.5 15 7 12 3z" />
          <path d="M9 14a3 3 0 0 0 3 3" />
        </svg>
      );
    case "seeds-biodiversity":
      return (
        <svg {...common}>
          <path d="M12 21V11" />
          <path d="M12 11c-3 0-5-2.5-5-5 3 0 5 2 5 5z" />
          <path d="M12 11c3 0 5-2.5 5-5-3 0-5 2-5 5z" />
          <path d="M9 19c-1.5 0-3-1-3-3 1.8 0 3 .8 3 3z" />
          <path d="M15 19c1.5 0 3-1 3-3-1.8 0-3 .8-3 3z" />
        </svg>
      );
    case "climate-resilience":
      return (
        <svg {...common}>
          <circle cx="17" cy="8" r="3" />
          <path d="M9 14c-2.5 0-4 1.8-4 4h14c0-2-1-3-2.5-3.5" />
          <path d="M17 11v2" />
          <path d="M14 8h-2" />
        </svg>
      );
    case "women-collectives":
      return (
        <svg {...common}>
          <circle cx="9" cy="10" r="3" />
          <circle cx="15" cy="10" r="3" />
          <circle cx="12" cy="16" r="3" />
        </svg>
      );
    case "markets-value-chains":
      return (
        <svg {...common}>
          <path d="M3 7l9-3 9 3" />
          <path d="M5 8v9" />
          <path d="M19 8v9" />
          <path d="M3 20h18" />
          <path d="M9 12h6" />
        </svg>
      );
    case "policy-governance":
      return (
        <svg {...common}>
          <path d="M4 8h16" />
          <path d="M6 8v10" />
          <path d="M12 8v10" />
          <path d="M18 8v10" />
          <path d="M4 18h16" />
          <path d="M3 8l9-5 9 5" />
        </svg>
      );
    case "knowledge-capacity":
      return (
        <svg {...common}>
          <path d="M4 5v13a1 1 0 0 0 1 1h6" />
          <path d="M20 5v13a1 1 0 0 1-1 1h-6" />
          <path d="M4 5a3 3 0 0 1 3-3h5v17" />
          <path d="M20 5a3 3 0 0 0-3-3h-5" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
        </svg>
      );
  }
}
