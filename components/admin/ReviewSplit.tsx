"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Draft = {
  id: string;
  title: string;
  tagline: string | null;
  primaryThemeSlug: string | null;
  primaryGeographyName: string | null;
  primaryStateCode: string | null;
  scaleBand: string | null;
  startYear: number | null;
  endYear: number | null;
  context: string | null;
  whatWasAttempted: string | null;
  whatWasAchieved: string | null;
  whatWorked: string | null;
  whatDidNotWork: string | null;
  leadOrganisationName: string | null;
  sourcePassages: { source_url: string; passage: string; position_anchor: string }[] | null;
};

const FIELDS: Array<{ key: keyof Draft; label: string; long?: boolean }> = [
  { key: "tagline", label: "Tagline" },
  { key: "context", label: "Context", long: true },
  { key: "whatWasAttempted", label: "What was attempted", long: true },
  { key: "whatWasAchieved", label: "What was achieved", long: true },
  { key: "whatWorked", label: "What worked", long: true },
  { key: "whatDidNotWork", label: "What did not work", long: true },
];

export function ReviewSplit({ draft }: { draft: Draft }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    for (const f of FIELDS) v[f.key] = (draft[f.key] as string) ?? "";
    return v;
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Keyboard shortcuts: a approve, r return, s save
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey) return;
      if (e.key === "a") void send("approve");
      if (e.key === "r") void send("return");
      if (e.key === "s") void send("save");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function send(action: "approve" | "return" | "save") {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/drafts/${draft.id}/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed");
      setMessage(
        action === "approve"
          ? "Approved and published."
          : action === "return"
            ? "Returned for edits."
            : "Saved."
      );
      if (action === "approve") setTimeout(() => router.push("/admin"), 800);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex gap-2 flex-wrap items-center sticky top-[64px] bg-paper py-2 z-30 border-b border-line">
        <button
          type="button"
          onClick={() => send("approve")}
          disabled={busy}
          className="font-mono text-[10px] uppercase tracking-[0.16em] font-semibold px-4 py-2 bg-deep-teal text-paper rounded-[2px] hover:bg-teal transition-colors disabled:opacity-50"
        >
          Approve · a
        </button>
        <button
          type="button"
          onClick={() => send("return")}
          disabled={busy}
          className="font-mono text-[10px] uppercase tracking-[0.16em] font-semibold px-4 py-2 border border-amber-deep text-amber-deep rounded-[2px] hover:bg-amber/30 transition-colors disabled:opacity-50"
        >
          Return · r
        </button>
        <button
          type="button"
          onClick={() => send("save")}
          disabled={busy}
          className="font-mono text-[10px] uppercase tracking-[0.16em] font-semibold px-4 py-2 border border-line text-ink-soft rounded-[2px] hover:border-teal hover:text-teal transition-colors disabled:opacity-50"
        >
          Save · s
        </button>
        {message && (
          <span className="font-mono text-[11px] text-teal ml-3">{message}</span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* SOURCE pane */}
        <section>
          <h2 className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-amber-deep font-semibold mb-3">
            Source passages ({(draft.sourcePassages ?? []).length})
          </h2>
          <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2 border-l-2 border-line pl-4">
            {(draft.sourcePassages ?? []).length === 0 ? (
              <p className="font-serif italic text-ink-soft text-[14px] font-light">
                No source passages recorded for this draft. The drafter should have populated
                this; check ingestion_runs for errors.
              </p>
            ) : (
              (draft.sourcePassages ?? []).map((p, i) => (
                <div key={i} className="bg-cream p-3 border border-line-soft">
                  <a
                    href={p.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[10px] uppercase tracking-[0.14em] text-teal hover:underline block mb-2"
                  >
                    {new URL(p.source_url).hostname} ↗
                  </a>
                  <p className="font-serif text-[14px] text-ink-soft leading-[1.55]">
                    {p.passage}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        {/* DRAFT pane */}
        <section>
          <h2 className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-teal font-semibold mb-3">
            Draft (editable)
          </h2>
          <div className="space-y-5">
            {FIELDS.map((f) => (
              <label key={f.key} className="block">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted block mb-1.5">
                  {f.label}
                </span>
                <textarea
                  value={values[f.key]}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [f.key]: e.target.value }))
                  }
                  rows={f.long ? 6 : 2}
                  className="w-full px-3 py-2 bg-cream border border-line rounded-[2px] font-serif text-[15px] leading-[1.55] text-ink focus:outline-2 focus:outline-teal focus:bg-paper transition-colors"
                />
              </label>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
