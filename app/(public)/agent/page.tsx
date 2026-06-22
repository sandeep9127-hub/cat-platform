import { AgentChat } from "@/components/agent/AgentChat";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { getIngestedLandscapeSlugs } from "@/lib/db/landscape-kb";
import { ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ask the Hub",
  description:
    "A scoped assistant for the Transformation Hub. Reads only the curated library; refuses anything outside it.",
};

type Search = { scope?: string };

export default async function AgentPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const enabled = !!process.env.NVIDIA_API_KEY;

  // The full landscape roster, each flagged with whether it has ingested
  // content yet. Filters render for ALL eleven; the ones without a plan show as
  // disabled placeholders. Upload a plan → its chunks land in the DB → it lights
  // up here automatically, no code change. (Sorted: ready first, then A–Z.)
  const ingested = new Set(await getIngestedLandscapeSlugs().catch(() => []));
  const landscapes = Object.values(LANDSCAPES)
    .map((l) => ({ slug: l.slug, label: l.name, ready: ingested.has(l.slug) }))
    .sort((a, b) => Number(b.ready) - Number(a.ready) || a.label.localeCompare(b.label));

  // Validate scope: must be 'all' or a landscape that is actually ingested.
  const rawScope = sp.scope ?? "all";
  const scope =
    rawScope === "all" || ingested.has(rawScope) ? rawScope : "all";

  return (
    <article className="pt-8 sm:pt-12 lg:pt-16 pb-24">
      {/* Slim trust strip above the assistant */}
      <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pb-6 flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-line bg-paper font-mono text-[10px] uppercase tracking-[0.16em] text-teal">
          <ShieldCheck size={11} strokeWidth={1.8} aria-hidden />
          Reads only from the library. Not the web.
        </div>
        <a
          href="/search"
          className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted hover:text-teal transition-colors"
        >
          Or browse with filters →
        </a>
      </div>

      <section className="pt-2">
        {enabled ? (
          <AgentChat initialScope={scope} landscapes={landscapes} />
        ) : (
          <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10">
            <div className="max-w-[60ch] py-10">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-red-alert font-semibold">
                Not configured
              </span>
              <p className="font-sans italic text-[18px] text-ink-soft leading-[1.6] mt-3 font-light">
                The assistant is built and wired, but requires an NVIDIA API key (the one
                that gives Kimi access) to respond. Set{" "}
                <code className="font-mono text-[14px] not-italic">NVIDIA_API_KEY</code> in your
                environment, restart the server, and refresh this page.
              </p>
            </div>
          </div>
        )}
      </section>
    </article>
  );
}
