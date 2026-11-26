import Link from "next/link";
import {
  DECISION_LABEL,
  SHOULD_HAVE,
  SHOULD_HAVE_LABEL,
  isFilter,
  listVoiceTurns,
  voiceTurnStats,
  type TurnFilter,
  type VoiceTurnRow,
} from "@/lib/admin/voice-turns";
import { markTurnAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Voice agent · Admin" };

/**
 * Voice agent review (docs/voice-agent-plan.md, step 7): every spoken turn the
 * agent decided on, newest first. Mark wrong calls; they become eval cases for
 * the weekly tuning loop. Side-talk turns keep no words, by design.
 */

const FILTERS: { id: TurnFilter; label: string }[] = [
  { id: "unreviewed", label: "To review" },
  { id: "wrong", label: "Marked wrong" },
  { id: "side_talk", label: "Side talk" },
  { id: "answered", label: "Answered" },
  { id: "all", label: "All" },
];
const DAYS = [1, 7, 30];

const when = (s: string) =>
  new Date(s).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
const secs = (ms: number | null) => (ms == null ? "–" : `${(ms / 1000).toFixed(1)} s`);

const TONE: Partial<Record<VoiceTurnRow["decision"], string>> = {
  answered: "bg-teal/10 text-deep-teal border-teal/30",
  ignored_side_talk: "bg-line/60 text-ink-soft border-line",
  asked_was_that_for_me: "bg-amber/20 text-deep-teal border-amber/40",
  refused: "bg-cream text-ink-soft border-line",
  error: "bg-red-alert/10 text-red-alert border-red-alert/30",
};

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-[10px] border border-line bg-paper px-4 py-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{label}</div>
      <div className="mt-1 font-serif text-[24px] text-deep-teal tabular-nums">{value}</div>
      {hint && <div className="text-[12px] text-ink-soft">{hint}</div>}
    </div>
  );
}

