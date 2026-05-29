"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  PRINCIPLES,
  LEVELS,
  levelOf,
  type Principle,
} from "@/lib/data/principles";
import { PrincipleWheel, type WheelPalette } from "./PrincipleWheel";

// Cream palette — warm off-white surface with a teal accent (Hub brand).
// Two semantic level colours (agro = green, food = amber) independent of the
// accent: light-green sectors for the agroecosystem half, warm-tan for the
// food-system half, meeting at a forest-green hub.
const PALETTE: WheelPalette = {
  bg: "#fbf8f2",
  // Light teal so the dark line-art emblem stays legible on the active
  // wedge (a dark teal fill killed contrast and ghosted the emblem edge).
  accent: "#a7cdd2",
  accentInk: "#14333a",
  hub: "#1e3a1c",
  hubInk: "#f4f3ec",
  hubMuted: "#a9bda1",
  hubRing: "rgba(255,255,255,.14)",
  levels: {
    agro: { band: "#5f8d3e", sector: "#dde4cf", ink: "#26331f" },
    food: { band: "#b5793a", sector: "#ece0cd", ink: "#46381f" },
  },
};

const LEVEL_CHIP = {
  agro: { dot: "#5f8d3e", text: "#4e7a2e" },
  food: { dot: "#b5793a", text: "#9a6526" },
};

