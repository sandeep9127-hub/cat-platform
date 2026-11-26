"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Mic, X } from "lucide-react";
import { CatLogo } from "./CatLogo";
import { LANG_CODES, LANGUAGES, TEXT_ONLY_LANGUAGES } from "@/lib/ask/languages";
import type { VoiceLang, VoiceName, VoiceState } from "./useVoice";

/**
 * Full-screen talk mode (docs/ask-ui-spec.md §5, Sandeep 21 Nov: "Talk opens a
 * full-screen talk mode"). One view on every screen size: a large state
 * indicator in the centre, big live captions of the last turn, the current
 * answer's sources, the voice switch, timer and End. The indicator is the
 * animated CAT logo (CatLogo.tsx); with reduced motion it is still.
 * When voice can't start on its own (sound or the mic blocked) the view shows
 * "Tap to start talking". Closing returns to the chat, which keeps every turn
 * with its sources.
 */

const STATE = {
  connecting: { label: "Connecting", color: "var(--muted)" },
  listening: { label: "Listening", color: "var(--teal)" },
  thinking: { label: "Thinking", color: "#646d95" },
  speaking: { label: "Speaking", color: "var(--amber-deep)" },
  off: { label: "Ready", color: "var(--muted)" },
} as const;

export const VOICES: { id: VoiceName; label: string }[] = [
  { id: "Ashok", label: "Ashok" },
  { id: "Shalini", label: "Shalini" },
];

