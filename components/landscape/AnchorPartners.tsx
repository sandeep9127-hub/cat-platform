import Link from "next/link";
import { SectionOpener } from "@/components/ui/SectionOpener";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { ANCHORS } from "@/lib/data/anchors";

/**
 * Anchor-partners logo wall for the landscapes index. Mirrors the landing-page
 * Supporters band: a single white panel so the logos' white backgrounds blend.
 * Each logo links to the landscape that org anchors.
 */
export function AnchorPartners() {
  const items = Object.entries(ANCHORS)
    .map(([slug, a]) => ({ slug, a, landscape: LANDSCAPES[slug]?.name ?? slug }))
    .sort((x, y) => x.landscape.localeCompare(y.landscape));

  return (
    <section
      className="relative overflow-hidden border-y border-line py-16 lg:py-24"
      style={{
        background:
          "linear-gradient(180deg, rgba(232,240,234,0.50) 0%, rgba(232,240,234,0.20) 100%)",
      }}
    >
      <div
        aria-hidden
        className="absolute top-0 left-0 right-0 h-16 pointer-events-none"
        style={{ background: "linear-gradient(180deg, rgba(251,248,242,0.65) 0%, transparent 100%)" }}
      />
      <div
        aria-hidden
        className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
        style={{ background: "linear-gradient(0deg, rgba(251,248,242,0.65) 0%, transparent 100%)" }}
      />

      <div className="relative max-w-page mx-auto px-5 sm:px-7 lg:px-10 text-center">
        <SectionOpener label="Anchor partners" align="centre" />
        <h2 className="font-sans text-[clamp(28px,3.2vw,40px)] font-light text-[color:var(--navy-teal)] mt-5 tracking-[-0.022em] leading-[1.18] max-w-[34ch] mx-auto">
          The lead organisations delivering each CAT landscape on the ground
        </h2>
        <p className="font-sans italic text-[15px] text-ink-soft mt-4 max-w-[52ch] mx-auto leading-[1.6] font-light">
          One anchor partner per landscape. Tap a logo to open that landscape.
        </p>
      </div>

      <div className="relative max-w-page mx-auto px-5 sm:px-7 lg:px-10 mt-12">
        <ul
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-12 list-none p-0 rounded-[14px] bg-white border border-line/60 px-6 sm:px-10 py-12 sm:py-16"
          style={{ boxShadow: "0 1px 2px rgba(26,38,37,0.04), 0 18px 40px -28px rgba(26,38,37,0.18)" }}
        >
          {items.map(({ slug, a, landscape }, i) => (
            <li
              key={slug}
              className="group flex items-center justify-center reveal-stagger"
              style={{ animationDelay: `${i * 35}ms` }}
            >
              <Link
                href={`/landscape/${slug}`}
                title={`${a.name} · ${landscape}`}
                className="flex flex-col items-center gap-2.5 no-underline"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.logo}
                  alt={a.name}
                  loading="lazy"
                  className="max-h-[72px] sm:max-h-[80px] w-auto max-w-[90%] object-contain opacity-90 transition-opacity duration-300 group-hover:opacity-100"
                />
                <span className="font-mono text-[8.5px] uppercase tracking-[0.13em] text-muted group-hover:text-teal transition-colors text-center">
                  {landscape}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
