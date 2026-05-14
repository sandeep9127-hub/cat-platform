"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Msg = { role: "user" | "assistant"; content: string; citedSlugs?: string[]; refused?: boolean };

const STARTERS = [
  "What's actually working on water in semi-arid India?",
  "Show me programmes that publish what didn't work",
  "Which entries are CAT-authored versus self-submitted?",
];

function getSessionToken(): string {
  if (typeof window === "undefined") return "ssr";
  let t = sessionStorage.getItem("cat-agent-session");
  if (!t) {
    t = Math.random().toString(36).slice(2, 18) + Date.now().toString(36);
    sessionStorage.setItem("cat-agent-session", t);
  }
  return t;
}

export function AgentChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const turnsUsed = messages.filter((m) => m.role === "user").length;
  const turnsLeft = 5 - turnsUsed;
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, busy]);

  async function send(text: string) {
    if (!text.trim() || busy || turnsLeft <= 0) return;
    const nextMessages: Msg[] = [...messages, { role: "user", content: text.trim() }];
    setMessages(nextMessages);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionToken: getSessionToken(),
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = (await res.json()) as {
        text?: string;
        citedSlugs?: string[];
        refused?: boolean;
        refusal?: string;
        error?: string;
      };
      if (data.error || data.refusal) {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: data.refusal ?? data.error ?? "The agent could not respond.",
            refused: true,
          },
        ]);
      } else {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: data.text ?? "",
            citedSlugs: data.citedSlugs,
            refused: !!data.refused,
          },
        ]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "The agent service is unreachable right now. Browse by theme or use search instead.",
          refused: true,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 lg:gap-12">
      <div className="flex flex-col gap-6 min-h-[40vh]">
        {messages.length === 0 ? (
          <div>
            <p className="font-serif italic text-[18px] text-ink-soft leading-[1.5] mb-5 font-light">
              Start with one of these or write your own.
            </p>
            <ul className="list-none p-0 flex flex-col gap-2.5">
              {STARTERS.map((s) => (
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
            <div
              key={i}
              className={`reveal-stagger ${m.role === "user" ? "" : ""}`}
              style={{ animationDelay: "0ms" }}
            >
              <span className="eyebrow block mb-2">
                {m.role === "user" ? "You" : m.refused ? "Refusal" : "Agent"}
              </span>
              <div
                className={`font-serif text-[16.5px] leading-[1.6] whitespace-pre-wrap ${
                  m.role === "user"
                    ? "text-ink"
                    : m.refused
                      ? "text-red-alert italic"
                      : "text-ink-soft"
                } max-w-[64ch]`}
              >
                {m.content}
              </div>
              {m.citedSlugs && m.citedSlugs.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted self-center">
                    Cited
                  </span>
                  {m.citedSlugs.map((s) => (
                    <Link
                      key={s}
                      href={`/entry/${s}`}
                      className="font-mono text-[10px] uppercase tracking-[0.12em] text-deep-teal border border-line px-2 py-1 rounded-[2px] hover:border-teal hover:text-teal transition-colors"
                    >
                      {s}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
        {busy && (
          <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-teal animate-pulse">
            Reading the library…
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
              turnsLeft <= 0
                ? "Session limit reached. Refresh to start over."
                : "Ask anything about the library…"
            }
            disabled={busy || turnsLeft <= 0}
            className="w-full px-4 py-3 bg-cream border border-line rounded-[2px] font-serif italic text-[16px] text-ink placeholder:text-muted placeholder:not-italic placeholder:font-sans placeholder:text-[14px] focus:outline-2 focus:outline-teal focus:bg-paper transition-colors disabled:opacity-60"
            aria-label="Your question"
          />
          <button
            type="submit"
            disabled={busy || turnsLeft <= 0 || !input.trim()}
            className="px-5 py-3 bg-deep-teal text-paper font-mono text-[10.5px] uppercase tracking-[0.16em] font-semibold rounded-[2px] hover:bg-teal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Ask
          </button>
        </form>
      </div>

      <aside className="flex flex-col gap-6">
        <div className="border-l-2 border-amber-deep pl-4">
          <span className="eyebrow block mb-2">This preview</span>
          <p className="text-[13.5px] text-ink-soft leading-[1.55]">
            {turnsLeft > 0
              ? `${turnsLeft} of 5 turns remaining in this session.`
              : "Session capped. Refresh to start a new one."}
          </p>
        </div>
        <div className="border-l-2 border-teal pl-4">
          <span className="eyebrow block mb-2">What it can do</span>
          <ul className="list-none p-0 m-0 flex flex-col gap-1.5 text-[13.5px] text-ink-soft leading-[1.55]">
            <li>Search published entries</li>
            <li>Summarise a programme</li>
            <li>Compare entries on a theme</li>
            <li>Cite by title with links</li>
          </ul>
        </div>
        <div className="border-l-2 border-line-soft pl-4">
          <span className="eyebrow block mb-2">What it won&apos;t</span>
          <ul className="list-none p-0 m-0 flex flex-col gap-1.5 text-[13.5px] text-ink-soft leading-[1.55]">
            <li>Answer off-topic questions</li>
            <li>Invent facts not in the library</li>
            <li>Replace a CAT editor</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
