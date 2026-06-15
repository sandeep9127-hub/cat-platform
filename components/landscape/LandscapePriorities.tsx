import { LANDSCAPE_PRIORITIES } from "@/lib/data/landscape-priorities";

/**
 * "Transformational priorities" — the landscape's high-level strategic priorities
 * (verbatim from the CAT fact sheet), shown above the concrete interventions as
 * the direction the plan is steering toward. Warm amber card, echoing the fact
 * sheet's priorities panel.
 */
export function LandscapePriorities({
  slug,
  landscapeName,
}: {
  slug: string;
  landscapeName: string;
}) {
  const items = LANDSCAPE_PRIORITIES[slug];
  if (!items || items.length === 0) return null;

  return (
    <section className="mt-16 lg:mt-20 max-w-page mx-auto px-5 sm:px-7 lg:px-10">
      <div className="mb-7">
        <span className="eyebrow">The direction</span>
        <h2 className="font-sans font-semibold text-[clamp(26px,3vw,40px)] tracking-[-0.03em] leading-[1.05] text-ink mt-3">
          Transformational priorities
        </h2>
        <p className="font-sans text-[15px] text-ink-soft leading-[1.55] mt-3 max-w-[60ch]">
          What the {landscapeName} plan is steering toward — the strategic shifts that guide every
          intervention on the ground.
        </p>
      </div>

      <div
        className="rounded-[14px] p-6 sm:p-8 lg:p-9"
        style={{
          background:
            "linear-gradient(180deg, rgba(248,202,124,0.12) 0%, rgba(248,202,124,0.04) 100%)",
          border: "1px solid rgba(198,143,46,0.28)",
          boxShadow: "0 1px 2px rgba(26,38,37,0.04), 0 16px 36px -28px rgba(198,143,46,0.35)",
        }}
      >
        <ol className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 lg:gap-x-14 gap-y-5 list-none p-0 m-0">
          {items.map((t, i) => (
            <li key={i} className="grid grid-cols-[28px_1fr] gap-x-3 items-baseline">
              <span className="font-mono text-[13px] text-amber-deep font-semibold tabular-nums tracking-[0.06em]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="font-sans text-[14.5px] text-ink leading-[1.55]">{t}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
