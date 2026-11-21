"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertOctagon,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronDown,
  Copy,
  Loader2,
  RotateCcw,
  Sparkles,
  Square,
  SquarePen,
} from "lucide-react";
import { VisualizePanel } from "./VisualizePanel";
import { Markdown } from "./ask/Markdown";
import { SourcesPanel, SourcesSheet } from "./ask/Sources";
import { FirstScreen, type AskExample } from "./ask/FirstScreen";
import { CompareTable } from "./ask/Compare";
import { MatchCards } from "./ask/Match";
import { ChartView, DiagramView, NoteCard } from "./ask/Visuals";
import { citeParts, citedNumbers, type Citation, type Msg, type ScopeOption } from "./ask/types";

/**
 * Ask the Hub (docs/ask-ui-spec.md §0–1). One component for both backends:
 * Ask v2 (ASK_V2=on: stored conversations, history restore, follow-ups) and
 * the legacy /api/agent path, which share the SSE contract meta/delta/done/error.
 */

const ALL_SCOPE: ScopeOption = { slug: "all", label: "All landscapes", ready: true };

function getSessionToken(): string {
  if (typeof window === "undefined") return "ssr";
  let t = sessionStorage.getItem("cat-agent-session");
  if (!t) {
    t = Math.random().toString(36).slice(2, 18) + Date.now().toString(36);
    sessionStorage.setItem("cat-agent-session", t);
  }
  return t;
}

const isDesktop = () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;

