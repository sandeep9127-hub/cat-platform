import Image from "next/image";
import type { LandscapePhoto } from "@/lib/data/landscapes";
import { SectionOpener } from "@/components/ui/SectionOpener";

/**
 * A captioned documentary gallery for a landscape. Editorial only — every
 * frame carries caption + credit + date. The layout adapts to portrait vs
 * landscape orientation so we never crop important content.
 */
type Props = {
  photos: LandscapePhoto[];
  landscapeName: string;
};

function formatDate(iso: string): string {
  const [y, m] = iso.split("-");
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const month = Number(m) >= 1 && Number(m) <= 12 ? monthNames[Number(m) - 1] : m;
  return `${month} ${y}`;
}

export function LandscapeFieldRecord({ photos, landscapeName }: Props) {
  if (photos.length === 0) return null;

  return (
    <section className="mt-14 lg:mt-20">
      <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10">
        <div className="mb-5">
          <SectionOpener number="04" label="Field record" />
        </div>
        <h2 className="font-sans text-[26px] sm:text-[30px] font-light tracking-[-0.022em] text-[color:var(--navy-teal)] leading-[1.18]">
          Photographs from {landscapeName}
        </h2>
        <p className="font-sans italic text-[15px] text-ink-soft leading-[1.6] mt-3 max-w-[58ch] font-light">
          Documentary frames from CAT field work in the landscape. Captioned and
          dated. Treated as primary source material, not decoration.
        </p>

        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mt-8 list-none p-0">
          {photos.map((p, i) => {
            const isPortrait = p.height > p.width;
            const aspect = isPortrait ? "3 / 4" : "4 / 3";
            return (
              <li key={p.src} className="reveal-stagger" style={{ animationDelay: `${i * 80}ms` }}>
                <figure
                  className="group relative overflow-hidden rounded-[8px] border border-line bg-paper transition-all duration-300 ease-out hover:-translate-y-0.5"
                  style={{
                    boxShadow: "0 1px 2px rgba(26,38,37,0.04), 0 10px 24px -16px rgba(46,117,115,0.20)",
                  }}
                >
                  <div className="relative w-full bg-cream" style={{ aspectRatio: aspect }}>
                    <Image
                      src={p.src}
                      alt={p.alt ?? p.caption}
                      fill
                      sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                    {/* Soft veil bottom-edge so caption strip blends */}
                    <div
                      aria-hidden
                      className="absolute inset-x-0 bottom-0 h-12 pointer-events-none"
                      style={{
                        background: "linear-gradient(0deg, rgba(26,38,37,0.25) 0%, transparent 100%)",
                      }}
                    />
                  </div>
                  <figcaption className="px-4 py-3">
                    <p className="font-sans text-[13.5px] text-[color:var(--navy-teal)] leading-snug">
                      {p.caption}
                    </p>
                    <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted mt-1.5 inline-flex items-center gap-1.5">
                      <span className="inline-block w-3 h-px bg-amber-deep" />
                      {p.credit}{p.date ? ` · ${formatDate(p.date)}` : ""}
                    </p>
                  </figcaption>
                </figure>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
