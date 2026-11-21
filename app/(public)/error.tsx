"use client";

// Error boundary inside the public layout, so the header and footer stay.

import { useEffect } from "react";
import Link from "next/link";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Hook for Sentry / observability later
    console.error("[Transformation Hub] runtime error:", error);
  }, [error]);

  return (
    <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-16 pb-24 min-h-[60vh]">
      <div className="max-w-[60ch]">
        <span className="eyebrow text-red-alert">Something went wrong</span>
        <h1 className="font-sans font-semibold text-[clamp(36px,4.6vw,56px)] leading-[1.0] tracking-[-0.04em] text-ink mt-5">
          This page didn&apos;t load.
        </h1>
        <p className="text-[17px] text-ink-soft leading-[1.55] mt-5">
          We&apos;ve logged the problem. Try again, or go back to the home page. If it keeps
          happening on this page, let the editors know through the contact page.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center min-h-11 px-5 rounded-full bg-deep-teal text-paper text-[14px] font-medium hover:bg-teal active:scale-[0.98] transition-[transform,background-color] duration-150"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center min-h-11 px-5 rounded-full border border-line text-ink text-[14px] hover:border-teal hover:text-teal transition-colors"
          >
            Home
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center min-h-11 px-5 rounded-full border border-line text-ink text-[14px] hover:border-teal hover:text-teal transition-colors"
          >
            Contact the editors
          </Link>
        </div>
        {error.digest && (
          <p className="font-mono text-[11px] text-muted mt-8 tracking-[0.14em] uppercase">
            Error reference: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
