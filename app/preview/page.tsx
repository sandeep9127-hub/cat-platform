import { safeFrom, LAUNCH_DATE } from "@/lib/preview";
import { LaunchCountdown } from "@/components/preview/LaunchCountdown";

export const metadata = {
  title: "Private preview · Transformation Hub",
  robots: { index: false, follow: false },
};

export default async function PreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; from?: string }>;
}) {
  const sp = await searchParams;
  const error = sp.error === "1";
  const from = safeFrom(sp.from);

  return (
    <main
      className="min-h-screen flex items-center justify-center px-5 py-12"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(232,240,234,0.6), transparent 70%), var(--paper)",
      }}
    >
      <div className="w-full max-w-[440px]">
        <div className="flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/cat-logo.png" alt="Consortium for Agroecological Transformations" className="h-16 w-auto mb-8" />
          <span className="eyebrow">Private preview</span>
          <h1 className="font-sans font-semibold text-[clamp(26px,4vw,34px)] tracking-[-0.03em] leading-[1.1] text-ink mt-3 max-w-[18ch]">
            The Transformation Hub launches at London Climate Week
          </h1>
          <p className="text-[15px] text-ink-soft leading-[1.6] mt-4 max-w-[42ch]">
            This is a private preview. Enter the access code you were given to continue.
          </p>
          <div className="w-full max-w-[360px]">
            <LaunchCountdown target={LAUNCH_DATE} />
          </div>
        </div>

        <form
          method="POST"
          action="/api/preview/unlock"
          className="mt-8 rounded-[14px] border border-line bg-paper p-6 sm:p-7 flex flex-col gap-4"
          style={{ boxShadow: "0 1px 2px rgba(26,38,37,0.04), 0 22px 48px -30px rgba(26,38,37,0.3)" }}
        >
          <input type="hidden" name="from" value={from} />

          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
              Your name or organisation <span className="text-muted normal-case tracking-normal">(optional)</span>
            </span>
            <input
              name="name"
              type="text"
              autoComplete="organization"
              placeholder="e.g. Rockefeller Foundation"
              className="w-full rounded-[9px] border border-line bg-cream px-3.5 py-2.5 text-[14.5px] text-ink outline-none focus:border-teal transition-colors"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Access code</span>
            <input
              name="password"
              type="password"
              required
              autoFocus
              autoComplete="off"
              className={
                "w-full rounded-[9px] border bg-cream px-3.5 py-2.5 text-[14.5px] text-ink outline-none transition-colors focus:border-teal " +
                (error ? "border-[#b85042]" : "border-line")
              }
            />
          </label>

          {error && (
            <p className="font-sans text-[13px] text-[#b85042] -mt-1">
              That code wasn&apos;t right. Try again, or ask your CAT contact.
            </p>
          )}

          <button
            type="submit"
            className="mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-deep-teal text-paper px-6 py-3 text-[14px] font-medium hover:bg-teal active:scale-[0.98] transition-[transform,background-color] duration-150"
          >
            Enter the preview
          </button>
        </form>

        <p className="text-center font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted mt-6">
          Consortium for Agroecological Transformations
        </p>
      </div>
    </main>
  );
}
