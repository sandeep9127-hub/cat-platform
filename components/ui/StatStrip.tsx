type Stat = {
  label: string;
  value: string;
  sup?: string;
  delta?: string;
};

export function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <div className="max-w-page mx-auto mt-12 px-5 sm:px-7 lg:px-10 grid grid-cols-2 md:grid-cols-4 border-y border-line">
      {stats.map((s, i) => (
        <div
          key={s.label}
          className={`px-7 py-6 flex flex-col gap-2 ${
            i < stats.length - 1 ? "md:border-r border-line-soft" : ""
          } ${i < 2 ? "border-b md:border-b-0 border-line-soft" : ""}`}
        >
          <span className="font-mono text-[10px] uppercase tracking-mono-mid text-muted">{s.label}</span>
          <span className="font-serif text-[38px] font-medium text-deep-teal leading-none tracking-[-0.02em]">
            {s.value}
            {s.sup && (
              <sup className="text-[14px] text-amber-deep font-normal align-super ml-1 italic">
                {s.sup}
              </sup>
            )}
          </span>
          {s.delta && (
            <span className="font-mono text-[10.5px] text-teal tracking-mono-tight">{s.delta}</span>
          )}
        </div>
      ))}
    </div>
  );
}
