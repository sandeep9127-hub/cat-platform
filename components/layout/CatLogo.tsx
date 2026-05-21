/**
 * Official CAT symbol — inline SVG with the exact paths from
 * `/public/images/cat-symbol-official.svg`. Two periwinkle leaf wings
 * + four nested teal arches.
 *
 * Polish: each arch gets its own subtle vertical gradient (lighter
 * teal at the top, deeper teal at the bottom of the arch). The wings
 * get a complementary periwinkle gradient. The shapes are still the
 * brand asset — same fills, just with depth. A soft drop shadow lifts
 * the whole mark off the page.
 *
 * Each instance generates its own gradient IDs (suffix appended) so
 * multiple CatLogo components on the same page don't collide.
 */
export function CatLogo({
  className,
  size = 36,
  idSuffix = "cat",
}: {
  className?: string;
  size?: number;
  /** Unique suffix for the SVG gradient IDs. Defaults to "cat". */
  idSuffix?: string;
}) {
  const teal = `tealGrad-${idSuffix}`;
  const wing = `wingGrad-${idSuffix}`;
  const glow = `glow-${idSuffix}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 84 83"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Consortium for Agroecological Transformations"
      className={className}
    >
      <defs>
        {/* Teal arch gradient — top lighter, bottom deeper */}
        <linearGradient id={teal} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3A8E8B" />
          <stop offset="60%" stopColor="#2D7574" />
          <stop offset="100%" stopColor="#1F5957" />
        </linearGradient>
        {/* Periwinkle wing gradient — top lavender, bottom slate */}
        <linearGradient id={wing} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7C85A8" />
          <stop offset="100%" stopColor="#535C82" />
        </linearGradient>
        {/* Soft drop shadow */}
        <filter id={glow} x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow
            dx="0"
            dy="0.8"
            stdDeviation="0.6"
            floodColor="#1F3534"
            floodOpacity="0.18"
          />
        </filter>
      </defs>
      <g filter={`url(#${glow})`}>
        {/* Periwinkle wings — left + right */}
        <path
          fill={`url(#${wing})`}
          d="M42.0731 82.9996C18.8713 82.9996 0 64.3798 0 41.4996C0 40.1814 0.0688313 38.8348 0.200758 37.4826L0.321213 36.2266H1.60033C27.8021 36.3171 50.8491 53.794 57.6577 78.7223L57.9904 79.9388L56.7916 80.3801C52.0824 82.117 47.1265 82.9996 42.0731 82.9996ZM2.89092 39.0215C2.83356 39.8532 2.81061 40.6849 2.81061 41.4996C2.81061 62.8522 20.4257 80.2273 42.0731 80.2273C46.3579 80.2273 50.5623 79.5484 54.589 78.2131C47.8263 55.548 26.8557 39.6552 2.89092 39.0215Z"
        />
        <path
          fill={`url(#${wing})`}
          d="M42.0731 82.9996C37.0198 82.9996 32.0639 82.117 27.3547 80.3801L26.1559 79.9388L26.4886 78.7223C33.2914 53.7884 56.3442 36.3171 82.546 36.2266H83.8251L83.9455 37.4826C84.0774 38.8405 84.1463 40.1927 84.1463 41.4996C84.1463 64.3798 65.275 82.9996 42.0731 82.9996ZM29.5516 78.2131C33.5839 79.554 37.7884 80.2273 42.0731 80.2273C63.7206 80.2273 81.3357 62.8522 81.3357 41.4996C81.3357 40.6906 81.307 39.8589 81.2554 39.0215C57.2906 39.6552 36.32 55.548 29.5573 78.2131H29.5516Z"
        />
        {/* Teal arches — outermost to innermost */}
        <path
          fill={`url(#${teal})`}
          d="M4.28473 31.0387C9.01688 14.3652 24.4236 2.77232 42.0731 2.77232C59.7226 2.77232 74.8139 14.1502 79.7124 30.5295C80.6302 30.3824 81.5651 30.241 82.523 30.1165C77.3951 12.3623 60.8526 0 42.0731 0C23.2936 0 6.38409 12.6056 1.45691 30.6993C2.21979 30.7728 3.17196 30.886 4.28473 31.0444V31.0387Z"
        />
        <path
          fill={`url(#${teal})`}
          d="M42.0101 8.54297C26.8729 8.54297 14.0416 18.4441 9.80847 32.0229C10.6861 32.2096 11.5981 32.4189 12.5503 32.6565C16.4851 20.3055 28.2036 11.3153 42.0043 11.3153C55.805 11.3153 67.2482 20.0962 71.315 32.2322C72.2098 32.0115 73.1275 31.7965 74.0625 31.5929C69.6975 18.2348 56.9809 8.54297 42.0043 8.54297H42.0101Z"
        />
        <path
          fill={`url(#${teal})`}
          d="M42.01 17.624C31.0716 17.624 21.7851 24.6397 18.4755 34.3428C19.3416 34.6257 20.2307 34.9256 21.1255 35.2481C24.0508 26.6312 32.2991 20.3963 42.0043 20.3963C51.7095 20.3963 59.6653 26.4219 62.7225 34.8124C63.5772 34.5069 64.4663 34.2071 65.3783 33.9185C61.9424 24.4417 52.7764 17.6297 42.0043 17.6297L42.01 17.624Z"
        />
        <path
          fill={`url(#${teal})`}
          d="M42.01 26.9307C35.0351 26.9307 29.1156 31.423 27.0392 37.6296C27.8881 38.0086 28.737 38.416 29.5974 38.8403C31.192 33.5616 36.1479 29.703 42.01 29.703C47.8721 29.703 52.5297 33.341 54.2677 38.3821C55.0765 37.9804 55.9197 37.5787 56.8087 37.1826C54.6004 31.2136 48.8071 26.9363 42.01 26.9363V26.9307Z"
        />
      </g>
    </svg>
  );
}
