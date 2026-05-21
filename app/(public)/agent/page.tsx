import { AgentChat } from "@/components/agent/AgentChat";
import { CustomBriefBuilder } from "@/components/agent/CustomBriefBuilder";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { ShieldCheck, FileDown } from "lucide-react";

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
  // Validate scope — must be 'all' or a known landscape slug
  const rawScope = sp.scope ?? "all";
  const scope =
    rawScope === "all" || LANDSCAPES[rawScope] ? rawScope : "all";

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
          <>
            <AgentChat initialScope={scope} />
            {/* Custom brief builder — sits at the bottom of the assistant page */}
            <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 mt-10">
              <div
                className="relative overflow-hidden rounded-[10px] border border-line p-5 sm:p-6"
                style={{
                  boxShadow:
                    "0 1px 2px rgba(26,38,37,0.04), 0 10px 24px -16px rgba(248,202,124,0.30)",
                  backgroundImage:
                    "linear-gradient(180deg, rgba(251,248,242,1) 0%, rgba(248,202,124,0.10) 100%)",
                }}
              >
                <span
                  aria-hidden
                  className="absolute top-0 left-0 right-0 h-[2px]"
                  style={{
                    background:
                      "linear-gradient(90deg, #C68C2E 0%, rgba(198,140,46,0.6) 60%, transparent 100%)",
                  }}
                />
                <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="w-10 h-10 rounded-[8px] inline-flex items-center justify-center bg-amber/30 text-amber-deep shrink-0">
                      <FileDown size={18} strokeWidth={1.7} />
                    </span>
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-amber-deep font-semibold">
                        Custom report
                      </span>
                      <h2 className="font-sans text-[18px] font-medium text-[color:var(--navy-teal)] mt-1.5 leading-tight">
                        Generate a custom landscape brief
                      </h2>
                      <p className="font-sans text-[13.5px] text-ink-soft leading-[1.55] mt-1.5 max-w-[60ch]">
                        Pick a landscape and the sections you want. The brief is built live from
                        the curated data — finance, photos, context, whatever applies.
                      </p>
                    </div>
                  </div>
                  <CustomBriefBuilder />
                </div>
              </div>
            </div>
          </>
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
