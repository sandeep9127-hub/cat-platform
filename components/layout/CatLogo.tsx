/* eslint-disable @next/next/no-img-element */

/**
 * Official CAT symbol — symbol-only crop of the full lockup at
 * `/images/cat-symbol-official.svg`. Used in the header at small sizes.
 * The full lockup with the wordmark lives in the footer.
 */
export function CatLogo({
  className,
  size = 36,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <img
      src="/images/cat-symbol-official.svg"
      alt="Consortium for Agroecological Transformations"
      width={size}
      height={size}
      className={className}
      decoding="async"
    />
  );
}
