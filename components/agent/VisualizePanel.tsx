"use client";

import { useState } from "react";
import { BarChart3, Loader2, Sparkles } from "lucide-react";
import { VizChart, type VizSpec } from "./VizChart";

const pretty = (slug: string) =>
  slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const chipBase =
  "font-mono text-[9.5px] uppercase tracking-[0.14em] px-2.5 py-1 rounded-full border transition-colors inline-flex items-center gap-1.5";
const chipOn = "border-deep-teal bg-teal-wash text-deep-teal";
const chipOff = "border-line text-muted hover:text-deep-teal hover:border-deep-teal";

/**
 * Visualize. Phase 1: chart a cited landscape's REAL budget data (deterministic,
 * /api/agent/visualize GET). Phase 2: an "AI-suggested" option that charts the
 * figures stated in this answer (POST → LLM extraction, flagged + verify note).
 */
export function VisualizePanel({ slugs, answerText }: { slugs: string[]; answerText: string }) {
  const [open, setOpen] = useState(false);
  const [dbCharts, setDbCharts] = useState<Record<string, VizSpec[]>>({});
  const [dbLoading, setDbLoading] = useState(false);
  const [aiCharts, setAiCharts] = useState<VizSpec[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [shown, setShown] = useState<VizSpec | null>(null);
  const [instruction, setInstruction] = useState("");
  const [customLoading, setCustomLoading] = useState(false);
  const [customError, setCustomError] = useState(false);

  async function loadDb() {
    if (slugs.length === 0 || Object.keys(dbCharts).length > 0) return;
    setDbLoading(true);
    const acc: Record<string, VizSpec[]> = {};
    await Promise.all(
      slugs.map(async (slug) => {
        try {
          const r = await fetch(`/api/agent/visualize?slug=${encodeURIComponent(slug)}`);
          const j = (await r.json()) as { charts?: VizSpec[] };
          acc[slug] = j.charts ?? [];
        } catch {
          acc[slug] = [];
        }
      })
    );
    setDbCharts(acc);
    setDbLoading(false);
    // Auto-show the first available chart so the panel never feels empty.
    const first = slugs.flatMap((s) => acc[s] ?? [])[0];
    if (first) setShown(first);
  }

  async function loadAi() {
    if (aiCharts !== null || aiLoading) return;
    setAiLoading(true);
    try {
      const r = await fetch("/api/agent/visualize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: answerText }),
      });
      const j = (await r.json()) as { charts?: VizSpec[] };
      setAiCharts(j.charts ?? []);
    } catch {
      setAiCharts([]);
    } finally {
      setAiLoading(false);
    }
  }

  async function submitCustom(e: React.FormEvent) {
    e.preventDefault();
    const q = instruction.trim();
    if (!q || customLoading) return;
    setCustomLoading(true);
    setCustomError(false);
    try {
      const r = await fetch("/api/agent/visualize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: answerText, instruction: q }),
      });
      const j = (await r.json()) as { charts?: VizSpec[] };
      if (j.charts && j.charts[0]) {
        setShown(j.charts[0]);
        setInstruction("");
      } else {
        setCustomError(true);
      }
    } catch {
      setCustomError(true);
    } finally {
      setCustomLoading(false);
    }
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) loadDb();
  }

  const hasDbOptions = slugs.some((s) => (dbCharts[s] ?? []).length > 0);
  const aiEmpty = aiCharts !== null && aiCharts.length === 0;

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted hover:text-deep-teal active:scale-[0.97] transition-[transform,color] duration-150"
      >
        <BarChart3 size={12} strokeWidth={1.9} />
        Visualize
      </button>

      {open && (
        <div className="mt-3 rounded-[10px] border border-line-soft bg-cream/40 p-3.5">
          <div className="flex flex-wrap items-center gap-2">
            {dbLoading && (
              <span className="inline-flex items-center gap-1.5 text-muted font-mono text-[9.5px] uppercase tracking-[0.14em]">
                <Loader2 size={12} className="animate-spin" /> Reading the data
              </span>
            )}

            {/* Phase 1 — deterministic, from the landscape's real data */}
            {slugs.map((slug) =>
              (dbCharts[slug] ?? []).map((c) => (
                <button
                  key={`${slug}-${c.id}`}
                  type="button"
                  onClick={() => setShown(c)}
                  className={`${chipBase} ${shown === c ? chipOn : chipOff}`}
                >
                  {slugs.length > 1 ? `${pretty(slug)} · ` : ""}
                  {c.kind === "donut" ? "Funding mix" : "By theme"}
                </button>
              ))
            )}

            {/* Phase 2 — AI-suggested from the answer's own figures */}
            {aiCharts === null ? (
              <button
                type="button"
                onClick={loadAi}
                disabled={aiLoading}
                className={`${chipBase} ${chipOff} disabled:opacity-50`}
              >
                {aiLoading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} strokeWidth={1.9} className="text-amber-deep" />}
                AI-suggest
              </button>
            ) : (
              aiCharts.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setShown(c)}
                  className={`${chipBase} ${shown === c ? chipOn : chipOff}`}
                >
                  <Sparkles size={10} strokeWidth={1.9} className="text-amber-deep" />
                  {c.title.replace(/\s*[—·-].*$/, "").slice(0, 22) || "Suggested"}
                </button>
              ))
            )}
          </div>

          {!dbLoading && !hasDbOptions && aiCharts === null && slugs.length > 0 && (
            <p className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted">
              No chartable budget data — try AI-suggest.
            </p>
          )}
          {aiEmpty && (
            <p className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted">
              AI found no chartable figures in this answer.
            </p>
          )}

          {shown && <VizChart spec={shown} />}

          {/* Phase 3 — free-form: describe the chart you want */}
          <form onSubmit={submitCustom} className="mt-3 flex items-center gap-2">
            <input
              value={instruction}
              onChange={(e) => {
                setInstruction(e.target.value);
                setCustomError(false);
              }}
              placeholder="Describe a chart… e.g. grants vs debt as a bar"
              maxLength={200}
              className="flex-1 bg-paper border border-line rounded-full px-3.5 py-1.5 text-[12.5px] text-ink placeholder:text-muted/80 focus-visible:outline-none focus-visible:border-deep-teal transition-colors"
            />
            <button
              type="submit"
              disabled={customLoading || !instruction.trim()}
              className="shrink-0 inline-flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] px-3 py-1.5 rounded-full bg-deep-teal text-paper hover:bg-teal active:scale-[0.97] disabled:opacity-40 transition-[transform,background-color] duration-150"
            >
              {customLoading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} strokeWidth={1.9} />}
              Make
            </button>
          </form>
          {customError && (
            <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-amber-deep">
              Couldn&apos;t build that from the answer&apos;s figures — try different wording.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
