import type { LandscapePhoto } from "@/lib/data/landscapes";
import { SectionOpener } from "@/components/ui/SectionOpener";
import { LandscapeGallery } from "./LandscapeGallery";

/**
 * A captioned documentary gallery for a landscape. Editorial only — every
 * frame carries caption + credit + date. The grid, scroll-reveal and
 * click-to-zoom lightbox live in the client LandscapeGallery; this server
 * shell holds the section header.
 */
type Props = {
  photos: LandscapePhoto[];
  landscapeName: string;
};

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
          dated. Treated as primary source material, not decoration. Tap any frame to enlarge.
        </p>

        <LandscapeGallery photos={photos} />
      </div>
    </section>
  );
}
