/**
 * Official CAT symbol — the brand mark (four nested teal arches over the two
 * periwinkle leaf-wings), cropped from the official logo lockup
 * (`/images/cat-logo.png`) into `/images/cat-logo-mark.png`. Rendered as a
 * square image so it drops cleanly into the header and standalone pages. For the
 * full lockup with the wordmark and byline, use `/images/cat-logo.png` directly.
 */
export function CatLogo({
  className,
  size = 36,
}: {
  className?: string;
  size?: number;
  /** Accepted for backwards-compatibility; no longer used. */
  idSuffix?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/cat-logo-mark.png"
      alt="Consortium for Agroecological Transformations"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}