export function AgentChat({
  initialScope = "all",
  landscapes = [],
  starters = {},
  example = null,
  stats = null,
  initialQuestion = "",
}: {
  initialScope?: string;
  landscapes?: ScopeOption[];
  starters?: Record<string, string[]>;
  example?: AskExample | null;
  stats?: { landscapes: number; interventions: number } | null;
  initialQuestion?: string;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [scope, setScope] = useState<string>(initialScope);
  const [active, setActive] = useState<{ mid: number; n: number | null } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [announce, setAnnounce] = useState("");
  const [isV2, setIsV2] = useState(false);
  const [notePdf, setNotePdf] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2200);
  }, []);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const startedRef = useRef(false);
  const answeringRef = useRef(false); // true until `done`; follow-ups may still be streaming after it
  const reqSeq = useRef(0);

  const scopeOptions = useMemo(() => [ALL_SCOPE, ...landscapes], [landscapes]);
  const scopeLabel = scopeOptions.find((s) => s.slug === scope)?.label.replace(/ landscape$/i, "") ?? "All landscapes";
  const starterPlaceholder = scope !== "all" ? starters[scope]?.[0] : undefined;
  const placeholder = starterPlaceholder ?? (messages.length ? "Ask a follow-up…" : "Ask about any landscape, or pick one below");

  /** Patch the assistant message owned by request `reqId` (no-op if it's gone). */
  const patchReq = useCallback((reqId: number, fn: (m: Msg) => Msg) => {
    setMessages((curr) => {
      const idx = curr.findIndex((m) => m.role === "assistant" && m.reqId === reqId);
      if (idx < 0) return curr;
      const updated = curr.slice();
      updated[idx] = fn(updated[idx]);
      return updated;
    });
  }, []);

  /* ─── send ─── */
  const send = useCallback(
    async (text: string, opts?: { scope?: string | null; history?: Msg[] }) => {
      const trimmed = text.trim();
      if (!trimmed || answeringRef.current) return;
      // A previous answer may still be fetching its follow-ups: let it go.
      abortRef.current?.abort();
      const reqId = ++reqSeq.current;
      const patchLast = (fn: (m: Msg) => Msg) => patchReq(reqId, fn);
      answeringRef.current = true;
      const useScope = opts?.scope ?? scope;
      if (opts?.scope) setScope(opts.scope);
      const base = opts?.history ?? messages;
      const next: Msg[] = [...base, { role: "user", content: trimmed }];
      const startedAt = Date.now();
      setMessages([...next, { role: "assistant", content: "", citations: [], phase: "searching", startedAt, reqId }]);
      setActive({ mid: next.length, n: null });
      // The reader just asked: bring the new turn into view.
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ block: "end" }));
      setInput("");
      setBusy(true);
      setAnnounce("");
      const controller = new AbortController();
      abortRef.current = controller;
      let acc = "";

      try {
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            sessionToken: getSessionToken(),
            conversationId: conversationIdRef.current,
            messages: next.map((m) => ({ role: m.role, content: m.content })),
            scope: useScope,
          }),
        });

        if (!(res.headers.get("content-type") ?? "").includes("text/event-stream")) {
          const j = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(j.error || j.refusal || `Request failed (${res.status})`);
          patchLast((m) => ({ ...m, content: j.text ?? "", citations: j.citations ?? [], refused: j.refused, phase: "done", elapsedMs: Date.now() - startedAt }));
          setAnnounce(j.refused ? "Not in the library" : "Answer ready");
          return;
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const t = line.trim();
            if (!t.startsWith("data:")) continue;
            let evt: {
              type: string;
              text?: string;
              citations?: Citation[];
              refused?: boolean;
              message?: string;
              conversationId?: string;
              questions?: string[];
              closest?: { label: string; url: string } | null;
              mode?: Msg["mode"];
              artifact?: Msg["artifact"];
              messageId?: string;
            };
            try {
              evt = JSON.parse(t.slice(5).trimStart());
            } catch {
              continue;
            }
            if (evt.type === "meta") {
              if (evt.conversationId) conversationIdRef.current = evt.conversationId;
              const citations = evt.citations ?? [];
              const mode = evt.mode;
              patchLast((m) => ({ ...m, citations, mode, phase: citations.length ? "reading" : m.phase }));
            } else if (evt.type === "artifact" && evt.artifact) {
              const artifact = evt.artifact;
              patchLast((m) => ({ ...m, artifact }));
            } else if (evt.type === "saved" && evt.messageId) {
              const id = evt.messageId;
              patchLast((m) => ({ ...m, id }));
            } else if (evt.type === "delta" && evt.text) {
              acc += evt.text;
              patchLast((m) => ({ ...m, content: acc, phase: "writing" }));
            } else if (evt.type === "done") {
              const refused = Boolean(evt.refused);
              patchLast((m) => ({ ...m, refused, closest: evt.closest ?? null, phase: "done", elapsedMs: Date.now() - startedAt }));
              setAnnounce(refused ? "Not in the library" : "Answer ready");
              answeringRef.current = false;
              setBusy(false); // the composer frees up; follow-ups may still arrive
            } else if (evt.type === "followups" && Array.isArray(evt.questions)) {
              patchLast((m) => ({ ...m, followUps: evt.questions!.slice(0, 3) }));
            } else if (evt.type === "error") {
              throw new Error(evt.message || "The assistant is temporarily unavailable.");
            }
          }
        }
      } catch (e) {
        if (controller.signal.aborted) {
          // Stop keeps what arrived (the server saves it as interrupted). New chat
          // also aborts, but it has already cleared the thread.
          patchLast((m) => (m.phase === "done" ? m : { ...m, content: acc, interrupted: true, phase: "done", elapsedMs: Date.now() - startedAt }));
        } else {
          patchLast((m) => ({ ...m, content: acc, error: e instanceof Error ? e.message : "Something went wrong.", phase: "done" }));
        }
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          answeringRef.current = false;
          setBusy(false);
        }
      }
    },
    [messages, scope, patchReq],
  );

  const stop = () => abortRef.current?.abort();

  const newChat = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    answeringRef.current = false;
    conversationIdRef.current = null;
    setMessages([]);
    setActive(null);
    setInput("");
    setBusy(false);
    inputRef.current?.focus();
  };

  /** Retry the last turn: drop it and ask the same question again. */
  const retry = (mid: number) => {
    const q = messages[mid - 1];
    if (!q || q.role !== "user" || busy) return;
    void send(q.content, { history: messages.slice(0, mid - 1) });
  };

  /* ─── first load: ?q= or restore history ─── */
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    if (initialQuestion) {
      // Drop ?q= so a refresh doesn't ask again.
      const url = new URL(window.location.href);
      url.searchParams.delete("q");
      window.history.replaceState(null, "", url.toString());
      // Only the Hub's own boxes (header, landscape pages, Search) send straight
      // away. A link from elsewhere just fills the box, so nobody can make a
      // reader ask something they didn't choose.
      let fromHub = false;
      try {
        fromHub = !!document.referrer && new URL(document.referrer).origin === window.location.origin;
      } catch {}
      if (fromHub) {
        void send(initialQuestion, { scope: initialScope });
        return;
      }
      setInput(initialQuestion);
      inputRef.current?.focus({ preventScroll: true });
      return;
    }
    inputRef.current?.focus({ preventScroll: true });
    (async () => {
      try {
        const info = await fetch("/api/agent").then((r) => r.json());
        if (!info?.v2) return;
        setIsV2(true);
        setNotePdf(!!info.notePdf);
        const h = await fetch("/api/agent?history=latest").then((r) => r.json());
        if (!h?.conversationId || !Array.isArray(h.messages) || !h.messages.length) return;
        conversationIdRef.current = h.conversationId;
        setMessages((curr) =>
          curr.length ? curr : (h.messages as Msg[]).map((m) => ({ ...m, phase: m.role === "assistant" ? "done" : undefined })),
        );
      } catch {
        // No history is fine; the reader starts a fresh chat.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow the answer as it streams, unless the reader has scrolled up.
  // Measured against the end of the thread, not the page (the site footer sits below).
  useEffect(() => {
    const el = endRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    if (top < window.innerHeight + 320) el.scrollIntoView({ block: "end" });
  }, [messages]);

  const selectCite = (mid: number, n: number) => {
    setActive({ mid, n });
    if (!isDesktop()) setSheetOpen(true);
  };

  // The panel shows the selected answer's sources, else the latest answer's.
  const panelMid =
    active && messages[active.mid]?.role === "assistant"
      ? active.mid
      : messages
          .map((m, i) => (m.role === "assistant" && (m.content || m.phase !== "done") ? i : -1))
          .filter((i) => i >= 0)
          .pop() ?? -1;
  const panelMsg = panelMid >= 0 ? messages[panelMid] : undefined;
  const panelCites = panelMsg && !panelMsg.refused ? panelMsg.citations ?? [] : [];
  const panelCited = panelMsg ? citedNumbers(panelMsg.content, panelCites.length, panelMsg.artifact) : [];
  const panelActiveN = active && active.mid === panelMid ? active.n : null;

  const composer = (
    <Composer
      input={input}
      setInput={setInput}
      onSubmit={() => send(input.trim() || starterPlaceholder || "")}
      canSend={!!(input.trim() || starterPlaceholder)}
      stop={stop}
      busy={busy}
      scope={scope}
      setScope={setScope}
      scopeLabel={scopeLabel}
      scopeOptions={scopeOptions}
      placeholder={placeholder}
      inputRef={inputRef}
    />
  );

  return (
    <div className="max-w-page mx-auto px-4 sm:px-7 lg:px-10">
      <div className="sr-only" aria-live="polite">{announce}</div>

      {messages.length === 0 ? (
        <FirstScreen
          example={example}
          composer={<div className="sticky bottom-0 z-20 py-2 bg-paper lg:static lg:py-0">{composer}</div>}
          landscapes={landscapes}
          scope={scope}
          stats={stats}
          onPickLandscape={(slug) => {
            setScope(slug);
            inputRef.current?.focus();
          }}
          onAsk={(q, s) => send(q, { scope: s ?? undefined })}
        />
      ) : (
        <div className="lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-8 pt-4">
          {/* Fills the screen so the composer sits at the bottom even with one short turn. */}
          <div className="min-w-0 flex flex-col min-h-[calc(100dvh-var(--header-h,72px)-24px)]">
            <div className="flex items-center justify-end gap-3 pb-3">
              <button
                type="button"
                onClick={newChat}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-soft hover:text-deep-teal px-2 py-1.5 rounded-[6px] hover:bg-cream transition-colors"
              >
                <SquarePen size={14} strokeWidth={1.8} aria-hidden />
                New chat
              </button>
            </div>
            <div className="flex-1 space-y-8 pb-6">
              {messages.map((m, i) =>
                m.role === "user" ? (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[85%] px-4 py-2.5 rounded-[12px] rounded-br-[3px] bg-teal-wash text-ink text-[15px] leading-[1.5]">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <Answer
                    key={i}
                    msg={m}
                    mid={i}
                    isLast={i === messages.length - 1}
                    busy={busy}
                    activeN={active?.mid === i ? active.n : null}
                    onCite={(n) => selectCite(i, n)}
                    showBudgetPanel={!isV2}
                    notePdf={notePdf}
                    onToast={showToast}
                    onRetry={() => retry(i)}
                    onAsk={(q) => send(q)}
                    onShowSources={() => {
                      setActive({ mid: i, n: null });
                      setSheetOpen(true);
                    }}
                  />
                ),
              )}
              {/* scroll-margin keeps the end of the thread clear of the pinned composer */}
              <div ref={endRef} style={{ scrollMarginBottom: 150 }} />
            </div>
            <div className="sticky bottom-0 z-20 bg-paper pt-2 pb-3" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
              {composer}
            </div>
          </div>
          <aside className="hidden lg:block">
            <div className="sticky top-[calc(var(--header-h,72px)+16px)] h-[calc(100vh-var(--header-h,72px)-32px)]">
              <SourcesPanel citations={panelCites} cited={panelCited} activeN={panelActiveN} onSelect={(n) => setActive({ mid: panelMid, n })} />
            </div>
          </aside>
        </div>
      )}

      {toast && (
        <div
          role="status"
          className="fixed left-1/2 -translate-x-1/2 z-50 bg-ink text-paper text-[13px] px-3.5 py-2 rounded-[8px] shadow-lg"
          style={{ bottom: "max(96px, calc(env(safe-area-inset-bottom) + 96px))" }}
        >
          {toast}
        </div>
      )}

      <SourcesSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        citations={panelCites}
        cited={panelCited}
        activeN={panelActiveN}
        onSelect={(n) => setActive({ mid: panelMid, n })}
      />
    </div>
  );
}

/* ─── one assistant turn ─── */

function Answer({
  msg,
  mid,
  isLast,
  busy,
  activeN,
  onCite,
  onRetry,
  onAsk,
  onShowSources,
  showBudgetPanel,
  notePdf,
  onToast,
}: {
  msg: Msg;
  mid: number;
  isLast: boolean;
  busy: boolean;
  activeN: number | null;
  onCite: (n: number) => void;
  onRetry: () => void;
  onAsk: (q: string) => void;
  onShowSources: () => void;
  showBudgetPanel: boolean;
  notePdf: boolean;
  onToast: (msg: string) => void;
}) {
  const cites = msg.citations ?? [];
  const art = msg.refused ? null : msg.artifact;
  // Notes, charts and diagrams carry their own text; the summary isn't shown twice.
  const ownText = art?.type === "note" || art?.type === "chart" || art?.type === "diagram";
  const cited = citedNumbers(msg.content, cites.length, msg.artifact);
  const landscapeSlugs =
    msg.phase === "done" && msg.content && !msg.refused
      ? Array.from(new Set(cites.map((c) => (c.url.match(/\/landscape\/([^/?#]+)/) || [])[1]).filter(Boolean) as string[]))
      : [];

  const chip = (n: number, key: string) => (
    <button
      key={key}
      type="button"
      onClick={() => onCite(n)}
      aria-label={`Source ${n}: ${cites[n - 1] ? citeParts(cites[n - 1]).title : ""}`}
      aria-pressed={activeN === n}
      className={`align-super mx-[1px] inline-grid place-items-center min-w-[18px] h-[18px] px-1 rounded-[4px] text-[11px] leading-none font-semibold tabular-nums transition-colors ${
        activeN === n ? "bg-teal text-paper" : "bg-teal-wash text-teal hover:bg-teal hover:text-paper"
      }`}
    >
      {n}
    </button>
  );

  return (
    <div className="space-y-3">
      <Status msg={msg} />

      {msg.refused ? (
        <div className="border border-amber bg-amber/20 rounded-[8px] px-4 py-3 space-y-2 max-w-[68ch]">
          <p className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-amber-deep">
            <AlertOctagon size={13} strokeWidth={2} aria-hidden /> Not in the library
          </p>
          <p className="text-[15px] leading-[1.6] text-ink">
            The Hub searched the landscape plans and found nothing close enough to answer this, so it hasn&apos;t guessed.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
            {msg.closest && (
              <Link href={msg.closest.url} className="text-teal hover:text-deep-teal font-medium">
                Closest we have: {msg.closest.label}
              </Link>
            )}
            <Link href="/contact" className="text-teal hover:text-deep-teal font-medium">
              Suggest a document
            </Link>
          </div>
        </div>
      ) : msg.content && !ownText ? (
        <div className="text-[16px] leading-[1.7] text-ink max-w-[68ch]">
          <Markdown text={msg.content} chip={chip} maxCite={cites.length} />
        </div>
      ) : null}

      {art?.type === "compare" && <CompareTable a={art} citations={cites} chip={chip} />}
      {art?.type === "match" && <MatchCards a={art} chip={chip} />}
      {art?.type === "note" && (
        <NoteCard a={art} citations={cites} chip={chip} messageId={notePdf ? msg.id : undefined} plainText={msg.content.replace(/\[\d+\]/g, "")} onToast={onToast} />
      )}
      {art?.type === "chart" && <ChartView a={art} chip={chip} max={cites.length} />}
      {art?.type === "diagram" && <DiagramView a={art} caption={msg.content} chip={chip} max={cites.length} />}

      {msg.interrupted && (
        <p className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
          <Square size={9} fill="currentColor" aria-hidden /> Stopped
        </p>
      )}
      {msg.error && (
        <p className="text-[14px] text-amber-deep" role="alert">
          {msg.error}
        </p>
      )}

      {msg.phase === "done" && (
        <div className="flex flex-wrap items-center gap-1">
          {msg.content && !msg.refused && !msg.error && !ownText && <CopyButton text={msg.content} />}
          {isLast && !busy && (msg.interrupted || msg.error || msg.content) && (
            <ActionButton onClick={onRetry} icon={<RotateCcw size={13} strokeWidth={1.8} />}>Retry</ActionButton>
          )}
          {cites.length > 0 && !msg.refused && (
            <span className="lg:hidden">
              <ActionButton onClick={onShowSources} icon={null}>Sources · {cited.length || cites.length}</ActionButton>
            </span>
          )}
        </div>
      )}

      {msg.followUps && msg.followUps.length > 0 && !msg.refused && (
        <div className="space-y-1.5 max-w-[68ch] pt-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-soft">Ask next</p>
          {msg.followUps.map((q) => (
            <button
              key={q}
              type="button"
              disabled={busy}
              onClick={() => onAsk(q)}
              className="w-full flex items-center gap-2 text-left border border-line bg-paper hover:border-teal rounded-[8px] px-3 py-2 text-[14px] text-ink disabled:opacity-50 transition-colors"
            >
              <ArrowRight size={14} strokeWidth={2} className="text-teal shrink-0" aria-hidden />
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Legacy budget charts (old tables); Ask v2 draws charts from the approved budget instead. */}
      {showBudgetPanel && landscapeSlugs.length > 0 && isLast && <VisualizePanel slugs={landscapeSlugs} answerText={msg.content} />}
      <span className="sr-only">Answer {mid}</span>
    </div>
  );
}

/* ─── staged status: searching → reading → writing → folded ─── */

function Status({ msg }: { msg: Msg }) {
  const [open, setOpen] = useState(false);
  const n = msg.citations?.length ?? 0;
  const phase = msg.phase ?? "done";
  const names = (msg.citations ?? [])
    .slice(0, 4)
    .map((c) => {
      const { title, detail } = citeParts(c);
      const page = c.pageStart != null ? ` p.${c.pageStart}` : "";
      return `${title.replace(/ Landscape Investment Plan$/, " LIP")}${page || (detail ? ` · ${detail.split(" · ")[0]}` : "")}`;
    })
    .join(" · ");

  if (phase === "done") {
    if (msg.error) return null;
    const secs = msg.elapsedMs ? ` · ${(msg.elapsedMs / 1000).toFixed(1)} s` : "";
    const done =
      msg.mode === "compare" || msg.artifact?.type === "compare"
        ? "Compared from the library"
        : msg.mode === "match" || msg.artifact?.type === "match"
          ? "Matched against the Solutions Atlas"
          : msg.artifact?.type === "note"
            ? "Note made from the library"
            : msg.artifact?.type === "chart"
              ? "Chart drawn from the approved budget"
              : msg.artifact?.type === "diagram"
                ? "Diagram drawn from the library"
                : "Answered from the library";
    const label = msg.refused
      ? `Searched the library${secs}`
      : msg.interrupted
        ? `Stopped while answering${n ? ` · Read ${n} sources` : ""}`
        : `${done} · Read ${n} source${n === 1 ? "" : "s"}${secs}`;
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={`inline-flex items-center gap-1.5 text-[12.5px] font-medium ${msg.refused ? "text-amber-deep" : "text-teal"} hover:text-deep-teal`}
        >
          {msg.refused ? <AlertOctagon size={13} strokeWidth={1.9} aria-hidden /> : <Sparkles size={13} strokeWidth={1.9} className="text-amber-deep" aria-hidden />}
          {label}
          {n > 0 && <ChevronDown size={13} strokeWidth={1.9} className={`transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />}
        </button>
        {open && n > 0 && <p className="text-[12px] text-ink-soft mt-1 pl-5 max-w-[68ch]">{names}{n > 4 ? ` · and ${n - 4} more` : ""}</p>}
      </div>
    );
  }

  const steps: Array<{ key: string; label: string; state: "done" | "now" | "wait" }> = [
    { key: "s", label: "Searching the library", state: phase === "searching" ? "now" : "done" },
    {
      key: "r",
      label:
        msg.mode === "compare"
          ? `Comparing ${n} passages across landscapes`
          : msg.mode === "match"
            ? `Weighing ${n} Atlas programmes against your problem`
            : msg.mode === "note"
              ? `Making a note from ${n} sources`
              : msg.mode === "visual"
                ? `Drawing from ${n} source${n === 1 ? "" : "s"}`
                : n ? `Reading ${n} sources` : "Reading sources",
      state: phase === "searching" ? "wait" : phase === "reading" ? "now" : "done",
    },
    { key: "w", label: msg.mode ? "Laying out the result" : "Writing the answer", state: phase === "writing" ? "now" : "wait" },
  ];
  return (
    <div className="inline-grid gap-1 border border-line bg-paper rounded-[8px] px-3 py-2 text-[12.5px] text-ink-soft">
      {steps.map((s) => (
        <div key={s.key} className={`flex items-center gap-2 ${s.state === "wait" ? "opacity-50" : ""}`}>
          {s.state === "now" ? (
            <Loader2 size={13} className="animate-spin text-teal" aria-hidden />
          ) : s.state === "done" ? (
            <Check size={13} strokeWidth={2.4} className="text-teal" aria-hidden />
          ) : (
            <span className="w-[13px] h-[13px] rounded-full border border-line" aria-hidden />
          )}
          {s.label}
          {s.key === "r" && n > 0 && phase !== "searching" && <span className="text-ink-soft/80 truncate max-w-[40ch] hidden sm:inline"> · {names}</span>}
        </div>
      ))}
    </div>
  );
}

function ActionButton({ onClick, icon, children }: { onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-soft hover:text-deep-teal px-2 py-1.5 rounded-[6px] hover:bg-cream transition-colors"
    >
      {icon}
      {children}
    </button>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <ActionButton
      onClick={() => {
        navigator.clipboard
          ?.writeText(text)
          .then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
          })
          .catch(() => {});
      }}
      icon={copied ? <Check size={13} strokeWidth={2.2} className="text-teal" /> : <Copy size={13} strokeWidth={1.8} />}
    >
      {copied ? "Copied" : "Copy"}
    </ActionButton>
  );
}

/* ─── composer ─── */

function Composer({
  input,
  setInput,
  onSubmit,
  canSend,
  stop,
  busy,
  scope,
  setScope,
  scopeLabel,
  scopeOptions,
  placeholder,
  inputRef,
}: {
  input: string;
  setInput: (v: string) => void;
  onSubmit: () => void;
  canSend: boolean;
  stop: () => void;
  busy: boolean;
  scope: string;
  setScope: (s: string) => void;
  scopeLabel: string;
  scopeOptions: ScopeOption[];
  placeholder: string;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const [scopeOpen, setScopeOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Escape and outside click close the scope menu.
  useEffect(() => {
    if (!scopeOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setScopeOpen(false);
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setScopeOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [scopeOpen]);

  // Grow with the text, up to about six lines.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [input, inputRef]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy) onSubmit();
      }}
      className="rounded-[20px] border-[1.5px] border-deep-teal bg-paper shadow-[0_1px_2px_rgba(51,75,74,0.08),0_8px_24px_rgba(51,75,74,0.08)] focus-within:shadow-[0_0_0_3px_rgba(46,117,115,0.14),0_8px_24px_rgba(51,75,74,0.1)] transition-shadow"
    >
      <label htmlFor="ask-input" className="sr-only">
        Ask the Hub a question
      </label>
      <textarea
        id="ask-input"
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value.slice(0, 1000))}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (!busy) onSubmit();
          }
        }}
        placeholder={placeholder}
        rows={1}
        className="block w-full resize-none bg-transparent px-4 sm:px-5 pt-3.5 pb-1 text-[16px] text-ink leading-[1.5] outline-none placeholder:text-ink-soft"
      />
      <div className="flex items-center gap-2 px-2.5 pb-2.5 pt-1">
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setScopeOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={scopeOpen}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper hover:bg-cream px-3 py-1.5 text-[12.5px] text-ink-soft"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${scope === "all" ? "bg-teal" : "bg-periwinkle-deep"}`} aria-hidden />
            {scopeLabel}
            <ChevronDown size={13} strokeWidth={1.8} aria-hidden />
          </button>
          {scopeOpen && (
            <div
              role="listbox"
              aria-label="Which landscapes to search"
              className="absolute bottom-full left-0 mb-2 min-w-[220px] max-h-[320px] overflow-y-auto rounded-[8px] border border-line bg-paper p-1.5 z-30 shadow-[0_12px_28px_-12px_rgba(26,38,37,0.3)]"
            >
              {scopeOptions.map((s) =>
                s.ready ? (
                  <button
                    key={s.slug}
                    type="button"
                    role="option"
                    aria-selected={scope === s.slug}
                    onClick={() => {
                      setScope(s.slug);
                      setScopeOpen(false);
                      inputRef.current?.focus();
                    }}
                    className={`w-full text-left px-3 py-2 rounded-[6px] text-[13.5px] ${scope === s.slug ? "bg-teal-wash text-ink font-medium" : "text-ink-soft hover:bg-cream"}`}
                  >
                    {s.label.replace(/ landscape$/i, "")}
                  </button>
                ) : (
                  <div key={s.slug} aria-disabled="true" className="px-3 py-2 text-[13.5px] text-ink-soft/60 flex justify-between">
                    {s.label.replace(/ landscape$/i, "")} <span className="text-[11px] italic">soon</span>
                  </div>
                ),
              )}
            </div>
          )}
        </div>
        <span className="flex-1" />
        {input.length > 800 && <span className="text-[11.5px] text-ink-soft tabular-nums">{input.length}/1000</span>}
        {busy ? (
          <button
            type="button"
            onClick={stop}
            aria-label="Stop answering"
            className="w-10 h-10 grid place-items-center rounded-full bg-ink text-paper hover:bg-deep-teal active:scale-[0.95] transition-[transform,background-color]"
          >
            <Square size={12} strokeWidth={2.4} fill="currentColor" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send"
            className="w-10 h-10 grid place-items-center rounded-full bg-deep-teal text-paper hover:bg-teal active:scale-[0.95] disabled:opacity-40 disabled:cursor-not-allowed transition-[transform,background-color]"
          >
            <ArrowUp size={16} strokeWidth={2} />
          </button>
        )}
      </div>
    </form>
  );
}
