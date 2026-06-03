"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function FactSheetGenerator() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function generate() {
    if (!q.trim()) return;
    setBusy(true);
    setMsg({ kind: "ok", text: `Researching “${q}” across trusted sources, extracting and verifying — this takes ~30-60s…` });
    try {
      const res = await fetch("/api/admin/factsheets/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: q.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setMsg({
          kind: "ok",
          text: `Done — “${data.title}” created (${data.status === "published" ? "auto-published" : "flagged for review — sources too weak"}).`,
        });
        setQ("");
        router.refresh();
      } else {
        setMsg({ kind: "err", text: data.reason || "Could not verify this programme from the allow-listed sources." });
      }
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-[10px] border border-line bg-cream p-5 space-y-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-teal">Generate a fact sheet</div>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !busy && generate()}
          placeholder="Programme name, e.g. Andhra Pradesh Community-Managed Natural Farming"
          className="flex-1 px-3 py-2.5 rounded-[6px] border border-line bg-paper text-[14px] text-ink"
        />
        <button
          onClick={generate}
          disabled={busy}
          className="px-4 py-2.5 rounded-[6px] bg-deep-teal text-paper font-mono text-[10.5px] uppercase tracking-[0.12em] hover:bg-teal transition-colors disabled:opacity-60 whitespace-nowrap"
        >
          {busy ? "Researching…" : "Generate"}
        </button>
      </div>
      <p className="text-[11.5px] text-muted">
        Searches allow-listed sources only (gov, ICAR/NABARD, funders, named outlets). Well-sourced sheets
        auto-publish; weak ones are flagged. Every fact carries a citation.
      </p>
      {msg && (
        <p className={`text-[12.5px] leading-[1.5] ${msg.kind === "err" ? "text-red-alert" : "text-ink-soft"}`}>{msg.text}</p>
      )}
    </div>
  );
}
