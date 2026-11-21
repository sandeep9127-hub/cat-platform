import { AgentChat } from "@/components/agent/AgentChat";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { getIngestedLandscapeSlugs } from "@/lib/db/landscape-kb";
import { libraryStats, readyLandscapeSlugs } from "@/lib/ask/v2";
import { ASK_STARTERS } from "@/lib/ask/starters";
import { exampleForToday } from "@/lib/ask/examples";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ask the Hub",
  description:
    "Ask the CAT landscape investment plans. Every answer quotes the page it came from; if something isn't in the plans, the Hub says so.",
};

type Search = { scope?: string; q?: string };

export default async function AgentPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  // Claude answers; Voyage embeds the question for retrieval. Both are needed.
  const enabled = !!process.env.ANTHROPIC_API_KEY && !!process.env.VOYAGE_API_KEY;

  // The full landscape roster, each flagged with whether it has ingested
  // content yet. Filters render for ALL eleven; the ones without a plan show as
  // disabled placeholders. Upload a plan → its chunks land in the DB → it lights
  // up here automatically, no code change. (Sorted: ready first, then A–Z.)
  // Ask v2 reads the CAT library (cat.documents); the legacy path reads the old chunk table.
  const v2 = process.env.ASK_V2 === "on";
  const ingested = new Set(await (v2 ? readyLandscapeSlugs() : getIngestedLandscapeSlugs()).catch(() => [] as string[]));
  const landscapes = Object.values(LANDSCAPES)
    .map((l) => ({ slug: l.slug, label: l.name, ready: ingested.has(l.slug) }))
    .sort((a, b) => Number(b.ready) - Number(a.ready) || a.label.localeCompare(b.label));

  // Validate scope: must be 'all' or a landscape that is actually ingested.
  const rawScope = sp.scope ?? "all";
  const scope =
    rawScope === "all" || ingested.has(rawScope) ? rawScope : "all";
  // ?q= from the header box, landscape pages and Search: sent once on arrival.
  const initialQuestion = typeof sp.q === "string" ? sp.q.trim().slice(0, 1000) : "";

  const stats = v2 ? await libraryStats().catch(() => null) : null;

  return (
    <article className="pt-2 sm:pt-4 pb-6">
      <section>
        {enabled ? (
          <AgentChat
            initialScope={scope}
            landscapes={landscapes}
            starters={ASK_STARTERS}
            example={v2 ? exampleForToday() : null}
            stats={stats}
            initialQuestion={initialQuestion}
          />
        ) : (
          <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10">
            <div className="max-w-[60ch] py-10">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-red-alert font-semibold">
                Not configured
              </span>
              <p className="font-sans italic text-[18px] text-ink-soft leading-[1.6] mt-3 font-light">
                The assistant is built and wired, but needs two keys to respond: Claude
                for answers and Voyage for search. Set{" "}
                <code className="font-mono text-[14px] not-italic">ANTHROPIC_API_KEY</code> and{" "}
                <code className="font-mono text-[14px] not-italic">VOYAGE_API_KEY</code> in your
                environment, restart the server, and refresh this page.
              </p>
            </div>
          </div>
        )}
      </section>
    </article>
  );
}
