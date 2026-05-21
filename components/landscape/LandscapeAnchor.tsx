import Image from "next/image";
import type { LandscapePhoto } from "@/lib/data/landscapes";

/**
 * Wide editorial anchor strip used in the landscape hero. Single photograph,
 * 5:2 aspect, soft paper-fade at top and bottom edges so the image dissolves
 * into the page instead of sitting in a hard frame.
 *
 * Captions are required — every documentary image carries place, credit, and
 * date. Treated as a primary source, not decoration.
 */
type Props = {
  photo: LandscapePhoto;
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

export function LandscapeAnchor({ photo }: Props) {
  return (
    <figure className="relative overflow-hidden rounded-[10px] border border-line">
      <div
        className="relative w-full bg-deep-teal"
        style={{ aspectRatio: "5 / 2" }}
      >
        <Image
          src={photo.src}
          alt={photo.alt ?? photo.caption}
          fill
          sizes="(min-width: 1024px) 1080px, 100vw"
          className="object-cover"
          priority
        />
        {/* Soft top + bottom paper fade so the image dissolves into the page */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-16 pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(251,248,242,0.55) 0%, transparent 100%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
          style={{
            background:
              "linear-gradient(0deg, rgba(26,38,37,0.55) 0%, rgba(26,38,37,0.20) 50%, transparent 100%)",
          }}
        />
        {/* Amber hairline */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(248,202,124,0.7) 50%, transparent 100%)",
          }}
        />
        {/* Caption block, bottom-left */}
        <figcaption className="absolute bottom-4 left-5 sm:left-7 lg:left-10 right-5 max-w-[64ch]">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-paper/85 drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)] inline-flex items-center gap-2">
            <span className="inline-block w-4 h-px bg-amber" />
            Anchor photograph
          </span>
          <p className="font-sans text-[14px] sm:text-[15px] text-paper mt-1.5 leading-snug drop-shadow-[0_1px_4px_rgba(0,0,0,0.45)]">
            {photo.caption}
          </p>
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-paper/70 mt-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
            {photo.credit} · {formatDate(photo.date)}
          </p>
        </figcaption>
      </div>
    </figure>
  );
}
