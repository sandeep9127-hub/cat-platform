import Link from "next/link";

/**
 * Body of the "page not found" screen. Used inside the public layout (so the
 * header and footer stay, see app/(public)/not-found.tsx) and by the root
 * fallback for paths outside it.
 */
export function NotFoundContent() {
  return (
    <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-16 sm:pt-24 lg:pt-28 pb-28 min-h-[50vh]">
      <div className="max-w-[60ch]">
        <span className="eyebrow">Page not found</span>
        <h1 className="font-sans font-semibold text-[clamp(36px,4.6vw,64px)] leading-[1.02] tracking-[-0.04em] text-ink mt-5">
          We couldn&apos;t find that page.
        </h1>
        <p className="text-[17px] sm:text-[19px] text-ink-soft leading-[1.55] mt-6">
          It may have moved, or the link may be mistyped. These are good places to pick up from.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link
            href="/landscapes"
            className="inline-flex items-center min-h-11 px-5 rounded-full bg-deep-teal text-paper text-[14px] font-medium hover:bg-teal active:scale-[0.98] transition-[transform,background-color] duration-150"
          >
            Explore the landscapes
          </Link>
          <Link
            href="/map"
            className="inline-flex items-center min-h-11 px-5 rounded-full border border-line text-ink text-[14px] hover:border-teal hover:text-teal transition-colors"
          >
            Solutions Atlas
          </Link>
          <Link
            href="/"
            className="inline-flex items-center min-h-11 px-5 rounded-full border border-line text-ink text-[14px] hover:border-teal hover:text-teal transition-colors"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
