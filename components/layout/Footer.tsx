import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/**
 * Footer.
 *
 * Editor flagged two things:
 *   - The CAT lockup was invisible — it used cat-logo-full.svg (navy
 *     wordmark) on a dark-teal background. Wrong polarity. Replaced
 *     with an inline SVG that draws the brand symbol in light colours
 *     (cream arches + amber leaf accents + lavender wings) and a
 *     cream typographic wordmark beside it.
 *   - No outbound link to the parent organisation. Added a prominent
 *     "Visit agroecologyindia.org" anchor under the lockup.
 */
export function Footer() {
  return (
    <footer className="relative text-cream pt-16 pb-8 mt-32 overflow-hidden bg-deep-teal">
      {/* Layered editorial gradient: warm amber bloom top-left + cooler teal bottom-right */}
      <div
        className="absolute inset-0 pointer-events-none opacity-90"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 8% -10%, rgba(248,202,124,0.18), transparent 60%), radial-gradient(ellipse 70% 60% at 100% 110%, rgba(46,117,115,0.45), transparent 65%)",
        }}
      />
      <div
        className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber to-transparent"
        aria-hidden
      />

      <div className="relative max-w-page mx-auto px-5 sm:px-7 lg:px-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[2.2fr_1fr_1fr_1fr] gap-10 lg:gap-12">
        <div>
          {/* Light-variant CAT lockup */}
          <div className="flex items-start gap-4">
            <CatLogoLight size={62} />
            <div className="pt-1">
              <div className="font-sans font-semibold text-cream text-[15.5px] leading-[1.2] tracking-[-0.01em]">
                Consortium for
                <br />
                Agroecological Transformations
              </div>
              <a
                href="https://agroecologyindia.org"
                target="_blank"
                rel="noreferrer"
                className="group mt-3 inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-amber hover:text-cream transition-colors"
              >
                <span>agroecologyindia.org</span>
                <ArrowUpRight
                  size={11}
                  strokeWidth={2}
                  className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden
                />
              </a>
            </div>
          </div>

          <h3 className="mt-9 font-sans text-[26px] sm:text-[30px] font-normal leading-[1.2] tracking-[-0.02em] max-w-[22ch]">
            A quiet, <em className="text-amber not-italic font-medium italic">honest</em> record
            of food systems work in India.
          </h3>
          <p className="mt-4 text-[13px] leading-[1.6] text-cream/75 max-w-[40ch]">
            Run by the Consortium for Agroecological Transformations. Open to contributions from
            credible food-systems organisations who can stand behind what they publish.
          </p>
        </div>

        <FooterCol
          title="Explore"
          links={[
            { href: "/principles", label: "Principles" },
            { href: "/landscapes", label: "Landscapes" },
            { href: "/map", label: "Solutions Atlas" },
            { href: "/organizations", label: "Organizations Atlas" },
            { href: "/agent", label: "Ask the Hub" },
          ]}
        />
        <FooterCol
          title="About"
          links={[
            { href: "/about", label: "About CAT" },
            { href: "/editors", label: "Editors" },
            { href: "/funders", label: "Funders" },
            { href: "/contact", label: "Contact" },
          ]}
          external={[
            { href: "https://agroecologyindia.org", label: "agroecologyindia.org" },
          ]}
        />
      </div>

      <div className="relative max-w-page mx-auto mt-14 px-5 sm:px-7 lg:px-10 pt-6">
        <div
          className="h-px w-full bg-gradient-to-r from-transparent via-amber/50 to-transparent"
          aria-hidden
        />
        <div className="pt-5 flex flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-between font-mono text-[10px] uppercase tracking-mono-mid text-cream/50">
          <span>Transformation Hub · Vol. 01 · 2026</span>
          <span>Made in India · For food systems</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
  external,
}: {
  title: string;
  links: { href: string; label: string }[];
  external?: { href: string; label: string }[];
}) {
  return (
    <div>
      <h4 className="font-mono text-[10.5px] uppercase tracking-mono-wide text-amber mb-3.5 font-semibold inline-flex items-center gap-2">
        <span className="w-3 h-px bg-amber" />
        {title}
      </h4>
      <ul className="space-y-2.5 list-none p-0">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="footer-link relative inline-block text-[13.5px] text-cream/85 hover:text-amber transition-colors"
            >
              {l.label}
            </Link>
          </li>
        ))}
        {external?.map((l) => (
          <li key={l.href}>
            <a
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-1.5 text-[13.5px] text-cream/85 hover:text-amber transition-colors"
            >
              <span>{l.label}</span>
              <ArrowUpRight
                size={11}
                strokeWidth={2}
                className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden
              />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Light-variant CAT symbol for dark backgrounds. Same six paths as
 * components/layout/CatLogo.tsx, but the arches are cream + amber and
 * the wings are lavender for visibility on dark teal.
 */
function CatLogoLight({ size = 62 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 84 83"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Consortium for Agroecological Transformations"
    >
      <defs>
        <linearGradient id="archCreamGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F8CA7C" />
          <stop offset="60%" stopColor="#E0B66E" />
          <stop offset="100%" stopColor="#C68C2E" />
        </linearGradient>
        <linearGradient id="wingLavGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C9CFE3" />
          <stop offset="100%" stopColor="#929CC5" />
        </linearGradient>
      </defs>
      {/* Lavender wings (was periwinkle on light bg) */}
      <path
        fill="url(#wingLavGrad)"
        d="M42.0731 82.9996C18.8713 82.9996 0 64.3798 0 41.4996C0 40.1814 0.0688313 38.8348 0.200758 37.4826L0.321213 36.2266H1.60033C27.8021 36.3171 50.8491 53.794 57.6577 78.7223L57.9904 79.9388L56.7916 80.3801C52.0824 82.117 47.1265 82.9996 42.0731 82.9996ZM2.89092 39.0215C2.83356 39.8532 2.81061 40.6849 2.81061 41.4996C2.81061 62.8522 20.4257 80.2273 42.0731 80.2273C46.3579 80.2273 50.5623 79.5484 54.589 78.2131C47.8263 55.548 26.8557 39.6552 2.89092 39.0215Z"
      />
      <path
        fill="url(#wingLavGrad)"
        d="M42.0731 82.9996C37.0198 82.9996 32.0639 82.117 27.3547 80.3801L26.1559 79.9388L26.4886 78.7223C33.2914 53.7884 56.3442 36.3171 82.546 36.2266H83.8251L83.9455 37.4826C84.0774 38.8405 84.1463 40.1927 84.1463 41.4996C84.1463 64.3798 65.275 82.9996 42.0731 82.9996ZM29.5516 78.2131C33.5839 79.554 37.7884 80.2273 42.0731 80.2273C63.7206 80.2273 81.3357 62.8522 81.3357 41.4996C81.3357 40.6906 81.307 39.8589 81.2554 39.0215C57.2906 39.6552 36.32 55.548 29.5573 78.2131H29.5516Z"
      />
      {/* Cream/amber arches (was teal on light bg) */}
      <path
        fill="url(#archCreamGrad)"
        d="M4.28473 31.0387C9.01688 14.3652 24.4236 2.77232 42.0731 2.77232C59.7226 2.77232 74.8139 14.1502 79.7124 30.5295C80.6302 30.3824 81.5651 30.241 82.523 30.1165C77.3951 12.3623 60.8526 0 42.0731 0C23.2936 0 6.38409 12.6056 1.45691 30.6993C2.21979 30.7728 3.17196 30.886 4.28473 31.0444V31.0387Z"
      />
      <path
        fill="url(#archCreamGrad)"
        d="M42.0101 8.54297C26.8729 8.54297 14.0416 18.4441 9.80847 32.0229C10.6861 32.2096 11.5981 32.4189 12.5503 32.6565C16.4851 20.3055 28.2036 11.3153 42.0043 11.3153C55.805 11.3153 67.2482 20.0962 71.315 32.2322C72.2098 32.0115 73.1275 31.7965 74.0625 31.5929C69.6975 18.2348 56.9809 8.54297 42.0043 8.54297H42.0101Z"
      />
      <path
        fill="url(#archCreamGrad)"
        d="M42.01 17.624C31.0716 17.624 21.7851 24.6397 18.4755 34.3428C19.3416 34.6257 20.2307 34.9256 21.1255 35.2481C24.0508 26.6312 32.2991 20.3963 42.0043 20.3963C51.7095 20.3963 59.6653 26.4219 62.7225 34.8124C63.5772 34.5069 64.4663 34.2071 65.3783 33.9185C61.9424 24.4417 52.7764 17.6297 42.0043 17.6297L42.01 17.624Z"
      />
      <path
        fill="url(#archCreamGrad)"
        d="M42.01 26.9307C35.0351 26.9307 29.1156 31.423 27.0392 37.6296C27.8881 38.0086 28.737 38.416 29.5974 38.8403C31.192 33.5616 36.1479 29.703 42.01 29.703C47.8721 29.703 52.5297 33.341 54.2677 38.3821C55.0765 37.9804 55.9197 37.5787 56.8087 37.1826C54.6004 31.2136 48.8071 26.9363 42.01 26.9363V26.9307Z"
      />
    </svg>
  );
}
