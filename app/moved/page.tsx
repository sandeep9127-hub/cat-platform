import { CatLogo } from "@/components/layout/CatLogo";
import { MovedRedirect } from "@/components/MovedRedirect";

export const metadata = {
  title: "We have moved",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const NEW_HOME = "https://hub.agroecologyindia.org";

export default async function MovedPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const sp = await searchParams;
  // Only ever forward to an internal path on the new domain.
  let from = sp.from || "/";
  if (!from.startsWith("/")) from = "/" + from;
  if (from.startsWith("//") || from.includes("://")) from = "/";
  const target = `${NEW_HOME}${from}`;

  return (
    <div className="min-h-dvh flex items-center justify-center bg-cream px-5 py-16">
      <div className="w-full max-w-[460px] text-center">
        <div className="flex justify-center mb-7">
          <CatLogo size={44} />
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-deep">
          New address
        </span>
        <h1 className="font-sans font-semibold text-[clamp(28px,5vw,40px)] tracking-[-0.03em] leading-[1.05] text-ink mt-3">
          The Transformation Hub has <span className="text-teal">moved</span>.
        </h1>
        <p className="text-[15.5px] text-ink-soft leading-[1.6] mt-4">
          We have a permanent home now. Taking you there in{" "}
          <MovedRedirect to={target} seconds={5} /> seconds.
        </p>
        <a
          href={target}
          className="mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-deep-teal text-paper px-6 py-3 text-[14px] font-medium hover:bg-teal active:scale-[0.98] transition-[transform,background-color] duration-150"
        >
          Go to hub.agroecologyindia.org now
        </a>
        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          Please update your bookmark to hub.agroecologyindia.org
        </p>
      </div>
    </div>
  );
}
