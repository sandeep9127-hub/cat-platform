"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Keyboard, Mic, X } from "lucide-react";
import type { VoiceLang, VoiceName, VoiceState } from "./useVoice";

/**
 * Voice layouts (docs/ask-ui-spec.md §5): a live bar inside the composer on
 * desktop, a full-screen mode on phones. States have their own colour:
 * listening teal, thinking slate, speaking amber.
 */

const STATE = {
  connecting: { label: "Connecting", color: "var(--muted)" },
  listening: { label: "Listening", color: "var(--teal)" },
  thinking: { label: "Thinking", color: "#646d95" },
  speaking: { label: "Speaking", color: "var(--amber-deep)" },
  off: { label: "", color: "var(--muted)" },
} as const;

export const VOICES: { id: VoiceName; label: string }[] = [
  { id: "Ashok", label: "Ashok" },
  { id: "Shalini", label: "Shalini" },
];

function useElapsed(startedAt: number | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!startedAt) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [startedAt]);
  if (!startedAt) return "0:00";
  const s = Math.max(0, Math.floor((now - startedAt) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function StateLabel({ state }: { state: VoiceState }) {
  const s = STATE[state];
  return (
    <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.12em]" style={{ color: s.color }}>
      <span className={`w-2 h-2 rounded-full ${state === "listening" || state === "speaking" ? "animate-pulse" : ""}`} style={{ background: s.color }} aria-hidden />
      {s.label}
    </span>
  );
}

function Wave({ level, state }: { level: number; state: VoiceState }) {
  const color = state === "speaking" ? "var(--amber-deep)" : state === "thinking" ? "#646d95" : "var(--teal)";
  const bars = [0.5, 0.8, 1, 0.7, 0.9, 0.6, 1, 0.75, 0.55];
  const amp = state === "listening" ? level : state === "speaking" ? 0.6 : 0.15;
  return (
    <span className="inline-flex items-center gap-[3px] h-6" aria-hidden>
      {bars.map((b, i) => (
        <span key={i} className="w-[3px] rounded-full transition-[height] duration-100" style={{ background: color, height: `${4 + Math.round(18 * amp * b)}px` }} />
      ))}
    </span>
  );
}

/** Desktop: the composer turns into a live voice bar. */
export function VoiceBar(props: {
  state: VoiceState;
  heard: string;
  caption: string;
  level: number;
  voiceName: VoiceName;
  setVoiceName: (v: VoiceName) => void;
  onEnd: () => void;
  startedAt: number | null;
}) {
  const { state, heard, caption } = props;
  const elapsed = useElapsed(props.startedAt);
  const line =
    state === "listening"
      ? heard || "Go ahead, I'm listening"
      : state === "thinking"
        ? "Searching the library…"
        : state === "speaking"
          ? caption
          : "Connecting to voice…";
  return (
    <div className="rounded-[20px] border-[1.5px] border-teal bg-teal-wash px-3 py-2.5 space-y-1.5" role="group" aria-label="Voice conversation">
      <div className="flex items-center gap-3">
        <StateLabel state={state} />
        <Wave level={props.level} state={state} />
        <span className="flex-1" />
        <span className="text-[12px] tabular-nums text-ink-soft">{elapsed}</span>
        <div className="inline-flex rounded-full border border-line bg-paper p-0.5" role="radiogroup" aria-label="Voice">
          {VOICES.map((v) => (
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={props.voiceName === v.id}
              onClick={() => props.setVoiceName(v.id)}
              className={`px-2.5 py-0.5 rounded-full text-[12px] ${props.voiceName === v.id ? "bg-teal text-paper" : "text-ink-soft hover:text-ink"}`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={props.onEnd} aria-label="End voice conversation" className="w-9 h-9 grid place-items-center rounded-full bg-ink text-paper hover:bg-deep-teal">
          <X size={16} strokeWidth={2} />
        </button>
      </div>
      <p className="text-[14px] leading-[1.5] text-ink line-clamp-2 min-h-[1.5em]" aria-live="polite">
        {line}
      </p>
      {state === "speaking" && <p className="text-[11.5px] text-ink-soft">Speak over it to interrupt.</p>}
    </div>
  );
}

const LANGS: { id: VoiceLang | "or"; label: string; textOnly?: boolean }[] = [
  { id: "en", label: "English" },
  { id: "hi", label: "हिन्दी" },
  { id: "or", label: "ଓଡ଼ିଆ", textOnly: true },
];

/** The latest words of a long caption, so big captions never push the controls off screen. */
function captionTail(text: string, max = 170): string {
  if (text.length <= max) return text;
  const cut = text.indexOf(" ", text.length - max);
  return `…${text.slice(cut > 0 ? cut : text.length - max)}`;
}

/** Phones: full-screen voice mode. */
export function VoiceScreen(props: {
  state: VoiceState;
  heard: string;
  caption: string;
  level: number;
  voiceName: VoiceName;
  setVoiceName: (v: VoiceName) => void;
  language: VoiceLang;
  setLanguage: (l: VoiceLang) => void;
  onEnd: () => void;
  onKeyboard: () => void;
  startedAt: number | null;
}) {
  const { state } = props;
  const [odiaNote, setOdiaNote] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const elapsed = useElapsed(props.startedAt);
  const color = STATE[state].color;
  const scale = state === "listening" ? 1 + props.level * 0.18 : state === "speaking" ? 1.06 : 1;
  // Rendered into <body>: the page's route transition creates a stacking context
  // that would otherwise keep this under the site header.
  if (!mounted) return null;
  return createPortal(
    <div
      className="lg:hidden fixed inset-0 z-[200] bg-paper flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Voice conversation"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <StateLabel state={state} />
        <span className="text-[12px] tabular-nums text-ink-soft">{elapsed}</span>
      </div>

      <div className="flex flex-wrap justify-center gap-1.5 px-4" role="radiogroup" aria-label="Language">
        {LANGS.map((l) => (
          <button
            key={l.id}
            type="button"
            role="radio"
            aria-checked={!l.textOnly && props.language === l.id}
            onClick={() => (l.textOnly ? setOdiaNote(true) : props.setLanguage(l.id as VoiceLang))}
            className={`rounded-full border px-3 py-1 text-[13px] ${
              l.textOnly ? "border-dashed border-line text-ink-soft" : props.language === l.id ? "border-teal bg-teal-wash text-ink" : "border-line text-ink-soft"
            }`}
          >
            {l.label}
            {l.textOnly && <span className="ml-1 text-[11px]">text only</span>}
          </button>
        ))}
      </div>
      {odiaNote && <p className="text-center text-[12.5px] text-ink-soft mt-2 px-6">Odia is text only for now. Type your question in Odia instead.</p>}

      <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-6 px-6">
        <div className="relative w-40 h-40 grid place-items-center" aria-hidden>
          <span
            className={`absolute inset-0 rounded-full border-2 ${state === "listening" || state === "speaking" ? "animate-ping" : ""}`}
            style={{ borderColor: color, opacity: 0.25, animationDuration: state === "speaking" ? "1s" : "1.8s" }}
          />
          <span
            className={`w-28 h-28 rounded-full transition-transform duration-150 ${state === "thinking" ? "animate-pulse" : ""}`}
            style={{ background: color, transform: `scale(${scale})` }}
          />
        </div>
        <p className="text-center text-[19px] leading-[1.45] text-ink max-w-[26ch] min-h-[4.4em] max-h-[8.7em] overflow-hidden" aria-live="polite">
          {state === "listening"
            ? props.heard || <span className="text-ink-soft">Go ahead, I'm listening</span>
            : state === "thinking"
              ? <span className="text-ink-soft">Searching the library…</span>
              : state === "speaking"
                ? captionTail(props.caption)
                : <span className="text-ink-soft">Connecting…</span>}
        </p>
        {state === "speaking" && <p className="text-[12.5px] text-ink-soft -mt-5">Speak over it to interrupt.</p>}
        <div className="inline-flex rounded-full border border-line bg-paper p-0.5" role="radiogroup" aria-label="Voice">
          {VOICES.map((v) => (
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={props.voiceName === v.id}
              onClick={() => props.setVoiceName(v.id)}
              className={`px-3.5 py-1 rounded-full text-[13px] ${props.voiceName === v.id ? "bg-teal text-paper" : "text-ink-soft"}`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-5 pb-6 pt-2">
        <button type="button" onClick={props.onKeyboard} aria-label="Type instead" className="w-13 h-13 w-[52px] h-[52px] grid place-items-center rounded-full border border-line bg-paper text-ink-soft">
          <Keyboard size={20} strokeWidth={1.8} />
        </button>
        <span className="w-[64px] h-[64px] grid place-items-center rounded-full bg-teal text-paper" aria-hidden>
          <Mic size={24} strokeWidth={1.8} />
        </span>
        <button type="button" onClick={props.onEnd} aria-label="End voice conversation" className="w-[52px] h-[52px] grid place-items-center rounded-full bg-ink text-paper">
          <X size={20} strokeWidth={2} />
        </button>
      </div>
    </div>,
    document.body,
  );
}
