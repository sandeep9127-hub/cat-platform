"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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
  accent: "#3f7d8d",
  accentInk: "#f4f7ee",
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
          <PrincipleWheel
            principles={PRINCIPLES}
            selected={selected}
            hovered={hovered}
            onSelect={(n) => setSelected((cur) => (cur === n ? null : n))}
            onHover={setHovered}
            palette={PALETTE}
          />
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
          src={`/images/principle-icons/p${principle.n}.png`}
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

function Styles() {
  return (
    <style>{`
      .ae {
        --ae-bg: #fbf8f2;
        --ae-cream: #fbf8f2;
        --ae-ink: #1f261f;
        --ae-forest: #1e3a1c;
        --ae-accent: #3f7d8d;
        --ae-accent-ink: #f4f7ee;
        --ae-line: rgba(31,38,31,.12);
        --ae-side-w: 288px;
        --ae-detail-w: 420px;
        background: var(--ae-bg);
        color: var(--ae-ink);
        font-family: var(--font-inter), system-ui, sans-serif;
      }
      .ae-main {
        display: grid;
        grid-template-columns: var(--ae-side-w) 1fr var(--ae-detail-w);
        min-height: calc(100vh - 64px);
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
        width: 100%; display: flex; align-items: center; gap: 12px;
        background: none; border: 0; cursor: pointer; padding: 9px 12px; border-radius: 9px;
        color: var(--ae-ink); text-align: left; font-family: inherit;
        transition: background 150ms, color 150ms;
      }
      .ae-list-num { font-family: var(--font-jetbrains), monospace; font-size: 12px; font-weight: 600; opacity: .5; width: 20px; flex: 0 0 auto; }
      .ae-list-title { font-size: 15px; font-weight: 500; letter-spacing: -.1px; }
      .ae-list-item:hover { background: rgba(31,38,31,.06); }
      /* Hover from the wheel mirrors the wheel's teal highlight so both
         sides match; a direct cursor hover on the list keeps the lighter
         tint until clicked. */
      .ae-list-item.is-hover,
      .ae-list-item.is-active { background: var(--ae-accent); color: var(--ae-accent-ink); }
      .ae-list-item.is-hover .ae-list-num,
      .ae-list-item.is-active .ae-list-num { opacity: 1; }

      /* stage */
      .ae-stage { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 22px; padding: 28px; min-height: 0; }
      .ae-legend { display: flex; gap: 28px; flex-wrap: wrap; justify-content: center; }
      .ae-legend-item { display: flex; align-items: center; gap: 9px; font-size: 13px; }
      .ae-legend-dot { width: 11px; height: 11px; border-radius: 999px; }
      .ae-legend-name { font-weight: 600; letter-spacing: -.1px; color: var(--ae-ink); }
      .ae-legend-range {
        font-family: var(--font-jetbrains), monospace; font-size: 10.5px; font-weight: 600; color: var(--ae-ink);
        padding: 2px 8px; border-radius: 999px; opacity: .85; border: 1px solid rgba(31,38,31,.22); white-space: nowrap;
      }
      .ae-wheel { width: 100%; max-width: 540px; height: auto; }
      .ae-wheel g[role="button"]:focus { outline: none; }
      .ae-wheel g[role="button"]:focus-visible path { stroke: var(--ae-accent); stroke-width: 3; }

      /* detail */
      .ae-detail-wrap { border-left: 1px solid var(--ae-line); background: #fbf8f2; overflow-y: auto; }
      .ae-detail { padding: 30px 32px 104px; color: var(--ae-ink); min-height: 100%; }
      .ae-detail-head { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; }
      .ae-detail-emblem { width: 88px; height: 88px; flex: 0 0 auto; border-radius: 50%; object-fit: cover; background: #fbfaf4; border: 1px solid rgba(31,38,31,.12); }
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

      @media (max-width: 1180px) { .ae { --ae-side-w: 240px; --ae-detail-w: 380px; } }
      @media (max-width: 920px) {
        .ae-main { grid-template-columns: 1fr; }
        .ae-sidebar { border-right: 0; border-bottom: 1px solid var(--ae-line); }
        .ae-list { flex-direction: row; flex-wrap: wrap; }
        .ae-list-cell { display: block; }
        .ae-list-divider { width: 100%; }
        .ae-list-title { display: none; }
        .ae-detail-wrap { border-left: 0; border-top: 1px solid var(--ae-line); }
      }
    `}</style>
  );
}
