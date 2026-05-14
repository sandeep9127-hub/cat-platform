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
      <h2 className="font-serif text-[26px] sm:text-[30px] lg:text-[34px] font-normal tracking-[-0.015em] text-ink">
        {title}
        {italic && <em className="not-italic italic text-teal font-normal"> {italic}</em>}
      </h2>
      <span className="flex-1 h-px bg-line mt-[14px] sm:mt-[18px] hidden sm:block" />
      {meta && (
        <span className="font-mono text-[10px] sm:text-[10.5px] uppercase tracking-mono-wide text-muted">{meta}</span>
      )}
    </div>
  );
}
