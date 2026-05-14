import Link from "next/link";

type Props = {
  slug: string;
  name: string;
  colourHex: string;
  asLink?: boolean;
};

export function ThemeChip({ slug, name, colourHex, asLink = true }: Props) {
  const inner = (
    <span
      className="font-mono text-[9.5px] uppercase tracking-[0.12em] px-2.5 py-1 rounded-full bg-cream text-ink-soft inline-flex gap-1.5 items-center font-medium"
      style={{ ["--c" as string]: colourHex } as React.CSSProperties}
    >
      <span
        className="w-[7px] h-[7px] rounded-full"
        style={{ background: colourHex }}
        aria-hidden
      />
      {name}
    </span>
  );
  return asLink ? <Link href={`/theme/${slug}`}>{inner}</Link> : inner;
}
