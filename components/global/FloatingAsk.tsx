"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, X, ArrowUp, Sparkles, Loader2 } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

type AskMode = {
  endpoint: string;
  label: string;
  scope: "general" | "landscape";
  landscapeName?: string;
  starters: string[];
};

function detectMode(pathname: string): AskMode {
  const m = pathname.match(/^\/landscape\/([^/]+)/);
  if (m) {
    const slug = m[1];
    const pretty = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      endpoint: `/api/landscape/${slug}/ask`,
      label: `Ask ${pretty}`,
      scope: "landscape",
      landscapeName: pretty,
      starters: [
        `What is the total plan size for ${pretty}?`,
        `What did not work in past ${pretty} interventions?`,
        `Who are the key partners on the ground?`,
      ],
    };
  }
  return {
    endpoint: "/api/agent",
    label: "Ask the Hub",
    scope: "general",
    starters: [
      "What's actually working on water in semi-arid India?",
      "Show me programmes that publish what didn't work",
      "Which entries are CAT-authored versus self-submitted?",
    ],
  };
}

export function FloatingAsk() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Don't show on admin surfaces.
  const hidden = pathname.startsWith("/admin");

  const mode = detectMode(pathname);

  // Reset history when scope changes (general ↔ specific landscape).
  const scopeKey = mode.scope === "landscape" ? mode.endpoint : "general";
  useEffect(() => {
    setMessages([]);
    setError(null);
  }, [scopeKey]);

  // Keyboard shortcut: Cmd/Ctrl + K opens, Esc closes.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Focus textarea on open; scroll to bottom on new message.
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, busy]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    const next: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(mode.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || j.refusal || `Request failed (${res.status})`);
      }
      const data = (await res.json()) as { text?: string; refused?: boolean };
      const answer =
        data.text ??
        (data.refused
          ? "I cannot answer that within the Hub's scope yet."
          : "No response.");
      setMessages([...next, { role: "assistant", content: answer }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (hidden) return null;

  return (
    <>
      {/* Trigger pill */}
      <button
        type="button"
        aria-label={open ? "Close Ask" : `Open ${mode.label}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-5 right-5 sm:bottom-7 sm:right-7 z-[60] inline-flex items-center gap-2 px-4 py-3 rounded-full text-paper shadow-[0_8px_24px_-8px_rgba(46,117,115,0.45),0_2px_4px_rgba(26,38,37,0.10),inset_0_1px_0_rgba(255,255,255,0.12)] transition-all duration-300 ${
          open
            ? "bg-deep-teal scale-95"
            : "bg-gradient-to-br from-deep-teal via-teal to-deep-teal hover:scale-105"
        }`}
      >
        {open ? (
          <X size={16} strokeWidth={2} aria-hidden />
        ) : (
          <Sparkles size={15} strokeWidth={1.8} className="text-amber" aria-hidden />
        )}
        <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] font-semibold whitespace-nowrap">
          {open ? "Close" : mode.label}
        </span>
        {!open && (
          <span className="hidden sm:inline-flex items-center gap-1 ml-1 pl-2 border-l border-paper/25 font-mono text-[9px] uppercase tracking-[0.14em] text-paper/70">
            ⌘ K
          </span>
        )}
      </button>

      {/* Backdrop on mobile */}
      {open && (
        <button
          type="button"
          aria-label="Close"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[55] bg-ink/30 sm:hidden"
        />
      )}

      {/* Panel */}
      {open && (
        <aside
          role="dialog"
          aria-label={`${mode.label} chat`}
          className="fixed z-[56] right-0 left-0 bottom-0 sm:left-auto sm:right-5 sm:bottom-[5.5rem] sm:w-[400px] max-h-[78dvh] sm:max-h-[70dvh] flex flex-col sm:rounded-[6px] overflow-hidden border-t sm:border border-line bg-paper shadow-[0_24px_64px_-16px_rgba(26,38,37,0.30),0_4px_12px_rgba(26,38,37,0.08)] animate-fade-in-down"
          style={{
            background:
              "linear-gradient(180deg, rgba(251,248,242,1) 0%, rgba(248,243,232,0.6) 100%)",
          }}
        >
          {/* Header */}
          <header className="relative px-5 py-3.5 border-b border-line bg-gradient-to-r from-deep-teal via-teal to-deep-teal text-paper">
            <div className="flex items-center gap-3">
              <Sparkles size={14} strokeWidth={1.6} className="text-amber" aria-hidden />
              <div className="min-w-0">
                <h2 className="font-serif text-[15px] leading-none tracking-[-0.01em] font-medium truncate">
                  {mode.label}
                </h2>
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-paper/70 mt-1 truncate">
                  {mode.scope === "landscape"
                    ? `Scoped to ${mode.landscapeName} library`
                    : "Reads the published library only"}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="ml-auto p-1.5 -mr-1 rounded hover:bg-paper/10 transition-colors"
              >
                <X size={16} strokeWidth={1.8} aria-hidden />
              </button>
            </div>
          </header>

          {/* Body */}
          <div ref={scrollRef} className="relative flex-1 overflow-y-auto px-5 py-5">
            {messages.length === 0 && (
              <div>
                <p className="font-serif italic text-[15px] text-ink-soft leading-[1.55] max-w-[34ch]">
                  {mode.scope === "landscape"
                    ? `Ask anything about ${mode.landscapeName}, its plan, budget, or context.`
                    : "Ask the Hub. Answers come from the published library, with the entries cited."}
                </p>
                <div className="mt-5 flex flex-col gap-2">
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted">
                    Try
                  </span>
                  {mode.starters.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="text-left font-serif italic text-[14px] text-teal hover:text-deep-teal leading-snug py-1.5 transition-colors"
                    >
                      &ldquo;{s}&rdquo;
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.length > 0 && (
              <ul className="flex flex-col gap-4 list-none p-0 m-0">
                {messages.map((m, i) => (
                  <li
                    key={i}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[88%] px-4 py-2.5 text-[14px] leading-[1.5] ${
                        m.role === "user"
                          ? "bg-gradient-to-br from-deep-teal to-teal text-paper rounded-[12px] rounded-br-[4px] font-mono text-[13px]"
                          : "bg-paper border border-line text-ink-soft font-serif rounded-[12px] rounded-bl-[4px]"
                      }`}
                    >
                      {m.content}
                    </div>
                  </li>
                ))}
                {busy && (
                  <li className="flex justify-start">
                    <div className="px-4 py-2.5 border border-line rounded-[12px] rounded-bl-[4px] bg-paper inline-flex items-center gap-2 text-muted">
                      <Loader2 size={14} className="animate-spin" aria-hidden />
                      <span className="font-mono text-[10.5px] uppercase tracking-[0.16em]">
                        Reading the library
                      </span>
                    </div>
                  </li>
                )}
              </ul>
            )}

            {error && (
              <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-amber-deep">
                {error}
              </p>
            )}
          </div>

          {/* Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="border-t border-line bg-paper p-3"
          >
            <div className="flex items-end gap-2 border border-line rounded-[6px] bg-paper focus-within:border-teal transition-colors">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder={
                  mode.scope === "landscape"
                    ? `Ask about ${mode.landscapeName}…`
                    : "Ask about a programme, theme, or state…"
                }
                rows={1}
                className="flex-1 resize-none bg-transparent px-3 py-2.5 font-serif text-[14.5px] text-ink leading-[1.45] outline-none placeholder:text-muted placeholder:italic max-h-[120px]"
              />
              <button
                type="submit"
                disabled={!input.trim() || busy}
                aria-label="Send"
                className="m-1.5 p-2 rounded-[4px] bg-gradient-to-br from-deep-teal to-teal text-paper disabled:opacity-40 disabled:cursor-not-allowed hover:from-teal hover:to-deep-teal transition-all"
              >
                <ArrowUp size={14} strokeWidth={2} aria-hidden />
              </button>
            </div>
            <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-muted text-center">
              <MessageCircle size={9} className="inline -translate-y-px mr-1" />
              Public preview, scoped to the library
            </p>
          </form>
        </aside>
      )}
    </>
  );
}
