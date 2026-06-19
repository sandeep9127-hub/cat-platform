import Link from "next/link";

type Tab = { href: string; label: string; available: boolean };

export function LandscapeTabs({
  slug,
  active,
  hasLip,
  hasClimate = false,
}: {
  slug: string;
  active: "profile" | "library" | "budget" | "insights" | "climate" | "ask";
  hasLip: boolean;
  hasClimate?: boolean;
}) {
  // Library tab removed from the nav (no longer a downloads surface); the route
  // and its data stay in the background. Keep "library" in the active union so
  // the library page itself still type-checks if linked directly.
  const tabs: Tab[] = [
    { href: `/landscape/${slug}`, label: "Profile", available: true },
    { href: `/landscape/${slug}/budget`, label: "Budget", available: hasLip },
    { href: `/landscape/${slug}/insights`, label: "Insights", available: hasLip },
    { href: `/landscape/${slug}/climate`, label: "Climate", available: hasClimate },
    { href: `/landscape/${slug}/ask`, label: "Ask", available: hasLip },
  ];

  return (
    <div className="sticky top-[57px] z-30 border-b border-line bg-paper/85 backdrop-blur-md">
      <nav
        aria-label="Landscape sections"
        className="max-w-page mx-auto px-5 sm:px-7 lg:px-10"
      >
      <ul className="flex gap-6 sm:gap-10 list-none p-0 m-0 overflow-x-auto">
        {tabs.map((t) => {
          const isActive = ((): boolean => {
            if (active === "profile") return t.label === "Profile";
            return t.label.toLowerCase() === active;
          })();
          const ariaCurrent = isActive ? "page" : undefined;
          const cls = `font-mono text-[11px] sm:text-[12px] uppercase tracking-[0.16em] py-4 px-1.5 rounded-[5px] inline-block border-b-2 transition-colors whitespace-nowrap focus-visible:bg-teal-wash focus-visible:text-deep-teal ${
            isActive
              ? "border-amber-deep text-deep-teal font-semibold"
              : t.available
                ? "border-transparent text-muted hover:text-deep-teal"
                : "border-transparent text-line cursor-not-allowed"
          }`;
          return (
            <li key={t.href}>
              {t.available ? (
                <Link href={t.href} className={cls} aria-current={ariaCurrent}>
                  {t.label}
                </Link>
              ) : (
                <span className={cls} title="Available when the investment plan is published">
                  {t.label} <span className="text-[9px] tracking-[0.14em] ml-1">soon</span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      </nav>
    </div>
  );
}
