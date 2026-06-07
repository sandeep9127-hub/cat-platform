import Link from "next/link";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <main className="relative z-10 max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-16 sm:pt-24 lg:pt-32 pb-32 min-h-[60vh]">
      <div className="reveal-stagger max-w-[60ch]">
        <span className="eyebrow">404 · Not in the library</span>
        <h1 className="font-sans font-semibold text-[clamp(40px,5vw,72px)] leading-[1.0] tracking-[-0.04em] text-ink mt-5">
          We don&apos;t have this <span className="text-teal">page</span> in the library.
        </h1>
        <p className="text-[18px] sm:text-[20px] text-ink-soft leading-[1.55] mt-6">
          Either the page never existed, or the slug changed in a recent revision. The library
          is small enough that you can find your way back from the landing.
        </p>
        <div className="mt-10 flex flex-wrap gap-3.5">
          <Link
            href="/"
            className="font-mono text-[11px] uppercase tracking-[0.16em] text-deep-teal border-b-2 border-amber pb-1 hover:border-amber-deep transition-colors"
          >
            ← Back to the landing
          </Link>
          <Link
            href="/map"
            className="font-mono text-[11px] uppercase tracking-[0.16em] text-teal border-b-2 border-line-soft pb-1 hover:border-teal transition-colors"
          >
            Browse the Solutions Atlas
          </Link>
          <Link
            href="/agent"
            className="font-mono text-[11px] uppercase tracking-[0.16em] text-teal border-b-2 border-line-soft pb-1 hover:border-teal transition-colors"
          >
            Ask the Hub
          </Link>
        </div>
      </div>
    </main>
  );
}