// Auto follows the speaker turn by turn; picking a language fixes the reply language.
const LANGS: { id: VoiceLang | string; label: string; textOnly?: boolean }[] = [
  { id: "auto", label: "Auto" },
  ...LANG_CODES.map((c) => ({ id: c, label: LANGUAGES[c].label })),
  ...TEXT_ONLY_LANGUAGES.map((l) => ({ id: l.code, label: l.label, textOnly: true })),
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

/** The latest words of a long caption, so it never pushes the controls off screen. */
function tail(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.indexOf(" ", text.length - max);
  return `…${text.slice(cut > 0 ? cut : text.length - max)}`;
}

export function TalkMode(props: {
  open: boolean;
  state: VoiceState;
  heard: string;
  caption: string;
  lastQuestion: string;
  level: number;
  /** The Hub's playback level 0–1 (drives the logo while speaking). */
  outLevel: number;
  startedAt: number | null;
  voiceName: VoiceName;
  setVoiceName: (v: VoiceName) => void;
  language: VoiceLang;
  setLanguage: (l: VoiceLang) => void;
  /** Titles of the current answer's sources (full details stay in the chat). */
  sources: string[];
  /** The sources list is open inside talk mode (the reader tapped Sources, or the agent showed them). */
  sourcesOpen?: boolean;
  onSourcesOpen?: (open: boolean) => void;
  /** Staff test session (?record=1): words and timings are kept on this device for download. */
  recording?: boolean;
  /** Returns a short message to show in the talk view. */
  onDownloadRecording?: () => string;
  /** Link cards the voice agent put on screen. They open only when tapped (pop-up blockers stop anything else). */
  cards?: { title: string; href: string }[];
  /** Voice isn't running and needs a tap (sound or mic blocked, or not started yet). */
  needsTap: boolean;
  message: string | null;
  onStart: () => void;
  onEnd: () => void;
  onClose: () => void;
}) {
  const { open, state } = props;
  const [mounted, setMounted] = useState(false);
  const [odiaNote, setOdiaNote] = useState(false);
  const [recNote, setRecNote] = useState<string | null>(null);
  const endRef = useRef<HTMLButtonElement | null>(null);
  const elapsed = useElapsed(props.startedAt);
  useEffect(() => setMounted(true), []);

  // While open: no page scroll behind it; Escape ends; focus starts on End.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    endRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") (state === "off" ? props.onClose : props.onEnd)();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, state]);

  if (!mounted || !open) return null;
  const live = state !== "off";
  const s = STATE[props.needsTap && !live ? "off" : state];

  // Captions: the reader's words, then the Hub's, the last turn only.
  const you = state === "listening" ? props.heard : props.lastQuestion;
  const hub =
    state === "speaking"
      ? props.caption
      : state === "thinking"
        ? "Searching the library…"
        : state === "connecting"
          ? "Connecting…"
          : state === "listening" && !props.heard
            ? "Go ahead, I'm listening."
            : "";

  // Rendered into <body> so the page's stacking contexts can't put the header on top.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Talk to the Hub"
      className="fixed inset-0 z-[200] flex flex-col bg-paper text-ink"
      style={{
        paddingTop: "max(12px, env(safe-area-inset-top))",
        paddingBottom: "max(16px, env(safe-area-inset-bottom))",
        paddingLeft: "max(16px, env(safe-area-inset-left))",
        paddingRight: "max(16px, env(safe-area-inset-right))",
      }}
    >
      {/* Top: state and timer, voice and language */}
      <div className="w-full max-w-[880px] mx-auto flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: s.color }}>
          <span className={`w-2.5 h-2.5 rounded-full ${live ? "motion-safe:animate-pulse" : ""}`} style={{ background: s.color }} aria-hidden />
          {s.label}
        </span>
        <span className="text-[13px] tabular-nums text-ink-soft">{live ? elapsed : ""}</span>
        {props.recording && (
          <span className="rounded-full border border-amber bg-amber/15 px-2.5 py-0.5 text-[11.5px] text-ink" title="Words and timings only, kept on this device. No audio.">
            Test recording (words only)
          </span>
        )}
        <span className="flex-1" />
        <div className="inline-flex rounded-full border border-line bg-paper p-0.5" role="radiogroup" aria-label="Voice">
          {VOICES.map((v) => (
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={props.voiceName === v.id}
              onClick={() => props.setVoiceName(v.id)}
              className={`px-3 py-1 rounded-full text-[13px] ${props.voiceName === v.id ? "bg-teal text-paper" : "text-ink-soft hover:text-ink"}`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
      <div className="w-full max-w-[880px] mx-auto flex flex-wrap gap-1.5 mt-2.5" role="radiogroup" aria-label="Language">
        {LANGS.map((l) => (
          <button
            key={l.id}
            type="button"
            role="radio"
            aria-checked={!l.textOnly && props.language === l.id}
            onClick={() => (l.textOnly ? setOdiaNote(true) : props.setLanguage(l.id as VoiceLang))}
            className={`rounded-full border px-3 py-1 text-[13px] ${
              l.textOnly ? "border-dashed border-line text-ink-soft" : props.language === l.id ? "border-teal bg-teal-wash text-ink" : "border-line text-ink-soft hover:border-teal"
            }`}
          >
            {l.label}
            {l.textOnly && <span className="ml-1 text-[11px]">text only</span>}
          </button>
        ))}
        {odiaNote && <span className="self-center text-[12.5px] text-ink-soft">Odia is text only for now. Type your question in Odia instead.</span>}
      </div>

      {/* Centre: indicator and captions */}
      <div className="flex-1 min-h-0 w-full max-w-[880px] mx-auto flex flex-col items-center justify-center gap-6 sm:gap-8 text-center overflow-hidden py-4">
        <CatLogo
          state={live ? state : "idle"}
          micLevel={props.level}
          voiceLevel={props.outLevel}
          label={s.label}
          className="shrink min-h-0"
        />

        {props.needsTap && !live ? (
          <div className="flex flex-col items-center gap-3 max-w-[40ch]">
            {props.message && <p className="text-[15px] text-ink-soft">{props.message}</p>}
            <button
              type="button"
              onClick={props.onStart}
              className="inline-flex items-center gap-2.5 rounded-full bg-teal text-paper px-7 py-4 text-[18px] font-semibold hover:bg-deep-teal active:scale-[0.98] motion-safe:transition-[transform,background-color]"
            >
              <Mic size={22} strokeWidth={2} aria-hidden /> Tap to start talking
            </button>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center gap-3" aria-live="polite">
            {you && (
              <p className="text-[16px] sm:text-[19px] leading-[1.45] text-ink-soft max-w-[46ch]">
                <span className="sr-only">You said: </span>
                {tail(you, 140)}
              </p>
            )}
            {hub && (
              <p className="text-[22px] sm:text-[30px] leading-[1.35] tracking-[-0.01em] text-ink max-w-[30ch] sm:max-w-[34ch] font-medium">
                {tail(hub, state === "speaking" ? 190 : 120)}
              </p>
            )}
            {state === "speaking" && <p className="text-[13px] text-ink-soft">Speak over it to interrupt.</p>}
            {props.sourcesOpen && props.sources.length > 0 ? (
              <div className="w-full max-w-[60ch] rounded-[12px] border border-line bg-cream/60 p-3 text-left">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-soft">Sources</span>
                  <button type="button" onClick={() => props.onSourcesOpen?.(false)} className="text-[12.5px] text-ink-soft hover:text-ink">
                    Hide
                  </button>
                </div>
                <ol className="list-decimal pl-5 space-y-1 max-h-[22vh] overflow-y-auto text-[13.5px] text-ink">
                  {props.sources.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ol>
              </div>
            ) : (
              props.sources.length > 0 &&
              (state === "speaking" || state === "listening") && (
                <button type="button" onClick={() => props.onSourcesOpen?.(true)} className="text-[12.5px] text-ink-soft underline underline-offset-2 hover:text-ink max-w-[60ch]">
                  From: {props.sources.slice(0, 2).join(" · ")}
                  {props.sources.length > 2 ? ` and ${props.sources.length - 2} more` : ""}. Show sources
                </button>
              )
            )}
            {!!props.cards?.length && (
              <div className="flex flex-wrap justify-center gap-2">
                {props.cards.map((c) => (
                  // A new tab from the reader's own tap: never blocked, and the conversation keeps going here.
                  <a key={c.href} href={c.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-teal bg-teal-wash px-4 py-2 text-[14px] text-ink">
                    Open {c.title} <span aria-hidden>↗</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {recNote && <p className="w-full max-w-[880px] mx-auto text-center text-[13px] text-ink-soft pb-2" role="status">{recNote}</p>}
      {/* Bottom: End, within thumb reach */}
      <div className="w-full max-w-[880px] mx-auto flex items-center justify-center gap-4 shrink-0">
        {!live && props.recording && (
          <button
            type="button"
            onClick={() => setRecNote(props.onDownloadRecording?.() ?? null)}
            className="rounded-full border border-amber bg-paper px-5 h-14 text-[15px] text-ink hover:bg-cream"
          >
            Download test recording
          </button>
        )}
        {!live && (
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-full border border-line bg-paper px-5 h-14 text-[15px] text-ink-soft hover:bg-cream"
          >
            Type instead
          </button>
        )}
        <button
          ref={endRef}
          type="button"
          onClick={live ? props.onEnd : props.onClose}
          aria-label={live ? "End voice conversation" : "Close talk mode"}
          className="inline-flex items-center gap-2 rounded-full bg-ink text-paper px-7 h-14 text-[16px] font-semibold hover:bg-deep-teal active:scale-[0.98] motion-safe:transition-[transform,background-color]"
        >
          <X size={20} strokeWidth={2.2} aria-hidden /> {live ? "End" : "Close"}
        </button>
      </div>
    </div>,
    document.body,
  );
}
