"use client";

import { LANGUAGES, dominantLanguage, sttHints, type LangCode } from "@/lib/ask/languages";
import { initialTurnState, stepTurn, type TurnAction, type TurnEvent } from "@/lib/voice/turns";
import { toSpoken } from "@/lib/ask/spoken";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Ask voice engine (docs/hub-v2-design.md §6.1, docs/ask-ui-spec.md §5).
 *
 *   mic (echo cancellation on) ──MediaRecorder webm──▶ Soniox stt-rt-v6 (endpoint detection)
 *   "<end>" token ──▶ ask(question) ──deltas──▶ Soniox tts-rt-v2 ──PCM──▶ Web Audio playback
 *
 * Interruption: new speech while the Hub is thinking or speaking stops playback,
 * cancels the TTS stream and the answer, and goes straight back to listening.
 * The Hub's own words are sent to STT as agent text so it doesn't "hear itself".
 * Keys are short-lived and come from the server; the real key never leaves it. The
 * listening key opens one stream per session; each answer gets its own single-use
 * speech key (fetched while the Hub is thinking) and its own speech connection.
 */

export type VoiceState = "off" | "connecting" | "listening" | "thinking" | "speaking";
export type VoiceName = "Ashok" | "Shalini";
/** "auto" follows the speaker turn by turn; a language code fixes the reply language. */
export type VoiceLang = "auto" | LangCode;

/** What the turn engine knew about a spoken turn (sent to the server's turn judge). */
export type TurnMeta = { speaker: "main" | "other"; confidence: number; afterQuestion: boolean };

export type AnswerHandlers = {
  onDelta: (text: string) => void;
  /** endVoice: the reader closed the conversation ("we can stop"); end after the reply is spoken. */
  onDone: (o?: { endVoice?: boolean }) => void;
  onError: (message: string) => void;
};

const STT_URL = "wss://stt-rt.soniox.com/transcribe-websocket";
const TTS_URL = "wss://tts-rt.soniox.com/tts-websocket";
const TTS_RATE = 24000;

// Landscape names speech-to-text often mishears ("Patrutu", "Vempali"). The server
// sends the current list with the session; this is the fallback.
const DEFAULT_PLACES = ["Ahwa", "Chitrakonda", "Dantewada", "Dharashiv", "Khatarshnong", "Laitkroh", "Pangi", "Patharpratima", "Patratu", "Rajnagar", "Vempalli"];

function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/** "P-A-T-T-R-A-T-U" / "P A T R A T U" / "P.A.T." → "PATTRATU": rejoin words spoken letter by letter. */
export function joinSpelledLetters(text: string): string {
  return text.replace(/(?<![\p{L}\p{N}])\p{L}(?:[-.\s]+\p{L}(?![\p{L}\p{N}])){2,}\.?/gu, (m) => m.replace(/[-.\s]+/g, ""));
}

/** Snap near-miss spellings of landscape names to the library's spelling. */
export function fixPlaceNames(text: string, places: string[] = DEFAULT_PLACES): string {
  return joinSpelledLetters(text).replace(/\p{L}{5,}/gu, (w) => {
    const lw = w.toLowerCase();
    for (const p of places) {
      const lp = p.toLowerCase();
      if (lw === lp) return p;
      const max = lp.length <= 6 ? 1 : 2;
      if (Math.abs(lw.length - lp.length) <= max && distance(lw, lp) <= max) return p;
    }
    return w;
  });
}

