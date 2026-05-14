/* eslint-disable @next/next/no-img-element */

/**
 * Official CAT logo. Symbol-only crop for the brand bar (the wordmark is
 * rendered alongside as live text). Full lockup available at
 * `/images/cat-logo-full.svg` for footers / off-brand surfaces.
 */
export function CatLogo({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <img
      src="/images/cat-symbol.svg"
      alt="Consortium for Agroecological Transformations"
      width={size}
      height={size}
      className={className}
      decoding="async"
    />
  );
}
