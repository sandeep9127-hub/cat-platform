import Link from "next/link";
import { ThemeIcon } from "./ThemeIcon";

type Props = {
  slug: string;
  name: string;
  colourHex: string;
  asLink?: boolean;
  showIcon?: boolean;
};

export function ThemeChip({ slug, name, colourHex, asLink = true, showIcon = false }: Props) {
  const inner = (
    <span
      className="font-mono text-[9.5px] uppercase tracking-[0.12em] px-2.5 py-1 rounded-full bg-cream text-ink-soft inline-flex gap-1.5 items-center font-medium"
      style={{ ["--c" as string]: colourHex } as React.CSSProperties}
    >
      {showIcon ? (
        <span style={{ color: colourHex }} className="inline-flex">
          <ThemeIcon slug={slug} size={12} />
        </span>
      ) : (
        <span
          className="w-[7px] h-[7px] rounded-full"
          style={{ background: colourHex }}
          aria-hidden
        />
      )}
      {name}
    </span>
  );
  return asLink ? <Link href={`/theme/${slug}`}>{inner}</Link> : inner;
}
