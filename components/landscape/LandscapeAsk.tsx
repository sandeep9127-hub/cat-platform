"use client";

import { useEffect, useRef, useState } from "react";

type Citation = {
  index: number;
  section: string | null;
  kind: string;
  score: number;
  preview: string;
};
type Msg = { role: "user" | "assistant"; content: string; citations?: Citation[]; refused?: boolean };

const MAX_TURNS = 8;

function getSessionToken(): string {
  if (typeof window === "undefined") return "ssr";
  const k = "cat-landscape-ask";
  let t = sessionStorage.getItem(k);
  if (!t) {
    t = Math.random().toString(36).slice(2, 18) + Date.now().toString(36);
    sessionStorage.setItem(k, t);
  }
  return t;
}

export function LandscapeAsk({
  slug,
  landscapeName,
  starters,
}: {
  slug: string;
  landscapeName: string;
  starters: string[];
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const used = messages.filter((m) => m.role === "user").length;
  const left = MAX_TURNS - used;
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, busy]);

  async function send(text: string) {
    if (!text.trim() || busy || left <= 0) return;
    const next: Msg[] = [...messages, { role: "user", content: text.trim() }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch(`/api/landscape/${slug}/ask`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionToken: getSessionToken(),
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = (await res.json()) as {
        text?: string;
        citations?: Citation[];
        refusal?: string;
        error?: string;
      };
      if (data.error || data.refusal) {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: data.refusal ?? data.error ?? "Agent unavailable.", refused: true },
        ]);
      } else {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: data.text ?? "", citations: data.citations },
        ]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "The agent service is unreachable right now.", refused: true },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 lg:gap-12">
      <div className="flex flex-col gap-6 min-h-[45vh]">
        {messages.length === 0 ? (
          <div>
            <p className="font-serif italic text-[18px] text-ink-soft leading-[1.5] mb-5 font-light">
              Try one of these, or write your own. The agent only knows {landscapeName}; it
              refuses off-topic questions.
            </p>
            <ul className="list-none p-0 flex flex-col gap-2.5">
              {starters.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => send(s)}
                    className="text-left w-full font-serif text-[16.5px] text-deep-teal hover:text-teal underline decoration-amber decoration-2 underline-offset-4 transition-colors"
                  >
                    &ldquo;{s}&rdquo;
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i}>
              <span className="eyebrow block mb-2">
                {m.role === "user" ? "You" : m.refused ? "Refusal" : `Ask ${landscapeName}`}
              </span>
              <div
                className={`font-serif text-[16.5px] leading-[1.6] whitespace-pre-wrap max-w-[68ch] ${
                  m.role === "user" ? "text-ink" : m.refused ? "text-red-alert italic" : "text-ink-soft"
                }`}
              >
                {m.content}
              </div>
              {m.citations && m.citations.length > 0 && (
                <details className="mt-3 group">
                  <summary className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted cursor-pointer hover:text-deep-teal">
                    Show {m.citations.length} cited passage{m.citations.length === 1 ? "" : "s"} ↓
                  </summary>
                  <ol className="list-none p-0 mt-3 flex flex-col gap-2.5">
                    {m.citations.map((c) => (
                      <li
                        key={c.index}
                        className="border-l-2 border-line-soft pl-3 text-[13px] leading-[1.5]"
                      >
                        <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-amber-deep">
                          [{c.index}] · {c.kind.replace(/_/g, " ")}
                          {c.section ? ` · ${c.section.slice(0, 80)}` : ""}
                        </div>
                        <div className="font-serif text-ink-soft mt-1.5 italic">
                          {c.preview}
                        </div>
                      </li>
                    ))}
                  </ol>
                </details>
              )}
            </div>
          ))
        )}
        {busy && (
          <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-teal animate-pulse">
            Reading the {landscapeName} LIP…
          </div>
        )}
        <div ref={endRef} />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="mt-auto pt-6 border-t border-line-soft grid grid-cols-[1fr_auto] gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              left <= 0
                ? "Session limit reached. Refresh to start over."
                : `Ask ${landscapeName} anything from the LIP…`
            }
            disabled={busy || left <= 0}
            className="w-full px-4 py-3 bg-cream border border-line rounded-[2px] font-serif italic text-[16px] text-ink placeholder:text-muted placeholder:not-italic placeholder:font-sans placeholder:text-[14px] focus:outline-2 focus:outline-teal focus:bg-paper transition-colors disabled:opacity-60"
            aria-label={`Ask ${landscapeName}`}
          />
          <button
            type="submit"
            disabled={busy || left <= 0 || !input.trim()}
            className="px-5 py-3 bg-deep-teal text-paper font-mono text-[10.5px] uppercase tracking-[0.16em] font-semibold rounded-[2px] hover:bg-teal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Ask
          </button>
        </form>
      </div>

      <aside className="flex flex-col gap-6">
        <div className="border-l-2 border-amber-deep pl-4">
          <span className="eyebrow block mb-2">This session</span>
          <p className="text-[13.5px] text-ink-soft leading-[1.55]">
            {left > 0
              ? `${left} of ${MAX_TURNS} turns remaining.`
              : "Session capped. Refresh to start a new one."}
          </p>
        </div>
        <div className="border-l-2 border-teal pl-4">
          <span className="eyebrow block mb-2">What it knows</span>
          <ul className="list-none p-0 m-0 flex flex-col gap-1.5 text-[13.5px] text-ink-soft leading-[1.55]">
            <li>The {landscapeName} LIP (narrative + interventions)</li>
            <li>Budget package summaries</li>
            <li>Citation by passage, never invented</li>
          </ul>
        </div>
        <div className="border-l-2 border-line-soft pl-4">
          <span className="eyebrow block mb-2">What it won&apos;t</span>
          <ul className="list-none p-0 m-0 flex flex-col gap-1.5 text-[13.5px] text-ink-soft leading-[1.55]">
            <li>Compare other landscapes</li>
            <li>Quote unindexed numbers</li>
            <li>Answer off-topic questions</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
