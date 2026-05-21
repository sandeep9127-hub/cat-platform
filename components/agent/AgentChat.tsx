"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUp,
  RefreshCw,
  Sparkles,
  Droplets,
  AlertOctagon,
  ShieldCheck,
  Trees,
  Coins,
  Users,
  ScrollText,
  Wrench,
  Loader2,
  FileText,
  ExternalLink,
  X,
} from "lucide-react";

type Citation = {
  index: number;
  type: "entry" | "landscape";
  label: string;
  url: string;
  preview: string;
  score: number;
};

type Msg = {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  refused?: boolean;
};

const PROMPT_POOL: Array<{
  prompt: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  tint: { bar: string; soft: string; glow: string; chipBg: string; chipFg: string };
}> = [
  {
    prompt: "What's actually working on water in semi-arid India?",
    label: "Water",
    Icon: Droplets,
    tint: {
      bar: "#2E7573",
      soft: "rgba(46,117,115,0.09)",
      glow: "rgba(46,117,115,0.20)",
      chipBg: "rgba(46,117,115,0.12)",
      chipFg: "#2E7573",
    },
  },
  {
    prompt: "Show me programmes that publish what didn't work",
    label: "Honesty",
    Icon: AlertOctagon,
    tint: {
      bar: "#C68C2E",
      soft: "rgba(248,202,124,0.16)",
      glow: "rgba(248,202,124,0.30)",
      chipBg: "rgba(248,202,124,0.22)",
      chipFg: "#C68C2E",
    },
  },
  {
    prompt: "Which entries are CAT-authored versus self-submitted?",
    label: "Provenance",
    Icon: ShieldCheck,
    tint: {
      bar: "#929CC5",
      soft: "rgba(146,156,197,0.12)",
      glow: "rgba(146,156,197,0.22)",
      chipBg: "rgba(146,156,197,0.16)",
      chipFg: "#5C6796",
    },
  },
  {
    prompt: "What does the Patratu investment plan say about livestock?",
    label: "Patratu",
    Icon: Trees,
    tint: {
      bar: "#5C8C2E",
      soft: "rgba(92,140,46,0.10)",
      glow: "rgba(92,140,46,0.20)",
      chipBg: "rgba(92,140,46,0.14)",
      chipFg: "#5C8C2E",
    },
  },
  {
    prompt: "Summarise the funding mix for Patratu's investment plan",
    label: "Finance",
    Icon: Coins,
    tint: {
      bar: "#C68C2E",
      soft: "rgba(248,202,124,0.14)",
      glow: "rgba(248,202,124,0.26)",
      chipBg: "rgba(248,202,124,0.20)",
      chipFg: "#C68C2E",
    },
  },
  {
    prompt: "Which programmes work with women-led collectives?",
    label: "Collectives",
    Icon: Users,
    tint: {
      bar: "#929CC5",
      soft: "rgba(146,156,197,0.10)",
      glow: "rgba(146,156,197,0.20)",
      chipBg: "rgba(146,156,197,0.14)",
      chipFg: "#5C6796",
    },
  },
  {
    prompt: "What did not work in agroecology transitions, by entry?",
    label: "Limitations",
    Icon: ScrollText,
    tint: {
      bar: "#B85042",
      soft: "rgba(184,80,66,0.08)",
      glow: "rgba(184,80,66,0.18)",
      chipBg: "rgba(184,80,66,0.10)",
      chipFg: "#B85042",
    },
  },
  {
    prompt: "Compare soil-and-land programmes across states",
    label: "Soil",
    Icon: Wrench,
    tint: {
      bar: "#8C7A5C",
      soft: "rgba(140,122,92,0.10)",
      glow: "rgba(140,122,92,0.20)",
      chipBg: "rgba(140,122,92,0.14)",
      chipFg: "#8C7A5C",
    },
  },
];

