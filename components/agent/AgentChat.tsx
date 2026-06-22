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
  MapPin,
  Compass,
  Sprout,
  Copy,
  Check,
} from "lucide-react";
import { VisualizePanel } from "./VisualizePanel";

type Citation = {
  index: number;
  type: "entry" | "landscape" | "factsheet" | "principle";
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
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties; className?: string }>;
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
    prompt: "Show me solutions that are honest about what didn't work",
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
    prompt: "How are the Atlas solutions sourced and verified?",
    label: "Verified",
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
    prompt: "Which solutions work through farmer collectives and FPOs?",
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
    prompt: "What hasn't worked in natural-farming transitions?",
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
    prompt: "Compare natural-farming programmes across states",
    label: "Compare",
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

// Scope is a single dropdown: "All sources" (the whole knowledge base — every
// Solutions-Atlas fact sheet, the 13 principles, and every ingested landscape)
// OR a specific landscape. The landscape roster is passed in from the server
// (driven by the DB), so a landscape becomes selectable the moment its plan is
// ingested — no code change here.
type ScopeOption = { slug: string; label: string; ready: boolean };
const ALL_SCOPE: ScopeOption = { slug: "all", label: "All sources", ready: true };

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

export function AgentChat({
  initialScope = "all",
  landscapes = [],
}: {
  initialScope?: string;
  landscapes?: ScopeOption[];
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<string>(initialScope);
  const scopeOptions = useMemo<ScopeOption[]>(
    () => [ALL_SCOPE, ...landscapes],
    [landscapes]
  );
  const [cards, setCards] = useState(() => sampleFour());
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll the chat to the latest delta — but only when the user
  // is already near the bottom. If they've scrolled UP to re-read an
  // earlier message, leave them alone instead of yanking them back.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 120) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, busy]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    const userMsg: Msg = { role: "user", content: trimmed };
    const next: Msg[] = [...messages, userMsg];
    // Push the assistant placeholder right away so the user sees a row appear
    // and the citation tray can populate as soon as the meta event arrives.
    const withPlaceholder: Msg[] = [
      ...next,
      { role: "assistant", content: "", citations: [], refused: false },
    ];
    setMessages(withPlaceholder);
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

      // Non-stream responses (refusal floor, rate-limit, config error) come
      // back as JSON. Detect by content-type and handle accordingly.
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("text/event-stream")) {
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(j.error || j.refusal || `Request failed (${res.status})`);
        }
        // Refusal (no library match above floor) — backend returns full JSON
        setMessages([
          ...next,
          {
            role: "assistant",
            content: j.text ?? "",
            citations: j.citations ?? [],
            refused: j.refused,
          },
        ]);
        return;
      }

      // Streaming path. Read SSE lines from res.body and incrementally update
      // the placeholder assistant message.
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      let citations: Citation[] = [];
      let refused = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine.startsWith("data:")) continue;
          const payload = trimmedLine.slice(5).trimStart();
          if (!payload) continue;
          let evt: {
            type: string;
            text?: string;
            citations?: Citation[];
            refused?: boolean;
            message?: string;
          };
          try {
            evt = JSON.parse(payload);
          } catch {
            continue;
          }
          if (evt.type === "meta") {
            citations = evt.citations ?? [];
            // Update placeholder citations immediately
            setMessages((curr) => {
              const idx = curr.length - 1;
              if (idx < 0 || curr[idx].role !== "assistant") return curr;
              const updated = curr.slice();
              updated[idx] = { ...updated[idx], citations };
              return updated;
            });
          } else if (evt.type === "delta" && evt.text) {
            acc += evt.text;
            // Append to placeholder content
            setMessages((curr) => {
              const idx = curr.length - 1;
              if (idx < 0 || curr[idx].role !== "assistant") return curr;
              const updated = curr.slice();
              updated[idx] = { ...updated[idx], content: acc };
              return updated;
            });
          } else if (evt.type === "done") {
            refused = Boolean(evt.refused);
            setMessages((curr) => {
              const idx = curr.length - 1;
              if (idx < 0 || curr[idx].role !== "assistant") return curr;
              const updated = curr.slice();
              updated[idx] = { ...updated[idx], refused };
              return updated;
            });
          } else if (evt.type === "error") {
            throw new Error(evt.message || "The assistant service failed.");
          }
        }
      }
    } catch (e) {
      // Drop the placeholder on error so the user can retry cleanly
      setMessages(next);
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const charCount = input.length;
  const remaining = Math.max(0, 1000 - charCount);
  const scopeLabel = useMemo(
    () => scopeOptions.find((s) => s.slug === scope)?.label ?? "All sources",
    [scope, scopeOptions]
  );
  // Placeholder reflects the active scope so it's clear what the answer draws on.
  const scopePlaceholder = useMemo(
    () =>
      scope === "all"
        ? "Ask about any solution, principle, or landscape…"
        : `Ask about the ${scopeLabel.replace(/ landscape$/i, "")} landscape…`,
    [scope, scopeLabel]
  );

  // One Composer instance, placed as the centered hero in the empty state and
  // at the bottom during a conversation (only one branch renders at a time).
  const composerEl = (
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
      scopeOptions={scopeOptions}
      placeholder={scopePlaceholder}
      inputRef={inputRef}
    />
  );

  return (
    <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10">
      {messages.length === 0 ? (
        // ─── Landing (minimal, composer-first — Gemini/ChatGPT style) ───
        <div className="relative min-h-[54vh] flex flex-col items-center justify-center text-center py-12">
          {/* Soft warm focal glow behind the composer */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(56% 44% at 50% 40%, rgba(46,117,115,0.09), transparent 70%)",
            }}
          />
          <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-teal font-semibold inline-flex items-center gap-2">
            <Sparkles size={11} strokeWidth={1.8} className="text-amber-deep" />
            Powered by AI
          </span>
          <h1 className="font-serif text-[clamp(24px,3.2vw,36px)] tracking-[-0.02em] leading-[1.08] text-ink mt-3">
            What would you like to <span className="text-teal italic">know?</span>
          </h1>

          <div className="w-full max-w-[640px] mt-7">{composerEl}</div>

          {/* Prompt suggestions — light pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-5 max-w-[700px]">
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
                  className="group inline-flex items-center gap-2 rounded-full border border-line bg-paper/70 hover:border-deep-teal hover:bg-cream px-3.5 py-2 transition-colors active:scale-[0.98]"
                >
                  <Icon size={13} strokeWidth={1.8} style={{ color: c.tint.bar }} aria-hidden />
                  <span className="font-sans text-[12.5px] text-ink-soft group-hover:text-deep-teal leading-tight max-w-[30ch] truncate">
                    {c.prompt}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setCards(sampleFour())}
            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted hover:text-deep-teal transition-colors mt-5"
          >
            <RefreshCw size={12} strokeWidth={1.8} />
            Refresh prompts
          </button>
        </div>
      ) : (
        // ─── Conversation state ────────────────────────────────────────
        <div
          ref={scrollRef}
          className="pt-4 pb-2 max-h-[55vh] overflow-y-auto"
        >
          {messages.map((m, i) => (
            <MessageBubble key={i} msg={m} mid={i} />
          ))}
          {/* Spinner only while we're waiting on the FIRST token. Once
              the assistant message has any content, the streaming text
              itself is the affordance — the spinner becomes redundant
              and visually noisy. */}
          {busy &&
            (() => {
              const last = messages[messages.length - 1];
              const stillWaiting =
                !last || last.role !== "assistant" || last.content.length === 0;
              // Staged: before the retrieval meta arrives we're searching; once
              // citations land (but no answer text yet) we're reading those sources.
              const n =
                last && last.role === "assistant" ? last.citations?.length ?? 0 : 0;
              return stillWaiting ? (
                <div className="inline-flex items-center gap-2 mt-3 mb-2 text-muted">
                  <Loader2 size={14} className="animate-spin" />
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.16em]">
                    {n > 0
                      ? `Reading ${n} source${n === 1 ? "" : "s"}`
                      : "Searching the library"}
                  </span>
                </div>
              ) : null;
            })()}
        </div>
      )}

      {/* Composer at the bottom during a conversation; the empty state renders
          it as the centered hero above. */}
      {messages.length > 0 && composerEl}

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
  scopeOptions,
  placeholder,
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
  scopeOptions: ScopeOption[];
  placeholder: string;
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line bg-paper hover:bg-cream/60 active:scale-[0.97] transition-[transform,background-color] duration-150 ease-out-expo font-mono text-[10px] uppercase tracking-[0.14em] text-deep-teal"
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
              className="absolute top-full right-0 mt-2 min-w-[210px] max-h-[340px] overflow-y-auto rounded-[6px] border border-line bg-paper p-1.5 z-20 origin-top-right animate-scope-pop"
              style={{
                boxShadow:
                  "0 1px 2px rgba(26,38,37,0.04), 0 12px 28px -12px rgba(26,38,37,0.30)",
              }}
            >
              {/* All sources */}
              <button
                type="button"
                onClick={() => {
                  setScope("all");
                  setScopeOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-[4px] font-mono text-[10.5px] uppercase tracking-[0.14em] transition-colors ${
                  scope === "all"
                    ? "bg-cream/80 text-deep-teal font-semibold"
                    : "text-ink-soft hover:bg-cream/60"
                }`}
              >
                All sources
              </button>
              <p className="px-3 pt-1 pb-1.5 font-sans normal-case tracking-normal text-[10.5px] leading-snug text-muted">
                Every solution, principle and landscape.
              </p>

              {/* Landscape filters — built from the DB. Ready ones are
                  selectable; the rest are placeholders awaiting their plan. */}
              <div className="px-3 pt-2 pb-1 font-mono text-[8.5px] uppercase tracking-[0.16em] text-muted border-t border-line-soft mt-1">
                Focus on a landscape
              </div>
              {scopeOptions
                .filter((s) => s.slug !== "all")
                .map((s) =>
                  s.ready ? (
                    <button
                      key={s.slug}
                      type="button"
                      onClick={() => {
                        setScope(s.slug);
                        setScopeOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-[4px] font-mono text-[10.5px] uppercase tracking-[0.14em] transition-colors flex items-center justify-between gap-2 ${
                        scope === s.slug
                          ? "bg-cream/80 text-deep-teal font-semibold"
                          : "text-ink-soft hover:bg-cream/60"
                      }`}
                    >
                      <span>{s.label}</span>
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: "#5C8C2E" }}
                        aria-hidden
                      />
                    </button>
                  ) : (
                    <div
                      key={s.slug}
                      aria-disabled="true"
                      title="Plan not uploaded yet"
                      className="w-full px-3 py-2 rounded-[4px] font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted/70 flex items-center justify-between gap-2 cursor-not-allowed"
                    >
                      <span>{s.label}</span>
                      <span className="font-sans normal-case tracking-normal text-[9px] text-muted/60 italic shrink-0">
                        soon
                      </span>
                    </div>
                  )
                )}
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
          placeholder={placeholder}
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
            className="group inline-flex items-center justify-center w-10 h-10 rounded-full bg-deep-teal text-paper hover:bg-teal active:scale-[0.94] disabled:opacity-40 disabled:cursor-not-allowed transition-[transform,background-color] duration-150 ease-out-expo"
          >
            <ArrowUp size={14} strokeWidth={2} className="group-hover:translate-y-[-1px] transition-transform" />
          </button>
        </div>
      </form>

      {/* Microcopy — proud AI framing, kept honest by the grounding + citations */}
      <p className="font-mono italic text-[10.5px] uppercase tracking-[0.14em] text-muted mt-3 text-center sm:text-left">
        Powered by AI — grounded in the Hub&apos;s cited sources, not the open web. Check the citations.
      </p>
    </div>
  );
}

