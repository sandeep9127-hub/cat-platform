/**
 * Re-mounts on every navigation within the public site, so each route gets a
 * quick opacity fade-in (`.route-fade`, ~220ms, opacity-only). Kept gentle and
 * safe under reduced motion. Layout chrome (BrandBar/Footer) lives in layout.tsx
 * and stays put; only the page body crossfades.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="route-fade">{children}</div>;
}
