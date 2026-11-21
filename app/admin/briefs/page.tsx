import Link from "next/link";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { getBrief } from "@/lib/briefs/generate";
import { generateBriefAction } from "./actions";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
export const metadata = { title: "Landscape briefs · Admin" };

export default async function Briefs() {
  const slugs = Object.keys(LANDSCAPES).sort((a, b) => LANDSCAPES[a].name.localeCompare(LANDSCAPES[b].name));
  const briefs = await Promise.all(slugs.map(async (s) => [s, await getBrief(s)] as const));
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-[28px] text-deep-teal">Landscape briefs</h1>
        <p className="text-[14px] text-muted max-w-[760px] mt-1">
          A two-page cited brief per landscape, written from the investment plan with the approved budget figures. A brief is
          marked out of date when the report or the approved budget changes; regenerate it then (about $0.05 each).
        </p>
      </header>
      <ul className="rounded-[10px] border border-line divide-y divide-line">
        {briefs.map(([slug, b]) => (
          <li key={slug} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <span className="font-serif text-[17px] text-deep-teal min-w-[220px]">{LANDSCAPES[slug].name}</span>
            <span className={`text-[13px] ${!b ? "text-muted" : b.current ? "text-teal" : "text-amber"}`}>
              {!b ? "No brief yet" : b.current ? `Current, ${new Date(b.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : "Out of date"}
            </span>
            <span className="ml-auto flex items-center gap-3">
              {b && <Link href={`/admin/briefs/${slug}`} className="font-mono text-[11px] uppercase tracking-[0.1em] text-deep-teal hover:text-teal">Read</Link>}
              {(!b || !b.current) && (
                <form action={generateBriefAction}>
                  <input type="hidden" name="slug" value={slug} />
                  <button className="rounded-[6px] bg-teal text-paper px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] hover:bg-deep-teal">
                    {b ? "Regenerate" : "Generate"}
                  </button>
                </form>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