export function PrinciplesExplorer() {
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  // Deep link via hash on first paint.
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    const found = PRINCIPLES.find((p) => p.slug === hash);
    if (found) setSelected(found.n);
  }, []);

  // Keep hash in sync.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const slug = selected ? PRINCIPLES.find((p) => p.n === selected)?.slug : "";
    const next = slug ? `#${slug}` : window.location.pathname;
    window.history.replaceState(null, "", next);
  }, [selected]);

  const go = useCallback((dir: number) => {
    setSelected((cur) => {
      const base = cur ?? (dir > 0 ? 0 : 1);
      let n = base + dir;
      if (n < 1) n = PRINCIPLES.length;
      if (n > PRINCIPLES.length) n = 1;
      return n;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
      if (selected != null) {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          go(1);
        }
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          go(-1);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, go]);

  const selP = selected ? PRINCIPLES.find((p) => p.n === selected) ?? null : null;

  return (
    <div className="ae">
      <div className="ae-main">
        {/* SIDEBAR */}
        <nav className="ae-sidebar" aria-label="The 13 principles">
          <ul className="ae-list">
            {PRINCIPLES.map((p) => {
              const on = p.n === selected;
              const lk = levelOf(p.n);
              const header =
                p.n === 1 || p.n === 8 ? (
                  <li className="ae-list-divider" key={`h${p.n}`} aria-hidden="true">
                    <span className="ae-list-divider-dot" style={{ background: PALETTE.levels[lk].band }} />
                    {LEVELS[lk].short}
                    <span className="ae-list-divider-range">
                      {LEVELS[lk].range.replace("Principles ", "")}
                    </span>
                  </li>
                ) : null;
              return (
                <li key={p.n} className="ae-list-cell">
                  {header}
                  <button
                    className={`ae-list-item${on ? " is-active" : ""}${
                      !on && p.n === hovered ? " is-hover" : ""
                    }`}
                    onClick={() => setSelected(p.n)}
                    onMouseEnter={() => setHovered(p.n)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <span className="ae-list-num">{String(p.n).padStart(2, "0")}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className="ae-list-emblem"
                      src={`/images/principle-icons/p${p.n}.png?v=4`}
                      alt=""
                      aria-hidden
                    />
                    <span className="ae-list-title">{p.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* STAGE — wheel hero */}
        <section className="ae-stage">
          <div className="ae-legend">
            {(["agro", "food"] as const).map((k) => (
              <div className="ae-legend-item" key={k}>
                <span className="ae-legend-dot" style={{ background: PALETTE.levels[k].band }} />
                <span className="ae-legend-name">{LEVELS[k].label}</span>
                <span className="ae-legend-range">{LEVELS[k].range.replace("Principles ", "")}</span>
              </div>
            ))}
          </div>
          <div className="ae-wheel-row">
            <button
              type="button"
              className="ae-rotate ae-rotate--prev"
              onClick={() => go(-1)}
              aria-label="Previous principle"
            >
              ‹
            </button>
            <PrincipleWheel
              principles={PRINCIPLES}
              selected={selected}
              hovered={hovered}
              onSelect={(n) => setSelected(n)}
              onHover={setHovered}
              palette={PALETTE}
            />
            <button
              type="button"
              className="ae-rotate ae-rotate--next"
              onClick={() => go(1)}
              aria-label="Next principle"
            >
              ›
            </button>
          </div>
        </section>

        {/* DETAIL */}
        <aside className="ae-detail-wrap">
          <Detail
            principle={selP}
            onPrev={() => go(-1)}
            onNext={() => go(1)}
            onClose={() => setSelected(null)}
          />
        </aside>
      </div>

      <Styles />
    </div>
  );
}

function Detail({
  principle,
  onPrev,
  onNext,
  onClose,
}: {
  principle: Principle | null;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  if (!principle) {
    return (
      <div className="ae-detail ae-detail--empty">
        <div className="ae-eyebrow">The framework</div>
        <h2 className="ae-detail-intro-title">Two scales of transformation</h2>
        <p className="ae-intro-lead">
          Agroecology applies ecological principles to farming and food systems — a science, a set
          of practices and a social movement. Its thirteen consolidated principles work at two
          scales: the first seven transform the <strong>agroecosystem</strong>, the last six
          transform the wider <strong>food system</strong>.
        </p>
        <p className="ae-intro-hint">Select a principle on the wheel or in the list to explore it.</p>
        <div className="ae-intro-groups">
          {(["agro", "food"] as const).map((k) => (
            <div className="ae-intro-level" key={k}>
              <span className="ae-intro-level-dot" style={{ background: LEVEL_CHIP[k].dot }} />
              <div>
                <div className="ae-intro-level-name">
                  {LEVELS[k].label}
                  <span className="ae-intro-level-range">{LEVELS[k].range}</span>
                </div>
                <div className="ae-intro-level-blurb">{LEVELS[k].blurb}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="ae-source">
          <span className="ae-source-label">Source</span>
          <p className="ae-source-text">
            The 13 principles are drawn from HLPE Report 14 (2019), the UN Committee on World Food
            Security&apos;s consolidated framework. The Hub assistant can answer questions from the
            full report.
          </p>
          <div className="ae-source-links">
            <a
              href="https://www.fao.org/3/ca5602en/ca5602en.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="ae-source-link"
            >
              Read the full report ↗
            </a>
            <a
              href="/publications/hlpe-report-14.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="ae-source-link"
            >
              Download PDF ↓
            </a>
          </div>
        </div>
      </div>
    );
  }

  const lk = levelOf(principle.n);
  return (
    <div className="ae-detail" key={principle.n}>
      <div className="ae-detail-head">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="ae-detail-emblem"
          src={`/images/principle-icons/p${principle.n}.png?v=4`}
          alt=""
        />
        <div className="ae-detail-num">{String(principle.n).padStart(2, "0")}</div>
        <button className="ae-detail-close" onClick={onClose} aria-label="Close detail">
          ×
        </button>
      </div>
      <div className="ae-detail-level" style={{ color: LEVEL_CHIP[lk].text }}>
        <span className="ae-chip-dot" style={{ background: LEVEL_CHIP[lk].dot }} />
        {LEVELS[lk].label}
        <span className="ae-detail-op">· {principle.group}</span>
      </div>
      <h2 className="ae-detail-title">{principle.title}</h2>
      <p className="ae-detail-def">{principle.definition}</p>
      <p className="ae-detail-body">{principle.body}</p>

      <div className="ae-detail-india">
        <span className="ae-india-label">In India</span>
        <p className="ae-india-text">{principle.inIndia}</p>
        <ul className="ae-levers">
          {principle.levers.map((l) => (
            <li key={l} className="ae-lever">
              {l}
            </li>
          ))}
        </ul>
      </div>

      {/* Grounded "read more" — answers from the HLPE report on demand */}
      <PrincipleAsk principle={principle} />

      <div className="ae-detail-nav">
        <button onClick={onPrev} className="ae-navbtn">
          <span aria-hidden="true">←</span> Previous
        </button>
        <button onClick={onNext} className="ae-navbtn">
          Next <span aria-hidden="true">→</span>
        </button>
      </div>

      <div className="ae-practice">
        <Link href="/landscapes" className="ae-practice-btn ae-practice-btn--solid">
          Browse landscapes →
        </Link>
        <Link href="/map" className="ae-practice-btn">
          Solutions atlas →
        </Link>
      </div>
    </div>
  );
}

/**
 * Embedded grounded explainer. On click it asks the Hub assistant what the
 * HLPE report says about this principle, streams the answer inline, and shows
 * the source citations. Keyed by principle so state resets on change.
 */
function PrincipleAsk({ principle }: { principle: Principle }) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [answer, setAnswer] = useState("");
  const [citations, setCitations] = useState<
    { index: number; label: string; url: string }[]
  >([]);
  const abortRef = useRef<AbortController | null>(null);

  async function ask() {
    if (state === "loading") return;
    setState("loading");
    setAnswer("");
    setCitations([]);
    const controller = new AbortController();
    abortRef.current = controller;
    const question = `What does the HLPE report say about the agroecology principle of ${principle.title.toLowerCase()}? Explain its meaning and why it matters.`;
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: question }],
          scope: "all",
        }),
        signal: controller.signal,
      });
      const ctype = res.headers.get("content-type") ?? "";
      // Refusal path returns plain JSON; the answer path streams SSE.
      if (ctype.includes("application/json")) {
        const data = await res.json();
        setAnswer(data.text ?? "The report doesn't cover this directly.");
        setCitations(data.citations ?? []);
        setState("done");
        return;
      }
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          try {
            const evt = JSON.parse(line.slice(5).trim());
            if (evt.type === "meta") setCitations(evt.citations ?? []);
            else if (evt.type === "delta") setAnswer((a) => a + evt.text);
          } catch {
            /* ignore partial */
          }
        }
      }
      setState("done");
    } catch {
      if (!controller.signal.aborted) {
        setAnswer("The assistant is unavailable right now. Try the floating chat.");
        setState("done");
      }
    }
  }

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  return (
    <div className="ae-ask">
      <div className="ae-ask-head">
        <span className="ae-ask-label">Read more · from the source</span>
      </div>
      {state === "idle" ? (
        <button className="ae-ask-btn" onClick={ask}>
          What does the HLPE report say about {principle.title.toLowerCase()}? →
        </button>
      ) : (
        <div className="ae-ask-body">
          {answer ? (
            <p className="ae-ask-answer">{answer}</p>
          ) : (
            <p className="ae-ask-loading">Reading the report…</p>
          )}
          {citations.length > 0 && (
            <ul className="ae-ask-cites">
              {citations.slice(0, 4).map((c) => (
                <li key={c.index}>
                  <a
                    href={c.url}
                    target={c.url.startsWith("http") ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="ae-ask-cite"
                  >
                    [{c.index}] {c.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
          {state === "done" && (
            <button className="ae-ask-again" onClick={ask}>
              Ask again ↻
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Styles() {
  return (
    <style>{`
      .ae {
        --ae-bg: #fbf8f2;
        --ae-cream: #fbf8f2;
        --ae-ink: #1f261f;
        --ae-forest: #1e3a1c;
        --ae-accent: #a7cdd2;
        --ae-accent-ink: #14333a;
        --ae-line: rgba(31,38,31,.12);
        --ae-side-w: 312px;
        --ae-detail-w: 420px;
        background: var(--ae-bg);
        color: var(--ae-ink);
        font-family: var(--font-inter), system-ui, sans-serif;
      }
      .ae-main {
        display: grid;
        grid-template-columns: var(--ae-side-w) 1fr var(--ae-detail-w);
        /* Fixed-viewport app layout: the three columns each manage their own
           scroll. Because the grid height never changes, swapping the detail
           content can't reflow the centre column — the wheel stays planted. */
        height: calc(100vh - 64px);
        overflow: hidden;
      }

      /* sidebar */
      .ae-sidebar { border-right: 1px solid var(--ae-line); padding: 22px 14px 28px 20px; overflow-y: auto; }
      .ae-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 1px; }
      .ae-list-cell { display: contents; }
      .ae-list-divider {
        display: flex; align-items: center; gap: 8px; white-space: nowrap;
        font-family: var(--font-jetbrains), monospace;
        font-size: 10.5px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase;
        padding: 18px 12px 8px; color: var(--ae-ink); opacity: .92;
      }
      .ae-list-cell:first-child .ae-list-divider { padding-top: 4px; }
      .ae-list-divider-dot { width: 8px; height: 8px; border-radius: 999px; flex: 0 0 auto; }
      .ae-list-divider-range { margin-left: auto; opacity: .5; font-weight: 600; }
      .ae-list-item {
        width: 100%; display: flex; align-items: center; gap: 13px;
        background: none; border: 0; cursor: pointer; padding: 12px 14px; border-radius: 10px;
        color: var(--ae-ink); text-align: left; font-family: inherit;
        transition: background 150ms, color 150ms;
      }
      .ae-list-num { font-family: var(--font-jetbrains), monospace; font-size: 12.5px; font-weight: 600; opacity: .5; width: 20px; flex: 0 0 auto; }
      .ae-list-emblem { width: 30px; height: 30px; flex: 0 0 auto; object-fit: contain; }
      .ae-list-title { font-size: 16.5px; font-weight: 500; letter-spacing: -.1px; }
      .ae-list-item:hover { background: rgba(31,38,31,.06); }
      /* Hover from the wheel mirrors the wheel's teal highlight so both
         sides match; a direct cursor hover on the list keeps the lighter
         tint until clicked. */
      .ae-list-item.is-hover,
      .ae-list-item.is-active { background: var(--ae-accent); color: var(--ae-accent-ink); }
      .ae-list-item.is-hover .ae-list-num,
      .ae-list-item.is-active .ae-list-num { opacity: 1; }

      /* stage — locked, never scrolls; the wheel is centred and planted */
      .ae-stage { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; padding: 24px; min-height: 0; overflow: hidden; }
      .ae-legend { display: flex; gap: 28px; flex-wrap: wrap; justify-content: center; }
      .ae-legend-item { display: flex; align-items: center; gap: 9px; font-size: 13px; }
      .ae-legend-dot { width: 11px; height: 11px; border-radius: 999px; }
      .ae-legend-name { font-weight: 600; letter-spacing: -.1px; color: var(--ae-ink); }
      .ae-legend-range {
        font-family: var(--font-jetbrains), monospace; font-size: 10.5px; font-weight: 600; color: var(--ae-ink);
        padding: 2px 8px; border-radius: 999px; opacity: .85; border: 1px solid rgba(31,38,31,.22); white-space: nowrap;
      }
      .ae-wheel-row { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; }
      .ae-wheel { width: 100%; max-width: min(720px, calc(100vh - 200px)); height: auto; }
      .ae-rotate {
        flex: 0 0 auto; width: 52px; height: 52px; border-radius: 999px;
        border: 1px solid rgba(31,38,31,.18); background: #fbf8f2; color: var(--ae-forest);
        font-size: 26px; line-height: 1; cursor: pointer; display: grid; place-items: center;
        font-family: var(--font-fraunces), Georgia, serif;
        box-shadow: 0 1px 2px rgba(31,38,31,.06); transition: all 180ms cubic-bezier(.2,.8,.2,1);
      }
      .ae-rotate:hover { border-color: var(--ae-forest); background: var(--ae-forest); color: #fbf8f2; transform: scale(1.06); }
      .ae-rotate:focus-visible { outline: 2px solid var(--ae-accent); outline-offset: 2px; }
      .ae-wheel g[role="button"]:focus { outline: none; }
      .ae-wheel g[role="button"]:focus-visible path { stroke: var(--ae-accent); stroke-width: 3; }

      /* detail */
      .ae-detail-wrap { border-left: 1px solid var(--ae-line); background: #fbf8f2; overflow-y: auto; }
      .ae-detail { padding: 30px 32px 104px; color: var(--ae-ink); min-height: 100%; }
      .ae-detail-head { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; }
      .ae-detail-emblem { width: 92px; height: 92px; flex: 0 0 auto; object-fit: contain; }
      .ae-detail-num { font-family: var(--font-jetbrains), monospace; font-size: 38px; font-weight: 700; letter-spacing: -1px; color: var(--ae-forest); line-height: 1; opacity: .9; }
      .ae-detail-close { margin-left: auto; width: 34px; height: 34px; border-radius: 999px; border: 1px solid rgba(31,38,31,.18); background: none; cursor: pointer; font-size: 20px; line-height: 1; color: var(--ae-ink); opacity: .55; transition: all 150ms; }
      .ae-detail-close:hover { opacity: 1; background: rgba(31,38,31,.06); }
      .ae-detail-level { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-family: var(--font-jetbrains), monospace; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; flex-wrap: wrap; }
      .ae-chip-dot { width: 9px; height: 9px; border-radius: 999px; flex: 0 0 auto; }
      .ae-detail-op { color: rgba(31,38,31,.5); font-weight: 600; letter-spacing: .3px; text-transform: none; }
      .ae-detail-title { font-family: var(--font-fraunces), Georgia, serif; font-size: 32px; font-weight: 600; letter-spacing: -.6px; margin: 0 0 18px; line-height: 1.05; }
      .ae-detail-def { font-family: var(--font-fraunces), Georgia, serif; font-size: 18px; line-height: 1.45; font-weight: 500; color: var(--ae-forest); margin: 0 0 16px; }
      .ae-detail-body { font-size: 14.5px; line-height: 1.62; color: rgba(31,38,31,.78); margin: 0 0 22px; }
      .ae-detail-india { border-top: 1px solid rgba(31,38,31,.12); padding-top: 18px; margin-bottom: 24px; }
      .ae-india-label { font-family: var(--font-jetbrains), monospace; font-size: 10px; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase; color: #b5793a; }
      .ae-india-text { font-size: 14px; line-height: 1.6; color: rgba(31,38,31,.8); margin: 8px 0 12px; }
      .ae-levers { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 7px; }
      .ae-lever { font-family: var(--font-jetbrains), monospace; font-size: 10px; text-transform: uppercase; letter-spacing: .5px; padding: 4px 9px; border-radius: 999px; border: 1px solid rgba(31,38,31,.18); color: rgba(31,38,31,.7); }
      .ae-ask { margin-bottom: 24px; border-top: 1px solid var(--ae-line); padding-top: 18px; }
      .ae-ask-head { margin-bottom: 10px; }
      .ae-ask-label { font-family: var(--font-jetbrains), monospace; font-size: 10px; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase; color: #b5793a; }
      .ae-ask-btn { width: 100%; text-align: left; cursor: pointer; font-family: inherit; font-size: 14.5px; line-height: 1.45; color: var(--ae-forest); background: rgba(63,125,141,.07); border: 1px solid rgba(63,125,141,.22); border-radius: 12px; padding: 13px 15px; transition: all 160ms; }
      .ae-ask-btn:hover { background: rgba(63,125,141,.12); border-color: rgba(63,125,141,.4); }
      .ae-ask-body { background: rgba(31,38,31,.03); border: 1px solid var(--ae-line); border-radius: 12px; padding: 15px 16px; }
      .ae-ask-answer { font-size: 14.5px; line-height: 1.62; color: rgba(31,38,31,.85); margin: 0; }
      .ae-ask-loading { font-size: 14px; color: rgba(31,38,31,.5); margin: 0; font-style: italic; }
      .ae-ask-cites { list-style: none; margin: 12px 0 0; padding: 12px 0 0; border-top: 1px dashed var(--ae-line); display: flex; flex-direction: column; gap: 5px; }
      .ae-ask-cite { font-family: var(--font-jetbrains), monospace; font-size: 11px; line-height: 1.4; color: #2f6d7a; text-decoration: none; }
      .ae-ask-cite:hover { text-decoration: underline; }
      .ae-ask-again { margin-top: 12px; font-family: var(--font-jetbrains), monospace; font-size: 10.5px; text-transform: uppercase; letter-spacing: .8px; color: rgba(31,38,31,.55); background: none; border: 0; cursor: pointer; padding: 0; }
      .ae-ask-again:hover { color: var(--ae-forest); }
      .ae-detail-nav { display: flex; gap: 10px; margin-bottom: 22px; }
      .ae-navbtn { flex: 1; padding: 11px 14px; border-radius: 10px; cursor: pointer; border: 1px solid rgba(31,38,31,.18); background: none; color: var(--ae-ink); font-family: inherit; font-size: 14px; font-weight: 500; transition: all 150ms; }
      .ae-navbtn:hover { background: var(--ae-forest); color: var(--ae-cream); border-color: var(--ae-forest); }
      .ae-practice { display: flex; flex-direction: column; gap: 9px; }
      .ae-practice-btn { display: inline-flex; align-items: center; justify-content: center; padding: 11px 16px; border-radius: 999px; border: 1px solid rgba(31,38,31,.2); color: var(--ae-ink); text-decoration: none; font-family: var(--font-jetbrains), monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; transition: all 150ms; }
      .ae-practice-btn:hover { border-color: var(--ae-forest); }
      .ae-practice-btn--solid { background: var(--ae-forest); color: var(--ae-cream); border-color: var(--ae-forest); }
      .ae-practice-btn--solid:hover { opacity: .9; }

      /* empty state */
      .ae-detail--empty { display: flex; flex-direction: column; }
      .ae-eyebrow { font-family: var(--font-jetbrains), monospace; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--ae-forest); margin-bottom: 14px; }
      .ae-detail-intro-title { font-family: var(--font-fraunces), Georgia, serif; font-size: 30px; font-weight: 600; letter-spacing: -.5px; line-height: 1.1; margin: 0 0 18px; }
      .ae-intro-lead { font-size: 15.5px; line-height: 1.55; color: rgba(31,38,31,.8); margin: 0 0 16px; }
      .ae-intro-hint { font-size: 14px; color: var(--ae-forest); font-weight: 500; margin: 0 0 30px; }
      .ae-intro-groups { display: flex; flex-direction: column; gap: 16px; border-top: 1px solid rgba(31,38,31,.12); padding-top: 22px; }
      .ae-intro-level { display: flex; align-items: flex-start; gap: 12px; }
      .ae-intro-level-dot { width: 12px; height: 12px; border-radius: 999px; flex: 0 0 auto; margin-top: 4px; }
      .ae-intro-level-name { font-size: 15px; font-weight: 600; display: flex; align-items: baseline; gap: 9px; flex-wrap: wrap; }
      .ae-intro-level-range { font-family: var(--font-jetbrains), monospace; font-size: 11px; font-weight: 600; color: var(--ae-forest); opacity: .7; }
      .ae-intro-level-blurb { font-size: 13.5px; line-height: 1.5; color: rgba(31,38,31,.7); margin-top: 3px; }
      .ae-source { margin-top: 26px; border-top: 1px solid var(--ae-line); padding-top: 20px; }
      .ae-source-label { font-family: var(--font-jetbrains), monospace; font-size: 10px; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase; color: #b5793a; }
      .ae-source-text { font-size: 13.5px; line-height: 1.55; color: rgba(31,38,31,.72); margin: 7px 0 12px; }
      .ae-source-links { display: flex; flex-wrap: wrap; gap: 8px; }
      .ae-source-link { font-family: var(--font-jetbrains), monospace; font-size: 10.5px; text-transform: uppercase; letter-spacing: .8px; padding: 7px 12px; border-radius: 999px; border: 1px solid rgba(31,38,31,.2); color: var(--ae-forest); text-decoration: none; transition: all 150ms; }
      .ae-source-link:hover { border-color: var(--ae-forest); background: var(--ae-forest); color: #fbf8f2; }

      @media (max-width: 1180px) { .ae { --ae-side-w: 240px; --ae-detail-w: 380px; } }
      @media (max-width: 920px) {
        /* Drop the fixed-viewport lock; stack and let the page scroll.
           The sidebar becomes a horizontal, swipeable principle strip. */
        /* minmax(0,…) lets the single column shrink to the viewport so the
           sidebar's internal overflow-x can scroll instead of the cell
           expanding to fit all chips (the grid min-width:auto gotcha). */
        .ae-main { grid-template-columns: minmax(0, 1fr); height: auto; overflow: visible; }
        .ae-sidebar {
          min-width: 0; border-right: 0; border-bottom: 1px solid var(--ae-line);
          overflow-x: auto; overflow-y: hidden; padding: 12px 14px;
          -webkit-overflow-scrolling: touch; scrollbar-width: thin;
          overscroll-behavior-x: contain;
        }
        .ae-list { flex-direction: row; flex-wrap: nowrap; gap: 6px; width: max-content; }
        .ae-list-divider {
          flex-direction: column; align-items: flex-start; gap: 2px;
          padding: 4px 10px 4px 0; margin: 0 2px 0 0; flex: 0 0 auto;
          border-right: 1px solid var(--ae-line);
        }
        .ae-list-divider-range { margin-left: 0; }
        .ae-list-item { width: auto; flex: 0 0 auto; white-space: nowrap; padding: 8px 12px; }
        /* wheel flexes to fill the space left by the two arrows — never overflows */
        .ae-stage { min-width: 0; overflow: visible; padding: 18px 8px 4px; }
        .ae-wheel-row { gap: 6px; width: 100%; }
        .ae-wheel { flex: 1 1 0; min-width: 0; max-width: none; }
        .ae-rotate { width: 42px; height: 42px; font-size: 22px; }
        .ae-detail-wrap { min-width: 0; border-left: 0; border-top: 1px solid var(--ae-line); overflow: visible; }
        .ae-detail { padding: 26px 20px 56px; }
      }
      @media (max-width: 560px) {
        .ae-list-title { font-size: 14.5px; }
        .ae-stage { padding: 14px 6px 2px; }
        .ae-wheel-row { gap: 4px; }
        .ae-rotate { width: 36px; height: 36px; font-size: 20px; }
        .ae-legend { gap: 16px; }
        .ae-legend-item { font-size: 12px; }
        .ae-detail { padding: 22px 16px 52px; }
        .ae-detail-title { font-size: 27px; }
        .ae-detail-def { font-size: 16.5px; }
        .ae-detail-intro-title { font-size: 25px; }
        .ae-detail-emblem { width: 72px; height: 72px; }
        .ae-detail-num { font-size: 32px; }
      }
    `}</style>
  );
}