function MessageBubble({ msg, mid }: { msg: Msg; mid: number }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end mb-4 reveal-stagger">
        <div className="max-w-[80%] px-4 py-2.5 rounded-[12px] rounded-br-[3px] bg-deep-teal text-paper text-[14px] leading-[1.5]">
          {msg.content}
        </div>
      </div>
    );
  }
  // Assistant — answer flows on the page (no bubble), broadsheet-style.
  // Landscapes cited in this answer → chartable with their real budget data.
  const landscapeSlugs =
    msg.content.length > 0 && !msg.refused && msg.citations
      ? Array.from(
          new Set(
            msg.citations
              .filter((c) => c.type === "landscape")
              .map((c) => (c.url.match(/\/landscape\/([^/?#]+)/) || [])[1])
              .filter(Boolean) as string[]
          )
        )
      : [];
  return (
    <div className="mb-8 reveal-stagger">
      <span
        className={`font-mono text-[9.5px] uppercase tracking-[0.16em] font-semibold inline-flex items-center gap-1.5 ${
          msg.refused ? "text-[#B85042]" : "text-teal"
        }`}
      >
        {msg.refused ? (
          <AlertOctagon size={11} strokeWidth={1.9} />
        ) : (
          <Sparkles size={11} strokeWidth={1.9} className="text-amber-deep" />
        )}
        {msg.refused ? "Honest answer — not in the library" : "Answered from the library"}
      </span>
      <div className="font-sans text-[16px] text-ink leading-[1.7] mt-2.5 whitespace-pre-wrap max-w-[68ch]">
        {renderInlineMarkdown(msg.content, { mid, maxCite: msg.citations?.length ?? 0 })}
      </div>

      {msg.content.length > 0 && !msg.refused && <AnswerActions text={msg.content} />}

      {msg.content.length > 0 && !msg.refused && (
        <VisualizePanel slugs={landscapeSlugs} answerText={msg.content} />
      )}

      {msg.citations && msg.citations.length > 0 && (
        <CitationTray citations={msg.citations} mid={mid} />
      )}
    </div>
  );
}

const CITE_META: Record<
  string,
  { Icon: typeof FileText; tag: string; fg: string }
> = {
  landscape: { Icon: MapPin, tag: "Landscape", fg: "#5C6796" },
  principle: { Icon: Compass, tag: "Principle", fg: "#5f8d3e" },
  factsheet: { Icon: Sprout, tag: "Solution", fg: "#2E7573" },
  entry: { Icon: FileText, tag: "Source", fg: "#946616" },
};

function CitationTray({ citations, mid }: { citations: Citation[]; mid: number }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? citations : citations.slice(0, 4);
  const hidden = Math.max(0, citations.length - 4);
  return (
    <div className="mt-5 max-w-[68ch]">
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted inline-flex items-center gap-1.5">
          <FileText size={11} strokeWidth={1.8} className="text-amber-deep" />
          Sources <span className="text-ink font-semibold">{citations.length}</span>
        </span>
        {hidden > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-teal hover:text-deep-teal transition-colors"
          >
            {expanded ? "Show fewer ←" : `Show all ${citations.length} →`}
          </button>
        )}
      </div>
      <ul className="list-none p-0 m-0 grid grid-cols-1 sm:grid-cols-2 gap-px bg-line border border-line">
        {visible.map((c) => {
          const meta = CITE_META[c.type] ?? CITE_META.entry;
          const Icon = meta.Icon;
          const isExternal = /^https?:\/\//i.test(c.url);
          const linkProps = isExternal
            ? { href: c.url, target: "_blank" as const, rel: "noreferrer" }
            : null;
          const sharedClass =
            "group block bg-paper p-3.5 h-full hover:bg-cream transition-colors active:scale-[0.99]";
          const inner = (
            <>
              <div className="flex items-center gap-2 mb-1.5">
                <Icon size={13} strokeWidth={1.9} style={{ color: meta.fg }} aria-hidden />
                <span className="font-mono text-[8.5px] uppercase tracking-[0.16em] font-semibold" style={{ color: meta.fg }}>
                  {meta.tag}
                </span>
                <span className="font-mono text-[8.5px] tabular-nums text-muted ml-auto">
                  {c.score.toFixed(2)}
                </span>
              </div>
              <div className="font-sans text-[13px] font-semibold text-ink leading-snug tracking-[-0.01em]">
                <span className="text-muted font-normal">[{c.index}]</span> {c.label}
              </div>
              <p className="font-sans text-[12px] text-ink-soft leading-snug mt-1">
                {c.preview.length > 130 ? c.preview.slice(0, 128) + "…" : c.preview}
              </p>
              <span className="inline-flex items-center gap-1 font-mono text-[8.5px] uppercase tracking-[0.14em] text-teal mt-2 group-hover:text-deep-teal transition-colors">
                {isExternal ? "Open source" : "Open"} <ExternalLink size={9} strokeWidth={1.9} />
              </span>
            </>
          );
          return (
            <li key={c.index} id={`cite-${mid}-${c.index}`} className="scroll-mt-24 rounded-[2px]">
              {isExternal && linkProps ? (
                <a {...linkProps} className={sharedClass}>
                  {inner}
                </a>
              ) : (
                <Link href={c.url} className={sharedClass}>
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Clickable inline citation chip. The model emits [1], [2] markers (system
// prompt); we render them as superscript chips that scroll to + flash the
// matching source card in the tray below.
function CiteChip({ n, mid }: { n: number; mid: number }) {
  return (
    <a
      href={`#cite-${mid}-${n}`}
      onClick={(e) => {
        e.preventDefault();
        const el = document.getElementById(`cite-${mid}-${n}`);
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.remove("cite-flash");
        void el.offsetWidth; // restart the flash animation if re-clicked
        el.classList.add("cite-flash");
        window.setTimeout(() => el.classList.remove("cite-flash"), 1500);
      }}
      className="align-super ml-0.5 inline-flex items-center justify-center min-w-[15px] px-1 py-px rounded-[3px] bg-teal-wash text-teal hover:bg-teal hover:text-paper no-underline font-mono text-[10px] leading-none font-semibold transition-colors"
      aria-label={`Source ${n}`}
    >
      {n}
    </a>
  );
}

// Copy-the-answer action row under each completed assistant reply.
function AnswerActions({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-3.5 flex items-center gap-2">
      <button
        type="button"
        onClick={() => {
          navigator.clipboard
            ?.writeText(text)
            .then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1800);
            })
            .catch(() => {});
        }}
        className="inline-flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted hover:text-deep-teal active:scale-[0.97] transition-[transform,color] duration-150 ease-out-expo"
      >
        {copied ? (
          <Check size={12} strokeWidth={2.2} className="text-teal" />
        ) : (
          <Copy size={12} strokeWidth={1.8} />
        )}
        {copied ? "Copied" : "Copy answer"}
      </button>
    </div>
  );
}

// Safety-net inline markdown renderer. The system prompt forbids
// markdown formatting in agent replies, but when the model slips a
// **bold** through it should not render as literal asterisks to the
// reader. Bold + italic, plus [n] citation markers rendered as chips.
function renderInlineMarkdown(
  text: string,
  opts?: { mid?: number; maxCite?: number }
): React.ReactNode[] {
  if (!text) return [];
  const mid = opts?.mid ?? 0;
  const maxCite = opts?.maxCite ?? 0;
  const re = /(\*\*[^*]+\*\*|\*[^*\n]+\*|_[^_\n]+_|\[\d+\])/g;
  const out: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const m of text.matchAll(re)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(text.slice(last, idx));
    const tok = m[0];
    if (tok.startsWith("**")) {
      out.push(
        <strong key={`b-${key++}`} className="font-semibold">
          {tok.slice(2, -2)}
        </strong>
      );
    } else if (tok.startsWith("[")) {
      const n = parseInt(tok.slice(1, -1), 10);
      if (maxCite > 0 && n >= 1 && n <= maxCite) {
        out.push(<CiteChip key={`c-${key++}`} n={n} mid={mid} />);
      } else {
        out.push(tok); // not a real citation index — leave as literal text
      }
    } else {
      out.push(
        <em key={`i-${key++}`} className="italic">
          {tok.slice(1, -1)}
        </em>
      );
    }
    last = idx + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
