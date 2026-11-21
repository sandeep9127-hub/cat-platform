import Image from "next/image";
import { ANCHORS } from "@/lib/data/anchors";

/**
 * "Anchor partner" block for the landscape page — the lead organisation on the
 * ground, shown with its logo beside the name. Sits in the landscape header's
 * fact column. Renders nothing if a landscape has no mapped anchor.
 */
export function LandscapeAnchorPartner({ slug }: { slug: string }) {
  const a = ANCHORS[slug];
  if (!a) return null;
  return (
    <div>
      <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
        Anchor partner
      </span>
      <div className="mt-2 flex items-center gap-3">
        <span className="inline-flex items-center justify-center w-12 h-12 shrink-0 rounded-card bg-paper border border-line p-1.5">
          <Image
            src={a.logo}
            alt={`${a.name} logo`}
            width={36}
            height={36}
            className="w-full h-full object-contain"
          />
        </span>
        <span className="leading-tight">
          <span className="font-sans text-[14px] text-ink">{a.name}</span>
          {a.short && a.short !== a.name ? (
            <span className="block font-mono text-[11px] uppercase tracking-[0.12em] text-muted mt-0.5">
              {a.short}
            </span>
          ) : null}
        </span>
      </div>
    </div>
  );
}
