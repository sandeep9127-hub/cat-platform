import {
  Sprout,
  Trees,
  Beef,
  Fish,
  Droplets,
  Flower2,
  Apple,
  Store,
  Zap,
  GraduationCap,
  Tag,
  type LucideIcon,
} from "lucide-react";

/** One icon per intervention-category slug. Single source of truth so the
 *  landing grid, Atlas rows and anywhere else stay consistent. */
const CATEGORY_ICON: Record<string, LucideIcon> = {
  "agri-horti-agroforestry": Sprout,
  "forestry-ntfp": Trees,
  livestock: Beef,
  fisheries: Fish,
  nrm: Droplets,
  biodiversity: Flower2,
  nutrition: Apple,
  market: Store,
  energy: Zap,
  "technical-assistance": GraduationCap,
};

export function categoryIconFor(slug: string): LucideIcon {
  return CATEGORY_ICON[slug] ?? Tag;
}

export function CategoryIcon({
  slug,
  size = 16,
  color,
  strokeWidth = 1.8,
  className,
}: {
  slug: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}) {
  const Icon = categoryIconFor(slug);
  return <Icon size={size} strokeWidth={strokeWidth} color={color} className={className} aria-hidden />;
}
