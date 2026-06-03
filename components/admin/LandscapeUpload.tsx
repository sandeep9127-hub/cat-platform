"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export function LandscapeUpload({ slug }: { slug: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const file = form.get("file");
    if (!(file instanceof File) || !file.name) {
      setMsg({ kind: "err", text: "Choose a .docx report first." });
      return;
    }
    setBusy(true);
    setMsg({ kind: "ok", text: `Ingesting “${file.name}” — extracting, chunking and embedding. This can take a minute…` });
    try {
      const res = await fetch(`/api/admin/landscapes/${slug}/ingest`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ingestion failed");
      setMsg({ kind: "ok", text: `Done — added “${data.title}” (${data.chunkCount} chunks). The assistant can now use it.` });
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (err) {
      setMsg({ kind: "err", text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-[10px] border border-line bg-cream p-5 space-y-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-teal">Add a report</div>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
        <input
          ref={fileRef}
          type="file"
          name="file"
          accept=".docx"
          className="text-[13px] text-ink file:mr-3 file:py-2 file:px-3 file:rounded-[6px] file:border-0 file:bg-deep-teal file:text-paper file:font-mono file:text-[10px] file:uppercase file:tracking-[0.1em]"
        />
        <input
          type="number"
          name="year"
          placeholder="Year"
          className="w-24 px-3 py-2 rounded-[6px] border border-line bg-paper text-[13px]"
        />
      </div>
      <input
        type="text"
        name="title"
        placeholder="Document title (optional — defaults to file name)"
        className="w-full px-3 py-2 rounded-[6px] border border-line bg-paper text-[13px]"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2.5 rounded-[6px] bg-deep-teal text-paper font-mono text-[10.5px] uppercase tracking-[0.12em] hover:bg-teal transition-colors disabled:opacity-60"
        >
          {busy ? "Ingesting…" : "Upload & ingest"}
        </button>
        <span className="text-[11px] text-muted">.docx · up to ~4 MB</span>
      </div>
      {msg && (
        <p className={`text-[12.5px] leading-[1.5] ${msg.kind === "err" ? "text-red-alert" : "text-ink-soft"}`}>
          {msg.text}
        </p>
      )}
    </form>
  );
}
