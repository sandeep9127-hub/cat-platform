import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

type Stat = {
  label: string;
  value: string;
  sup?: string;
  delta?: string;
};

// One restrained accent per metric — a small tick, not a card. Editorial, not
// the "four identical gradient cards" template.
const TICK = ["#2E7573", "#C68C2E", "#5C6796", "#5C8C2E"];

export function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <section className="max-w-page mx-auto pt-16 lg:pt-20 px-5 sm:px-7 lg:px-10">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted mb-4">
        The library at a glance
      </div>
      {/* Single framed panel; hairline dividers via 1px gap over the line colour
          (works cleanly at both 2-col and 4-col). No boxed cards. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-line rounded-[10px] overflow-hidden border border-line">
        {stats.map((s, i) => (
          <div key={s.label} className="bg-paper px-6 py-7 sm:px-7 flex flex-col gap-3.5">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-[3px] shrink-0"
                style={{ background: TICK[i % TICK.length] }}
                aria-hidden
              />
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted leading-tight">
                {s.label}
              </span>
            </div>

            <div className="font-sans text-[44px] sm:text-[52px] font-semibold leading-[0.95] tracking-[-0.035em] text-ink tabular-nums">
              <AnimatedNumber value={s.value} />
              {s.sup && (
                <sup className="text-[15px] text-amber-deep font-normal align-super ml-1">
                  {s.sup}
                </sup>
              )}
            </div>

            {s.delta && (
              <div className="mt-auto inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                <span
                  className="inline-block w-3.5 h-px"
                  style={{ background: TICK[i % TICK.length] }}
                />
                {s.delta}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
