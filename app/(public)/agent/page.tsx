import { AgentChat } from "@/components/agent/AgentChat";

export const metadata = {
  title: "Agent preview",
  description:
    "A scoped preview of the CAT Platform agent. Ask questions of the library; the agent answers from published entries with citations.",
};

export default function AgentPage() {
  const enabled = !!process.env.NVIDIA_API_KEY;

  return (
    <article className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-10 sm:pt-14 lg:pt-20 pb-24">
      <header className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-10 lg:gap-16 items-end">
        <div className="reveal-stagger">
          <span className="eyebrow flex items-center gap-2">
            Preview
            <span className="inline-block px-1.5 py-0.5 bg-amber/40 text-deep-teal rounded-[2px] text-[9px]">
              v1 demo
            </span>
          </span>
          <h1 className="font-serif font-normal text-hero-xl text-ink mt-4">
            Ask the <em className="hero-italic italic text-teal not-italic" style={{ fontStyle: "italic" }}>library</em>.
          </h1>
          <p className="font-serif italic text-[17px] sm:text-[19px] text-ink-soft leading-[1.45] max-w-[46ch] mt-5 font-light">
            The full agent ships in v2. This preview answers from the current library only, in
            short paragraphs, with citations. Up to five turns per session. Refuses anything
            off-topic.
          </p>
        </div>
        <aside className="lg:border-l lg:border-line lg:pl-7 lg:self-end lg:pb-2 border-t border-line pt-6 lg:border-t-0 lg:pt-0 reveal-stagger" style={{ animationDelay: "180ms" }}>
          <span className="eyebrow">Scoped strictly to</span>
          <ul className="list-none p-0 mt-3 flex flex-col gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-soft">
            <li>· Published entries only</li>
            <li>· Cited by title, never invented</li>
            <li>· Refuses off-topic questions</li>
            <li>· 5 turns per session</li>
          </ul>
        </aside>
      </header>

      <section className="mt-12 border-t border-line pt-8">
        {enabled ? (
          <AgentChat />
        ) : (
          <div className="max-w-[60ch] py-10">
            <span className="eyebrow text-red-alert">Not configured</span>
            <p className="font-serif italic text-[18px] text-ink-soft leading-[1.5] mt-3 font-light">
              The agent preview is built and wired, but requires an NVIDIA API key (the one
              that gives Kimi access) to respond. Set{" "}
              <code className="font-mono text-[14px] not-italic">NVIDIA_API_KEY</code> in your
              environment (free tier), restart the server, and refresh this page.
            </p>
          </div>
        )}
      </section>
    </article>
  );
}