const LANDSCAPE_SCOPES = [
  { slug: "all", label: "All sources" },
  { slug: "patratu", label: "Patratu only" },
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

function sampleFour(): typeof PROMPT_POOL {
  const pool = [...PROMPT_POOL];
  const out: typeof PROMPT_POOL = [];
  for (let i = 0; i < 4 && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return out;
}

export function AgentChat({ initialScope = "all" }: { initialScope?: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<string>(initialScope);
  const [cards, setCards] = useState(() => sampleFour());
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, busy]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionToken: getSessionToken(),
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          scope,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || j.refusal || `Request failed (${res.status})`);
      }
      const data = (await res.json()) as {
        text?: string;
        citations?: Citation[];
        refused?: boolean;
      };
      setMessages([
        ...next,
        {
          role: "assistant",
          content: data.text ?? "",
          citations: data.citations ?? [],
          refused: data.refused,
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const charCount = input.length;
  const remaining = Math.max(0, 1000 - charCount);
  const scopeLabel = useMemo(
    () => LANDSCAPE_SCOPES.find((s) => s.slug === scope)?.label ?? "All sources",
    [scope]
  );

  return (
    <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10">
      {messages.length === 0 ? (
        // ─── Landing state ─────────────────────────────────────────────
        <>
          <div className="pt-4 pb-2">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-teal font-semibold inline-flex items-center gap-2">
              <Sparkles size={11} strokeWidth={1.8} className="text-amber-deep" />
              The assistant
            </span>
            <h1 className="font-sans font-light text-[clamp(40px,5.4vw,72px)] tracking-[-0.025em] leading-[1.05] text-[color:var(--navy-teal)] mt-4 max-w-[20ch]">
              Hello there.
              <br />
              What would you like to{" "}
              <em className="italic text-teal not-italic" style={{ fontStyle: "italic" }}>
                know?
              </em>
            </h1>
            <p className="font-sans italic text-[16px] sm:text-[17px] text-ink-soft leading-[1.6] max-w-[52ch] mt-5 font-light">
              Use one of the prompts below or write your own. Answers come from the curated
              library — published entries plus ingested investment plans. Nothing else.
            </p>
          </div>

          {/* Prompt cards · 2×2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
            {cards.map((c) => {
              const Icon = c.Icon;
              return (
                <button
                  key={c.prompt}
                  type="button"
                  onClick={() => {
                    setInput(c.prompt);
                    void send(c.prompt);
                  }}
                  className="group relative overflow-hidden rounded-[10px] border border-line bg-paper p-5 sm:p-6 text-left transition-all duration-300 ease-out hover:-translate-y-0.5"
                  style={{
                    boxShadow: `0 1px 2px rgba(26,38,37,0.04), 0 10px 24px -14px ${c.tint.glow}`,
                    backgroundImage: `linear-gradient(180deg, rgba(251,248,242,1) 0%, ${c.tint.soft} 100%)`,
                  }}
                >
                  <span
                    aria-hidden
                    className="absolute top-0 left-0 right-0 h-[2px]"
                    style={{
                      background: `linear-gradient(90deg, ${c.tint.bar} 0%, ${c.tint.bar}cc 60%, transparent 100%)`,
                    }}
                  />
                  <span
                    className="inline-flex items-center gap-2 mb-3 font-mono text-[10px] uppercase tracking-[0.16em] font-semibold"
                    style={{ color: c.tint.chipFg }}
                  >
                    <span
                      className="w-8 h-8 rounded-[6px] inline-flex items-center justify-center"
                      style={{ background: c.tint.chipBg, color: c.tint.chipFg }}
                      aria-hidden
                    >
                      <Icon size={15} strokeWidth={1.7} />
                    </span>
                    {c.label}
                  </span>
                  <span className="block font-sans italic text-[16px] leading-[1.5] text-[color:var(--navy-teal)] max-w-[34ch]">
                    &ldquo;{c.prompt}&rdquo;
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setCards(sampleFour())}
            className="inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-teal hover:text-deep-teal transition-colors mt-5"
          >
            <RefreshCw size={12} strokeWidth={1.8} />
            Refresh prompts
          </button>
        </>
      ) : (
        // ─── Conversation state ────────────────────────────────────────
        <div
          ref={scrollRef}
          className="pt-4 pb-2 max-h-[55vh] overflow-y-auto"
        >
          {messages.map((m, i) => (
            <MessageBubble key={i} msg={m} />
          ))}
          {busy && (
            <div className="inline-flex items-center gap-2 mt-3 mb-2 text-muted">
              <Loader2 size={14} className="animate-spin" />
              <span className="font-mono text-[10.5px] uppercase tracking-[0.16em]">
                Reading the library
              </span>
            </div>
          )}
        </div>
      )}

      {/* Composer */}
      <Composer
        input={input}
        setInput={setInput}
        send={send}
        busy={busy}
        charCount={charCount}
        remaining={remaining}
        scope={scope}
        setScope={setScope}
        scopeLabel={scopeLabel}
        inputRef={inputRef}
      />

      {error && (
        <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-amber-deep">
          {error}
        </p>
      )}
    </div>
  );
}

function Composer({
  input,
  setInput,
  send,
  busy,
  charCount,
  remaining,
  scope,
  setScope,
  scopeLabel,
  inputRef,
}: {
  input: string;
  setInput: (v: string) => void;
  send: (text: string) => void;
  busy: boolean;
  charCount: number;
  remaining: number;
  scope: string;
  setScope: (s: string) => void;
  scopeLabel: string;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const [scopeOpen, setScopeOpen] = useState(false);
  return (
    <div className="mt-7">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="relative overflow-hidden rounded-[10px] border border-line bg-paper transition-shadow focus-within:shadow-[0_1px_2px_rgba(26,38,37,0.04),0_12px_32px_-16px_rgba(46,117,115,0.30),0_0_0_3px_rgba(46,117,115,0.10)]"
        style={{
          boxShadow: "0 1px 2px rgba(26,38,37,0.04), 0 8px 22px -16px rgba(46,117,115,0.18)",
        }}
      >
        {/* Scope chip — top-right */}
        <div className="absolute top-3 right-3 z-10">
          <button
            type="button"
            onClick={() => setScopeOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line bg-paper hover:bg-cream/60 transition-colors font-mono text-[10px] uppercase tracking-[0.14em] text-deep-teal"
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: scope === "all" ? "#2E7573" : "#929CC5" }}
            />
            {scopeLabel}
            <span className="text-muted">▾</span>
          </button>
          {scopeOpen && (
            <div
              className="absolute top-full right-0 mt-2 min-w-[180px] rounded-[6px] border border-line bg-paper p-1.5 z-20"
              style={{
                boxShadow:
                  "0 1px 2px rgba(26,38,37,0.04), 0 12px 28px -12px rgba(26,38,37,0.30)",
              }}
            >
              {LANDSCAPE_SCOPES.map((s) => (
                <button
                  key={s.slug}
                  type="button"
                  onClick={() => {
                    setScope(s.slug);
                    setScopeOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-[4px] font-mono text-[10.5px] uppercase tracking-[0.14em] transition-colors ${
                    scope === s.slug
                      ? "bg-cream/80 text-deep-teal font-semibold"
                      : "text-ink-soft hover:bg-cream/60"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, 1000))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="Ask whatever you want…"
          rows={2}
          className="block w-full resize-none bg-transparent px-5 sm:px-6 pt-5 pr-32 pb-3 font-sans text-[16px] text-ink leading-[1.5] outline-none placeholder:text-muted placeholder:italic min-h-[112px]"
        />

        <div className="flex items-center justify-between gap-3 px-3 sm:px-4 pb-3 pt-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted tabular-nums ml-2">
            {charCount}/1000
          </span>
          <button
            type="submit"
            disabled={!input.trim() || busy}
            aria-label="Send"
            className="group inline-flex items-center justify-center w-10 h-10 rounded-[8px] bg-gradient-to-br from-deep-teal to-teal text-paper shadow-[0_6px_16px_-6px_rgba(46,117,115,0.55),inset_0_1px_0_rgba(255,255,255,0.18)] hover:from-teal hover:to-deep-teal active:translate-y-[1px] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ArrowUp size={14} strokeWidth={2} className="group-hover:translate-y-[-1px] transition-transform" />
          </button>
        </div>
      </form>

      {/* Microcopy — exactly as specified */}
      <p className="font-mono italic text-[10.5px] uppercase tracking-[0.14em] text-muted mt-3 text-center sm:text-left">
        Powered by AI. This information is generated from curated content, not the web.
      </p>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Msg }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end mb-3 reveal-stagger">
        <div
          className="max-w-[78%] px-4 py-2.5 rounded-[12px] rounded-br-[4px] font-mono text-[13px] leading-[1.55] text-paper"
          style={{
            background: "linear-gradient(135deg, #334B4A 0%, #2E7573 100%)",
            boxShadow:
              "0 1px 2px rgba(26,38,37,0.06), 0 6px 16px -8px rgba(46,117,115,0.30)",
          }}
        >
          {msg.content}
        </div>
      </div>
    );
  }
  // Assistant
  return (
    <div className="mb-5 reveal-stagger">
      <div
        className="relative overflow-hidden rounded-[10px] border border-line bg-paper p-4 sm:p-5"
        style={{
          boxShadow: "0 1px 2px rgba(26,38,37,0.04), 0 8px 22px -14px rgba(46,117,115,0.18)",
          backgroundImage: "linear-gradient(180deg, rgba(251,248,242,1) 0%, rgba(248,243,232,0.4) 100%)",
        }}
      >
        <span
          aria-hidden
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{
            background:
              "linear-gradient(90deg, #2E7573 0%, rgba(46,117,115,0.6) 60%, transparent 100%)",
          }}
        />
        <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-teal font-semibold inline-flex items-center gap-1.5">
          <Sparkles size={10} strokeWidth={1.8} className="text-amber-deep" />
          {msg.refused ? "Refusal · honest answer" : "From the library"}
        </span>
        <p className="font-sans text-[15px] text-ink leading-[1.65] mt-3 whitespace-pre-wrap">
          {msg.content}
        </p>
      </div>

      {msg.citations && msg.citations.length > 0 && (
        <div className="mt-3 ml-1">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted inline-flex items-center gap-1.5 mb-2">
            <span className="w-3 h-px bg-amber-deep" />
            Sources
          </span>
          <ul className="list-none p-0 m-0 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {msg.citations.map((c) => {
              const isLandscape = c.type === "landscape";
              const tint = isLandscape
                ? { bg: "rgba(146,156,197,0.10)", fg: "#5C6796", bar: "#929CC5" }
                : { bg: "rgba(248,202,124,0.16)", fg: "#C68C2E", bar: "#C68C2E" };
              const Icon = isLandscape ? Trees : FileText;
              return (
                <li key={c.index}>
                  <Link
                    href={c.url}
                    className="group relative overflow-hidden block rounded-[6px] border border-line bg-paper p-3 transition-all duration-300 ease-out hover:-translate-y-0.5"
                    style={{
                      boxShadow: `0 1px 2px rgba(26,38,37,0.04), 0 6px 16px -12px ${tint.bar}55`,
                    }}
                  >
                    <span
                      aria-hidden
                      className="absolute top-0 left-0 bottom-0 w-[2px]"
                      style={{ background: tint.bar }}
                    />
                    <div className="flex items-start gap-2.5 pl-1">
                      <span
                        className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-[3px] mt-0.5"
                        style={{ background: tint.bg, color: tint.fg }}
                        aria-hidden
                      >
                        <Icon size={11} strokeWidth={1.8} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[9px] uppercase tracking-[0.14em] font-semibold" style={{ color: tint.fg }}>
                            [{c.index}] {c.label}
                          </span>
                          <span className="font-mono text-[8.5px] tabular-nums text-muted">
                            {c.score.toFixed(2)}
                          </span>
                        </div>
                        <p className="font-sans text-[12px] text-ink-soft leading-snug mt-1 max-w-[40ch]">
                          {c.preview.length > 140 ? c.preview.slice(0, 138) + "…" : c.preview}
                        </p>
                        <span className="inline-flex items-center gap-1 font-mono text-[8.5px] uppercase tracking-[0.14em] text-teal mt-1.5">
                          Open <ExternalLink size={9} strokeWidth={1.8} />
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