function TurnItem({ t, back }: { t: VoiceTurnRow; back: string }) {
  const signals = [
    t.speaker === "other" ? "second speaker" : null,
    t.confidence != null && t.confidence < 0.8 ? `confidence ${t.confidence.toFixed(2)}` : null,
    t.after_question ? "after its question" : null,
    t.lang !== "en" ? t.lang.toUpperCase() : null,
  ].filter(Boolean);
  return (
    <li className={`border-t border-line py-4 grid gap-3 md:grid-cols-[1fr_auto] ${t.marked_wrong ? "bg-red-alert/[0.03]" : ""}`}>
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-[5px] border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] ${TONE[t.decision] ?? "bg-cream text-ink-soft border-line"}`}>
            {DECISION_LABEL[t.decision] ?? t.decision}
          </span>
          {t.tools.map((tool) => (
            <span key={tool} className="rounded-[5px] border border-line px-1.5 py-0.5 font-mono text-[10px] text-ink-soft">
              {tool}
            </span>
          ))}
          <span className="font-mono text-[11px] text-muted">{when(t.created_at)}</span>
          <span className="font-mono text-[11px] text-muted">{secs(t.latency_ms)}</span>
          {t.marked_wrong === true && <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-red-alert">Marked wrong</span>}
          {t.marked_wrong === false && <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-teal">Marked right</span>}
        </div>
        <p className={`text-[15px] leading-[1.45] ${t.transcript ? "text-ink" : "text-muted italic"}`}>
          {t.transcript ? `“${t.transcript}”` : "(words not kept: side talk or a second speaker)"}
        </p>
        <div className="text-[12.5px] text-ink-soft">
          {[t.reason, ...signals].filter(Boolean).join(" · ")}
          {t.marked_note ? <span className="block text-red-alert">{t.marked_note}</span> : null}
        </div>
      </div>
      <div className="flex flex-wrap items-start gap-2 md:justify-end">
        <form action={markTurnAction}>
          <input type="hidden" name="id" value={t.id} />
          <input type="hidden" name="back" value={back} />
          <input type="hidden" name="verdict" value={t.marked_wrong === false ? "clear" : "right"} />
          <button className="h-9 rounded-full border border-line px-3.5 text-[13px] text-ink hover:border-teal">
            {t.marked_wrong === false ? "Undo" : "Right"}
          </button>
        </form>
        <details className="relative">
          <summary className="list-none cursor-pointer h-9 inline-flex items-center rounded-full border border-line px-3.5 text-[13px] text-ink hover:border-red-alert">
            {t.marked_wrong ? "Change" : "Wrong…"}
          </summary>
          <form action={markTurnAction} className="absolute right-0 z-10 mt-2 w-[280px] rounded-[10px] border border-line bg-paper p-3 shadow-lg space-y-2">
            <input type="hidden" name="id" value={t.id} />
            <input type="hidden" name="back" value={back} />
            <input type="hidden" name="verdict" value="wrong" />
            <label className="block text-[12px] text-ink-soft">
              What should it have done?
              <select name="should" className="mt-1 w-full rounded-[6px] border border-line bg-paper px-2 py-1.5 text-[13px] text-ink" defaultValue="answered">
                {SHOULD_HAVE.map((s) => (
                  <option key={s} value={s}>
                    {SHOULD_HAVE_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[12px] text-ink-soft">
              Note (optional)
              <input name="note" maxLength={300} className="mt-1 w-full rounded-[6px] border border-line bg-paper px-2 py-1.5 text-[13px] text-ink" />
            </label>
            <div className="flex gap-2">
              <button className="h-8 rounded-full bg-ink text-paper px-3.5 text-[13px]">Mark wrong</button>
              {t.marked_wrong && (
                <button name="verdict" value="clear" className="h-8 rounded-full border border-line px-3.5 text-[13px] text-ink-soft">
                  Clear
                </button>
              )}
            </div>
          </form>
        </details>
      </div>
    </li>
  );
}

export default async function VoiceAdminPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const filter: TurnFilter = isFilter(sp.f) ? sp.f : "unreviewed";
  const days = DAYS.includes(Number(sp.d)) ? Number(sp.d) : 7;
  const page = Math.max(0, Number(sp.p) || 0);
  const qs = (o: { f?: string; d?: number; p?: number }) => {
    const p = new URLSearchParams({ f: o.f ?? filter, d: String(o.d ?? days) });
    if (o.p) p.set("p", String(o.p));
    return `/admin/voice?${p.toString()}`;
  };
  const back = qs({ p: page });

  let error: string | null = null;
  let data: Awaited<ReturnType<typeof listVoiceTurns>> | null = null;
  let stats: Awaited<ReturnType<typeof voiceTurnStats>> | null = null;
  try {
    [data, stats] = await Promise.all([listVoiceTurns({ filter, days, page }), voiceTurnStats(days)]);
  } catch (e) {
    console.error("[admin/voice] query failed", (e as Error).message);
    error = "The voice log isn't available on this database yet (run drizzle/sql/2026-11-26_voice_turns.sql).";
  }

  return (
    <main className="max-w-[1100px] mx-auto px-5 sm:px-7 lg:px-10 py-8 space-y-6">
      <header className="space-y-1">
        <h1 className="font-serif text-[30px] text-deep-teal tracking-[-0.01em]">Voice agent</h1>
        <p className="text-[14.5px] text-ink-soft max-w-[70ch]">
          Every spoken turn Agents of Change decided on. Mark the wrong calls: they become test cases for the weekly tuning. No audio is kept,
          and side talk keeps no words.
        </p>
      </header>

      {error ? (
        <p className="rounded-[10px] border border-line bg-cream px-4 py-3 text-[14px] text-ink-soft">{error}</p>
      ) : (
        <>
          {stats && (
            <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Stat label="Turns" value={String(stats.total)} hint={`last ${days} day${days > 1 ? "s" : ""}`} />
              <Stat label="Answered" value={String(stats.answered)} hint={`${stats.sideTalk} side talk`} />
              <Stat label="Reviewed" value={String(stats.reviewed)} hint={`${stats.wrong} marked wrong`} />
              <Stat label="Answer time" value={secs(stats.p50)} hint={`P90 ${secs(stats.p90)}, whole answer`} />
              <Stat label="Claude cost" value={`$${stats.costUsd.toFixed(2)}`} hint="answers only" />
            </section>
          )}

          <nav className="flex flex-wrap items-center gap-2" aria-label="Filter">
            {FILTERS.map((f) => (
              <Link
                key={f.id}
                href={qs({ f: f.id, p: 0 })}
                className={`rounded-full border px-3.5 py-1.5 text-[13px] ${f.id === filter ? "border-teal bg-teal-wash text-ink" : "border-line text-ink-soft hover:border-teal"}`}
              >
                {f.label}
              </Link>
            ))}
            <span className="flex-1" />
            {DAYS.map((d) => (
              <Link key={d} href={qs({ d, p: 0 })} className={`font-mono text-[11px] uppercase tracking-[0.1em] ${d === days ? "text-teal" : "text-muted hover:text-teal"}`}>
                {d === 1 ? "24 h" : `${d} days`}
              </Link>
            ))}
          </nav>

          {data && data.turns.length ? (
            <ul className="border-b border-line">
              {data.turns.map((t) => (
                <TurnItem key={t.id} t={t} back={back} />
              ))}
            </ul>
          ) : (
            <p className="text-[14px] text-ink-soft py-8 text-center">Nothing here for this filter.</p>
          )}

          <div className="flex items-center gap-3 text-[13px]">
            {page > 0 && (
              <Link href={qs({ p: page - 1 })} className="text-ink-soft hover:text-teal">
                ← Newer
              </Link>
            )}
            <span className="flex-1" />
            {data?.hasMore && (
              <Link href={qs({ p: page + 1 })} className="text-ink-soft hover:text-teal">
                Older →
              </Link>
            )}
          </div>

          <p className="text-[12.5px] text-muted">
            Marked turns with words are exported as eval cases by <code className="font-mono">npx tsx scripts/voice-agent-eval.ts --marked</code>.
          </p>
        </>
      )}
    </main>
  );
}
