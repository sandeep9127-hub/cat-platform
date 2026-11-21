"use client";

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
export type VoiceLang = "en" | "hi";

export type AnswerHandlers = { onDelta: (text: string) => void; onDone: () => void; onError: (message: string) => void };

const STT_URL = "wss://stt-rt.soniox.com/transcribe-websocket";
const TTS_URL = "wss://tts-rt.soniox.com/tts-websocket";
const TTS_RATE = 24000;

// Landscape names speech-to-text often mishears ("Patrutu", "Vempali").
const PLACES = ["Ahwa", "Chitrakonda", "Dantewada", "Dharashiv", "Khatarshnong", "Laitkroh", "Patharpratima", "Patratu", "Rajnagar", "Vempalli"];

function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/** Snap near-miss spellings of landscape names to the library's spelling. */
export function fixPlaceNames(text: string): string {
  return text.replace(/\p{L}{5,}/gu, (w) => {
    const lw = w.toLowerCase();
    for (const p of PLACES) {
      const lp = p.toLowerCase();
      if (lw === lp) return w;
      const max = lp.length <= 6 ? 1 : 2;
      if (Math.abs(lw.length - lp.length) <= max && distance(lw, lp) <= max) return p;
    }
    return w;
  });
}

export function useVoice(opts: {
  /** Ask the Hub one spoken question; the handlers stream the answer back. */
  ask: (question: string, handlers: AnswerHandlers) => void;
  /** Cancel the answer in flight (marks it interrupted). */
  stopAnswer: () => void;
  /** The reader talked over the Hub: tag the cut-off answer. */
  onInterrupt?: () => void;
  voiceName: VoiceName;
  language: VoiceLang;
}) {
  const [state, setStateRaw] = useState<VoiceState>("off");
  const [heard, setHeard] = useState(""); // live words while listening
  const [caption, setCaption] = useState(""); // what the Hub is saying
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);

  const stateRef = useRef<VoiceState>("off");
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const r = useRef({
    stt: null as WebSocket | null,
    tts: null as WebSocket | null,
    session: "",
    speechKey: null as Promise<string | null> | null,
    ttsQueue: [] as string[],
    media: null as MediaStream | null,
    rec: null as MediaRecorder | null,
    micCtx: null as AudioContext | null,
    playCtx: null as AudioContext | null,
    raf: 0,
    finalText: "",
    streamId: "",
    seq: 0,
    sources: [] as AudioBufferSourceNode[],
    nextTime: 0,
    audioEnded: false,
    textBuf: "",
    answerDone: false,
    /** An answer is coming: open the TTS stream on its first words (a stream with no text times out). */
    wantSpeech: false,
    endTimer: 0 as unknown as ReturnType<typeof setTimeout>,
    keepalive: 0 as unknown as ReturnType<typeof setInterval>,
  });

  const setState = (s: VoiceState) => {
    stateRef.current = s;
    setStateRaw(s);
  };

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
      let m: { stream_id?: string; audio?: string; audio_end?: boolean; terminated?: boolean; error_message?: string };
      try {
        m = JSON.parse(typeof ev.data === "string" ? ev.data : "");
      } catch {
        return;
      }
      if (!m.stream_id || m.stream_id !== c.streamId) return; // an old, cancelled turn
      if (m.audio) playChunk(m.audio);
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
      if (stateRef.current === "speaking" || stateRef.current === "thinking") {
        c.streamId = "";
        sendAgentText("", true);
        setState("listening");
      }
    }, wait + 150);
  };

  const playChunk = (b64: string) => {
    const ctx = r.current.playCtx;
    if (!ctx || !b64) return;
    const bin = atob(b64);
    const n = Math.floor(bin.length / 2);
    if (!n) return;
    const buf = ctx.createBuffer(1, n, TTS_RATE);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < n; i++) {
      const v = bin.charCodeAt(i * 2) | (bin.charCodeAt(i * 2 + 1) << 8);
      ch[i] = (v >= 0x8000 ? v - 0x10000 : v) / 0x8000;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    const at = Math.max(r.current.nextTime, ctx.currentTime + 0.05);
    src.start(at);
    r.current.nextTime = at + buf.duration;
    r.current.sources.push(src);
    src.onended = () => {
      r.current.sources = r.current.sources.filter((x) => x !== src);
    };
    if (stateRef.current === "thinking") setState("speaking");
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
    sendTts({ stream_id: c.streamId, text: piece, text_end: end });
    sendAgentText(piece, false);
  };

  const startSpeechStream = () => {
    const c = r.current;
    const streamId = `turn-${++c.seq}`;
    c.streamId = streamId;
    c.audioEnded = false;
    c.textBuf = "";
    c.ttsQueue = [];
    // The previous answer's connection used up its single-use key: never reuse it.
    try {
      c.tts?.close();
    } catch {}
    c.tts = null;
    const keyPromise = c.speechKey ?? Promise.resolve(null);
    void keyPromise.then((key) => {
      if (r.current.streamId !== streamId) return; // interrupted meanwhile
      if (key) connectTts(key);
      else {
        // No speech for this answer (daily limit or expired session): it stays as text.
        r.current.audioEnded = true;
        maybeFinished();
      }
    });
    sendTts({
      stream_id: c.streamId,
      model: "tts-rt-v2",
      language: optsRef.current.language,
      voice: optsRef.current.voiceName,
      audio_format: "pcm_s16le",
      sample_rate: TTS_RATE,
    });
  };

  /* ─── a spoken turn ─── */

  const askTurn = (question: string) => {
    setHeard("");
    setCaption("");
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
    optsRef.current.ask(question, {
      onDelta: (t) => {
        said += t;
        setCaption(said.replace(/\[\d+\]/g, ""));
        speak(t, false);
      },
      onDone: () => {
        speak("", true);
        r.current.answerDone = true;
        r.current.wantSpeech = false;
        if (!r.current.streamId || !said) {
          setState("listening");
          return;
        }
        maybeFinished();
      },
      onError: (m) => {
        setError(m);
        cancelSpeech();
        setState("listening");
      },
    });
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
    Object.assign(c, { stt: null, tts: null, session: "", speechKey: null, ttsQueue: [], media: null, rec: null, micCtx: null, playCtx: null, finalText: "", streamId: "" });
    setHeard("");
    setCaption("");
    setLevel(0);
    setStartedAt(null);
    setState("off");
  }, [cancelSpeech]);

  const start = useCallback(async () => {
    if (stateRef.current !== "off") return;
    setError(null);
    setState("connecting");
    const c = r.current;
    try {
      // Audio contexts must start inside the click that opened voice.
      c.playCtx = new AudioContext();
      const res = await fetch("/api/agent/voice", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      const keys = (await res.json().catch(() => ({}))) as { stt?: string; session?: string; maxSeconds?: number; error?: string };
      if (!res.ok || !keys.stt || !keys.session) throw new Error(keys.error || "Voice is temporarily unavailable.");
      c.session = keys.session;

      c.media = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });

      // Level meter for the waveform.
      c.micCtx = new AudioContext();
      const analyser = c.micCtx.createAnalyser();
      analyser.fftSize = 512;
      c.micCtx.createMediaStreamSource(c.media).connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let peak = 0;
        for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
        setLevel(Math.min(1, peak / 64));
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
            language_hints: ["en", "hi"],
            enable_endpoint_detection: true,
            enable_agent_text_input: true,
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
      };
      stt.onmessage = (ev) => {
        let m: { tokens?: { text: string; is_final: boolean }[]; error_message?: string; finished?: boolean };
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
        let nonFinal = "";
        let endpoint = false;
        for (const t of m.tokens ?? []) {
          if (t.text === "<end>") {
            if (t.is_final) endpoint = true;
          } else if (t.is_final) c.finalText += t.text;
          else nonFinal += t.text;
        }
        const live = `${c.finalText}${nonFinal}`;
        // Real words (not noise) while the Hub is busy mean the reader is talking over it.
        if ((stateRef.current === "speaking" || stateRef.current === "thinking") && /[\p{L}\p{N}].*[\p{L}\p{N}]/u.test(live.trim())) {
          interrupt();
        }
        if (stateRef.current === "listening") setHeard(live.trim());
        if (endpoint) {
          const q = fixPlaceNames(c.finalText.trim());
          c.finalText = "";
          if (q.length > 1 && stateRef.current === "listening") askTurn(q);
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

  useEffect(() => () => end(), [end]);

  return { state, heard, caption, level, error, start, end, startedAt, interrupt };
}