export function useVoice(opts: {
  /** Ask the Hub one spoken question in `lang`; the handlers stream the answer back. */
  ask: (question: string, handlers: AnswerHandlers, lang: LangCode, turn?: TurnMeta) => void;
  /** Cancel the answer in flight (marks it interrupted). */
  stopAnswer: () => void;
  /** The reader talked over the Hub: tag the cut-off answer. */
  onInterrupt?: () => void;
  voiceName: VoiceName;
  language: VoiceLang;
  /** Voice agent turn-taking (VOICE_AGENT=on): the turn engine decides when to answer, duck, stop or ignore. */
  agent?: boolean;
  /**
   * Staff test sessions (?record=1): keep what the turn engine saw and decided, words
   * and timings only, never audio, in this tab until "Download test recording".
   */
  record?: boolean;
}) {
  const [state, setStateRaw] = useState<VoiceState>("off");
  const [heard, setHeard] = useState(""); // live words while listening
  const [caption, setCaption] = useState(""); // what the Hub is saying
  const [lastQuestion, setLastQuestion] = useState(""); // what the reader last asked
  const [level, setLevel] = useState(0); // mic input level, 0–1
  const [outLevel, setOutLevel] = useState(0); // the Hub's voice level, 0–1 (drives the logo)
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);

  const stateRef = useRef<VoiceState>("off");
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const r = useRef({
    stt: null as WebSocket | null,
    tts: null as WebSocket | null,
    session: "",
    places: DEFAULT_PLACES,
    speechKey: null as Promise<string | null> | null,
    ttsQueue: [] as string[],
    media: null as MediaStream | null,
    rec: null as MediaRecorder | null,
    micCtx: null as AudioContext | null,
    playCtx: null as AudioContext | null,
    outAnalyser: null as AnalyserNode | null,
    /** Volume of the Hub's voice: lowered ("ducked") while the reader may be cutting in. */
    outGain: null as GainNode | null,
    /** Voice agent turn engine state (lib/voice/turns.ts). */
    engine: initialTurnState(),
    /** ?record=1: the engine's events and decisions this session (no audio). */
    recording: [] as { ev: TurnEvent; actions: TurnAction[] }[],
    recordingStarted: "",
    engineTick: 0 as unknown as ReturnType<typeof setInterval>,
    /** The answer being spoken, to tell whether it ended with a question. */
    lastAnswer: "",
    /**
     * Voice agent: the Hub's words waiting to be sent to speech-to-text as agent text,
     * each timed to when the reader hears it (from TTS character timestamps), so Soniox
     * can tell the Hub's own voice in the mic from the reader's.
     */
    agentQueue: [] as { at: number; text: string }[],
    /** Seconds of this answer's audio received so far (TTS timestamps count from 0 per stream). */
    ttsStreamTime: 0,
    raf: 0,
    finalText: "",
    /** This turn's final tokens with their language tags (language identification). */
    turnTokens: [] as { text: string; language?: string }[],
    /** The language of the answer being spoken. */
    replyLang: "en" as LangCode,
    streamId: "",
    seq: 0,
    sources: [] as AudioBufferSourceNode[],
    nextTime: 0,
    audioEnded: false,
    textBuf: "",
    answerDone: false,
    /** An answer is coming: open the TTS stream on its first words (a stream with no text times out). */
    wantSpeech: false,
    /** End the session once the current reply has been spoken. */
    endAfter: false,
    endTimer: 0 as unknown as ReturnType<typeof setTimeout>,
    keepalive: 0 as unknown as ReturnType<typeof setInterval>,
  });

  const setState = (s: VoiceState) => {
    stateRef.current = s;
    setStateRaw(s);
    if (optsRef.current.agent) {
      const mode = s === "thinking" ? "thinking" : s === "speaking" ? "speaking" : s === "listening" ? "idle" : null;
      if (mode) runEngineRef.current?.({ type: "hub", mode, now: Date.now(), askedQuestion: mode === "idle" ? /[?？]\s*$/.test(r.current.lastAnswer.trim()) : undefined });
    }
  };

  /** Lower or restore the Hub's voice smoothly. */
  const setDuck = (on: boolean) => {
    const c = r.current;
    if (c.outGain && c.playCtx) c.outGain.gain.setTargetAtTime(on ? 0.25 : 1, c.playCtx.currentTime, 0.04);
  };

  /** Feed one event to the turn engine and carry out what it decides. */
  const runEngine = (ev: TurnEvent) => {
    const c = r.current;
    const { state: next, actions } = stepTurn(c.engine, ev);
    c.engine = next;
    if (optsRef.current.record && (ev.type !== "tick" || actions.length)) {
      c.recording.push({ ev, actions });
      if (c.recording.length > 20000) c.recording.shift(); // a long session: keep the latest
    }
    for (const a of actions) {
      if (a.type === "duck") setDuck(true);
      else if (a.type === "resume") setDuck(false);
      else if (a.type === "stop") {
        setDuck(false);
        if (stateRef.current === "thinking" || stateRef.current === "speaking") interrupt();
      } else if (a.type === "submit") {
        if (stateRef.current !== "listening") continue;
        const q = fixPlaceNames(a.text, c.places);
        const pick = optsRef.current.language;
        if (q.length > 1) askTurn(q, pick === "auto" ? a.lang : pick, { speaker: a.speaker, confidence: a.confidence, afterQuestion: a.afterQuestion });
      } else if (a.type === "ignore") setHeard("");
    }
    if (stateRef.current === "listening" && ev.type === "tokens") {
      setHeard([...c.engine.turn, ...c.engine.live].map((t) => t.text).join("").trim());
    }
  };
  const runEngineRef = useRef<((ev: TurnEvent) => void) | null>(null);
  runEngineRef.current = runEngine;

  /* ─── speech out ─── */

  /** Send to this answer's TTS connection, queueing until it opens. */
  const sendTts = (obj: unknown) => {
    const c = r.current;
    const msg = JSON.stringify(obj);
    if (c.tts?.readyState === WebSocket.OPEN) {
      c.tts.send(msg);
      return;
    }
    c.ttsQueue.push(msg); // flushed when this answer's speech connection opens
  };

  /** One speech connection per answer, opened with that answer's single-use key. */
  const connectTts = (key: string) => {
    const c = r.current;
    try {
      c.tts?.close();
    } catch {}
    const ws = new WebSocket(TTS_URL, ["soniox-api-key", key]);
    c.tts = ws;
    ws.onopen = () => {
      for (const m of c.ttsQueue.splice(0)) ws.send(m);
    };
    ws.onmessage = (ev) => {
      let m: {
        stream_id?: string;
        audio?: string;
        audio_end?: boolean;
        terminated?: boolean;
        error_message?: string;
        timestamps?: { characters?: string[]; character_start_times_seconds?: number[] };
      };
      try {
        m = JSON.parse(typeof ev.data === "string" ? ev.data : "");
      } catch {
        return;
      }
      if (!m.stream_id || m.stream_id !== c.streamId) return; // an old, cancelled turn
      if (m.audio) {
        const t0 = c.ttsStreamTime;
        const played = playChunk(m.audio);
        if (played) {
          c.ttsStreamTime += played.dur;
          // Each character is heard at (when this chunk plays) + (its time within the stream − the chunk's start).
          const chars = m.timestamps?.characters ?? [];
          const starts = m.timestamps?.character_start_times_seconds ?? [];
          if (optsRef.current.agent && chars.length && starts.length === chars.length) {
            let word = "";
            let wordAt = 0;
            for (let i = 0; i < chars.length; i++) {
              if (!word) wordAt = played.at + Math.max(0, starts[i] - t0);
              word += chars[i];
              if (/\s/.test(chars[i]) || i === chars.length - 1) {
                c.agentQueue.push({ at: wordAt, text: word });
                word = "";
              }
            }
          }
        }
      }
      if (m.audio_end || m.terminated || m.error_message) {
        c.audioEnded = true;
        maybeFinished();
      }
    };
  };

  const sendAgentText = (text: string, end: boolean) => {
    const ws = r.current.stt;
    if (ws?.readyState === WebSocket.OPEN && (text || end)) ws.send(JSON.stringify({ type: "agent_text", text, end_of_segment: end }));
  };

  /** Agent text lead: Soniox wants each piece 0.5–1 s before the reader hears it. */
  const AGENT_TEXT_LEAD = 0.6;

  /** Send the Hub's words that are about to be heard (or, with `upTo`, everything heard so far). */
  const flushAgentText = (upTo?: number) => {
    const c = r.current;
    const ctx = c.playCtx;
    if (!ctx || !c.agentQueue.length) return;
    const limit = upTo ?? ctx.currentTime + AGENT_TEXT_LEAD;
    let text = "";
    while (c.agentQueue.length && c.agentQueue[0].at <= limit) text += c.agentQueue.shift()!.text;
    if (text) sendAgentText(text, false);
  };

  const stopPlayback = () => {
    for (const s of r.current.sources) {
      try {
        s.stop();
      } catch {}
    }
    r.current.sources = [];
    r.current.nextTime = 0;
  };

  const cancelSpeech = useCallback(() => {
    // Cut off mid-answer: tell speech-to-text only what the reader actually heard, then close the segment.
    if (r.current.playCtx) flushAgentText(r.current.playCtx.currentTime);
    r.current.agentQueue = [];
    const { tts, streamId } = r.current;
    if (streamId && tts?.readyState === WebSocket.OPEN) tts.send(JSON.stringify({ stream_id: streamId, cancel: true }));
    try {
      tts?.close();
    } catch {}
    r.current.tts = null;
    r.current.speechKey = null;
    r.current.ttsQueue = [];
    r.current.wantSpeech = false;
    r.current.streamId = "";
    r.current.textBuf = "";
    stopPlayback();
    sendAgentText("", true);
  }, []);

  /** Back to listening once the last scheduled audio has played. */
  const maybeFinished = () => {
    const c = r.current;
    if (!c.answerDone || !c.audioEnded) return;
    const ctx = c.playCtx;
    const wait = ctx ? Math.max(0, (c.nextTime - ctx.currentTime) * 1000) : 0;
    window.setTimeout(() => {
      if (c.endAfter) {
        c.endAfter = false;
        endRef.current?.();
        return;
      }
      if (stateRef.current === "speaking" || stateRef.current === "thinking") {
        c.streamId = "";
        flushAgentText(Infinity);
        c.agentQueue = [];
        sendAgentText("", true);
        setState("listening");
      }
    }, wait + 150);
  };

  /** Schedule one chunk of the Hub's voice; returns when it plays and how long it is (seconds). */
  const playChunk = (b64: string): { at: number; dur: number } | null => {
    const ctx = r.current.playCtx;
    if (!ctx || !b64) return null;
    const bin = atob(b64);
    const n = Math.floor(bin.length / 2);
    if (!n) return null;
    const buf = ctx.createBuffer(1, n, TTS_RATE);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < n; i++) {
      const v = bin.charCodeAt(i * 2) | (bin.charCodeAt(i * 2 + 1) << 8);
      ch[i] = (v >= 0x8000 ? v - 0x10000 : v) / 0x8000;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(r.current.outGain ?? r.current.outAnalyser ?? ctx.destination);
    const at = Math.max(r.current.nextTime, ctx.currentTime + 0.05);
    src.start(at);
    r.current.nextTime = at + buf.duration;
    r.current.sources.push(src);
    src.onended = () => {
      r.current.sources = r.current.sources.filter((x) => x !== src);
    };
    if (stateRef.current === "thinking") setState("speaking");
    return { at, dur: buf.duration };
  };

  /** Send answer text to TTS in sentence-sized pieces (citation markers removed). */
  const speak = (delta: string, end: boolean) => {
    const c = r.current;
    if (!c.streamId) {
      if (!c.wantSpeech || (!delta && !c.textBuf)) return;
      c.wantSpeech = false;
      startSpeechStream();
    }
    c.textBuf += delta.replace(/\[\d+\]/g, "");
    const cut = end ? c.textBuf.length : Math.max(c.textBuf.lastIndexOf(". "), c.textBuf.lastIndexOf("। "), c.textBuf.length > 160 ? c.textBuf.lastIndexOf(" ") : -1);
    if (cut <= 0 && !end) return;
    const piece = c.textBuf.slice(0, cut + (end ? 0 : 1));
    c.textBuf = c.textBuf.slice(piece.length);
    // Figures are spoken as words ("65.11 crore rupees"); the on-screen answer keeps "₹65.11 cr".
    const spoken = toSpoken(piece, c.replyLang);
    sendTts({ stream_id: c.streamId, text: spoken, text_end: end });
    // Voice agent: agent text follows playback (TTS timestamps) instead of being sent now.
    if (!optsRef.current.agent) sendAgentText(spoken, false);
  };

  const startSpeechStream = () => {
    const c = r.current;
    const streamId = `turn-${++c.seq}`;
    c.streamId = streamId;
    c.audioEnded = false;
    c.textBuf = "";
    c.ttsQueue = [];
    c.agentQueue = [];
    c.ttsStreamTime = 0;
    // The previous answer's connection used up its single-use key: never reuse it.
    try {
      c.tts?.close();
    } catch {}
    c.tts = null;
    // A language the Hub can't speak (no TTS row) stays as text, like a missing key.
    const ttsLang = LANGUAGES[c.replyLang].tts;
    const keyPromise = ttsLang ? (c.speechKey ?? Promise.resolve(null)) : Promise.resolve(null);
    void keyPromise.then((key) => {
      if (r.current.streamId !== streamId) return; // interrupted meanwhile
      if (key) connectTts(key);
      else {
        // No speech for this answer (daily limit, expired session, or text-only language): it stays as text.
        r.current.audioEnded = true;
        maybeFinished();
      }
    });
    sendTts({
      stream_id: c.streamId,
      model: "tts-rt-v2",
      language: ttsLang ?? "en",
      voice: optsRef.current.voiceName,
      audio_format: "pcm_s16le",
      sample_rate: TTS_RATE,
      // Character timings, so agent text reaches speech-to-text as the reader hears it.
      ...(optsRef.current.agent ? { return_timestamps: true } : {}),
    });
  };

  /* ─── a spoken turn ─── */

  const askTurn = (question: string, lang: LangCode, turn?: TurnMeta) => {
    r.current.replyLang = lang;
    r.current.lastAnswer = "";
    setHeard("");
    setCaption("");
    setLastQuestion(question);
    setState("thinking");
    r.current.streamId = "";
    r.current.wantSpeech = true;
    r.current.answerDone = false;
    r.current.audioEnded = false;
    // Fetch this answer's speech key while the Hub searches and thinks.
    r.current.speechKey = fetch("/api/agent/voice/speech", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ session: r.current.session }),
    })
      .then(async (res) => {
        const j = (await res.json().catch(() => ({}))) as { tts?: string; error?: string };
        if (!res.ok || !j.tts) {
          if (j.error) setError(j.error);
          return null;
        }
        return j.tts;
      })
      .catch(() => null);
    let said = "";
    let settled = false;
    // Voice agent: if nothing has come back after a moment, say so instead of sitting in silence.
    // Side talk is dropped by the server well before this, so it never triggers the line.
    const ackTimer = optsRef.current.agent
      ? window.setTimeout(() => {
          if (settled || said || stateRef.current !== "thinking") return;
          speak(`${LANGUAGES[lang].turns.ack.plain} `, false);
        }, 1300)
      : 0;
    const settle = () => {
      settled = true;
      window.clearTimeout(ackTimer);
    };
    optsRef.current.ask(question, {
      onDelta: (t) => {
        settle();
        said += t;
        r.current.lastAnswer = said;
        setCaption(said.replace(/\[\d+\]/g, ""));
        speak(t, false);
      },
      onDone: (o) => {
        settle();
        if (o?.endVoice) r.current.endAfter = true;
        speak("", true);
        r.current.answerDone = true;
        r.current.wantSpeech = false;
        if (!r.current.streamId || !said) {
          // Nothing to say (side talk dropped, or empty): stop a "one moment" line that may have started.
          if (r.current.streamId) cancelSpeech();
          if (r.current.endAfter) {
            r.current.endAfter = false;
            endRef.current?.();
            return;
          }
          setState("listening");
          return;
        }
        maybeFinished();
      },
      onError: (m) => {
        settle();
        setError(m);
        cancelSpeech();
        setState("listening");
      },
    }, lang, turn);
  };

  const interrupt = () => {
    cancelSpeech();
    optsRef.current.stopAnswer();
    optsRef.current.onInterrupt?.();
    setCaption("");
    setState("listening");
  };

  /* ─── session ─── */

  const end = useCallback(() => {
    const c = r.current;
    clearTimeout(c.endTimer);
    clearInterval(c.keepalive);
    clearInterval(c.engineTick);
    cancelAnimationFrame(c.raf);
    if (stateRef.current === "thinking" || stateRef.current === "speaking") {
      cancelSpeech();
      optsRef.current.stopAnswer();
    }
    try {
      if (c.rec && c.rec.state !== "inactive") c.rec.stop();
    } catch {}
    c.media?.getTracks().forEach((t) => t.stop());
    try {
      if (c.stt?.readyState === WebSocket.OPEN) c.stt.send(""); // ask Soniox to finish
      c.stt?.close();
    } catch {}
    try {
      c.tts?.close();
    } catch {}
    void c.micCtx?.close().catch(() => {});
    void c.playCtx?.close().catch(() => {});
    Object.assign(c, { stt: null, tts: null, session: "", speechKey: null, ttsQueue: [], media: null, rec: null, micCtx: null, playCtx: null, outAnalyser: null, outGain: null, finalText: "", turnTokens: [], streamId: "" });
    setHeard("");
    setCaption("");
    setLevel(0);
    setOutLevel(0);
    setStartedAt(null);
    setState("off");
  }, [cancelSpeech]);

  const start = useCallback(async () => {
    if (stateRef.current !== "off") return;
    setError(null);
    setLastQuestion("");
    setState("connecting");
    const c = r.current;
    try {
      // Audio contexts must start inside the click that opened voice.
      c.playCtx = new AudioContext();
      // Speech goes through an analyser so the talk-mode logo can follow the Hub's voice.
      c.outAnalyser = c.playCtx.createAnalyser();
      c.outAnalyser.fftSize = 512;
      c.outAnalyser.connect(c.playCtx.destination);
      c.outGain = c.playCtx.createGain();
      c.outGain.connect(c.outAnalyser);
      c.engine = initialTurnState(Date.now());
      c.recording = [];
      c.recordingStarted = new Date().toISOString();
      c.lastAnswer = "";
      // Microphone first: a blocked mic shouldn't reserve a paid session.
      c.media = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });
      const res = await fetch("/api/agent/voice", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      const keys = (await res.json().catch(() => ({}))) as {
        stt?: string;
        session?: string;
        maxSeconds?: number;
        context?: unknown;
        places?: string[];
        error?: string;
      };
      if (!res.ok || !keys.stt || !keys.session) throw new Error(keys.error || "Voice is temporarily unavailable.");
      c.session = keys.session;
      if (Array.isArray(keys.places) && keys.places.length) c.places = keys.places;
      const sttContext = keys.context;

      // Level meter for the waveform.
      c.micCtx = new AudioContext();
      const analyser = c.micCtx.createAnalyser();
      analyser.fftSize = 512;
      c.micCtx.createMediaStreamSource(c.media).connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      const out = new Uint8Array(512);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let peak = 0;
        for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
        setLevel(Math.min(1, peak / 64));
        if (optsRef.current.agent) flushAgentText();
        if (c.outAnalyser) {
          c.outAnalyser.getByteTimeDomainData(out);
          let sum = 0;
          for (const v of out) sum += (v - 128) * (v - 128);
          setOutLevel(Math.min(1, Math.sqrt(sum / out.length) / 28));
        }
        c.raf = requestAnimationFrame(tick);
      };
      tick();


      // Speech in.
      const stt = new WebSocket(STT_URL, ["soniox-api-key", keys.stt]);
      c.stt = stt;
      stt.onopen = () => {
        stt.send(
          JSON.stringify({
            model: "stt-rt-v6",
            audio_format: "auto",
            language_hints: sttHints(),
            // Tags each token with its language, so the Hub replies in the language spoken.
            enable_language_identification: true,
            enable_endpoint_detection: true,
            enable_agent_text_input: true,
            // Landscape names, places and scheme names, so "Patratu" isn't heard as "Patriarchal".
            ...(sttContext ? { context: sttContext } : {}),
            // Voice agent: who is speaking (free in the real-time price), and end-of-turn
            // detection tuned as Soniox suggests for voice agents (docs/voice-agent-plan.md).
            ...(optsRef.current.agent
              ? { enable_speaker_diarization: true, endpoint_latency_adjustment_level: 2, endpoint_sensitivity: 0.3, max_endpoint_delay_ms: 1500 }
              : {}),
          }),
        );
        const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"].find((t) => MediaRecorder.isTypeSupported(t));
        const rec = new MediaRecorder(c.media!, mime ? { mimeType: mime } : undefined);
        c.rec = rec;
        rec.ondataavailable = (e) => {
          if (e.data.size && stt.readyState === WebSocket.OPEN) stt.send(e.data);
        };
        rec.start(120);
        // Soniox ends a stream after 20 s without data; keep it open through long pauses.
        c.keepalive = setInterval(() => {
          if (stt.readyState === WebSocket.OPEN) stt.send(JSON.stringify({ type: "keepalive" }));
        }, 10_000);
        setState("listening");
        setStartedAt(Date.now());
        if (optsRef.current.agent) c.engineTick = setInterval(() => runEngineRef.current?.({ type: "tick", now: Date.now() }), 100);
      };
      stt.onmessage = (ev) => {
        let m: {
          tokens?: { text: string; is_final: boolean; language?: string; speaker?: string; start_ms?: number; end_ms?: number; confidence?: number }[];
          error_message?: string;
          finished?: boolean;
        };
        try {
          m = JSON.parse(String(ev.data));
        } catch {
          return;
        }
        if (m.error_message) {
          setError("Voice stopped. You can type your question instead.");
          end();
          return;
        }
        if (optsRef.current.agent) {
          // The turn engine decides: answer, wait, duck, stop or ignore.
          const toks = m.tokens ?? [];
          const now = Date.now();
          runEngine({
            type: "tokens",
            now,
            tokens: toks
              .filter((t) => t.text !== "<end>")
              .map((t) => ({ text: t.text, isFinal: t.is_final, speaker: t.speaker, language: t.language, startMs: t.start_ms, endMs: t.end_ms, confidence: t.confidence })),
          });
          if (toks.some((t) => t.text === "<end>" && t.is_final)) runEngine({ type: "endpoint", now });
          return;
        }
        let nonFinal = "";
        let endpoint = false;
        for (const t of m.tokens ?? []) {
          if (t.text === "<end>") {
            if (t.is_final) endpoint = true;
          } else if (t.is_final) {
            c.finalText += t.text;
            c.turnTokens.push({ text: t.text, language: t.language });
          }
          else nonFinal += t.text;
        }
        const live = `${c.finalText}${nonFinal}`;
        // Real words (not noise) while the Hub is busy mean the reader is talking over it.
        if ((stateRef.current === "speaking" || stateRef.current === "thinking") && /[\p{L}\p{N}].*[\p{L}\p{N}]/u.test(live.trim())) {
          interrupt();
        }
        if (stateRef.current === "listening") setHeard(live.trim());
        if (endpoint) {
          const q = fixPlaceNames(c.finalText.trim(), c.places);
          const pick = optsRef.current.language;
          const lang = pick === "auto" ? dominantLanguage(c.turnTokens) : pick;
          c.finalText = "";
          c.turnTokens = [];
          if (q.length > 1 && stateRef.current === "listening") askTurn(q, lang);
        }
      };
      stt.onclose = () => {
        if (stateRef.current !== "off") end();
      };
      stt.onerror = () => setError("Voice connection failed. You can type your question instead.");

      c.endTimer = setTimeout(end, (keys.maxSeconds ?? 600) * 1000);
    } catch (e) {
      const msg =
        (e as Error).name === "NotAllowedError"
          ? "The microphone is blocked. Allow it in your browser to talk to the Hub."
          : (e as Error).message || "Voice is temporarily unavailable.";
      setError(msg);
      end();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [end]);

  const endRef = useRef<(() => void) | null>(null);
  endRef.current = end;
  useEffect(() => () => end(), [end]);

  /** The test recording as JSON (scripts/voice-replay.ts --file), or null when there is none. */
  const exportRecording = useCallback((): string | null => {
    const c = r.current;
    if (!c.recording.length) return null;
    return JSON.stringify(
      {
        kind: "cat-voice-recording",
        version: 1,
        startedAt: c.recordingStarted,
        note: "Turn engine events and decisions from a staff test session. Words and timings only; no audio.",
        voice: optsRef.current.voiceName,
        language: optsRef.current.language,
        steps: c.recording,
      },
      null,
      1,
    );
  }, []);

  return { state, heard, caption, lastQuestion, level, outLevel, error, start, end, startedAt, interrupt, exportRecording };
}
