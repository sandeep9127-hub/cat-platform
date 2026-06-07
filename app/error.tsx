"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
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
    <main className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-16 pb-24 min-h-[60vh]">
      <div className="max-w-[60ch]">
        <span className="eyebrow text-red-alert">Something broke</span>
        <h1 className="font-sans font-semibold text-[clamp(36px,4.6vw,56px)] leading-[1.0] tracking-[-0.04em] text-ink mt-5">
          We couldn&apos;t render this page.
        </h1>
        <p className="text-[17px] text-ink-soft leading-[1.55] mt-5">
          The error has been logged. Try again, or head back to the landing. If this keeps
          happening on the same page, please tell the editors.
        </p>
        <div className="mt-8 flex flex-wrap gap-3.5">
          <button
            onClick={reset}
            className="font-mono text-[11px] uppercase tracking-[0.16em] text-deep-teal border-b-2 border-amber pb-1 hover:border-amber-deep transition-colors"
          >
            ↻ Try again
          </button>
          <Link
            href="/"
            className="font-mono text-[11px] uppercase tracking-[0.16em] text-teal border-b-2 border-line-soft pb-1 hover:border-teal transition-colors"
          >
            ← Back to the landing
          </Link>
        </div>
        {error.digest && (
          <p className="font-mono text-[10.5px] text-muted mt-8 tracking-[0.14em] uppercase">
            Error reference: {error.digest}
          </p>
        )}
      </div>
    </main>
  );
}
