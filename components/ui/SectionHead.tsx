export function SectionHead({
  eyebrow,
  title,
  italic,
  meta,
}: {
  eyebrow?: string;
  title: string;
  italic?: string;
  meta?: string;
}) {
  return (
    <div className="max-w-page mx-auto mt-20 lg:mt-24 mb-7 px-5 sm:px-7 lg:px-10 flex items-baseline gap-4 sm:gap-7 flex-wrap">
      <h2 className="font-sans font-semibold text-[clamp(28px,3.4vw,44px)] tracking-[-0.035em] leading-[1.0] text-ink">
        {title}
        {italic && <span className="text-teal font-semibold"> {italic}</span>}
      </h2>
      <span className="flex-1 h-px bg-rule mt-[16px] sm:mt-[22px] hidden sm:block" />
      {meta && (
        <span className="font-mono text-[10px] sm:text-[10.5px] uppercase tracking-mono-wide text-muted">{meta}</span>
      )}
    </div>
  );
}
