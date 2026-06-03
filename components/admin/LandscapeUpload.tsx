"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";

export function LandscapeUpload({ slug }: { slug: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const file = form.get("file");
    const title = String(form.get("title") || "");
    const year = String(form.get("year") || "");
    if (!(file instanceof File) || !file.name) {
      setMsg({ kind: "err", text: "Choose a .pdf or .docx report first." });
      return;
    }
    if (!/\.(pdf|docx)$/i.test(file.name)) {
      setMsg({ kind: "err", text: "Only .pdf or .docx reports are supported." });
      return;
    }
    setBusy(true);
    try {
      // 1) Upload straight to Vercel Blob (no size limit; bypasses the API cap).
      setMsg({ kind: "ok", text: `Uploading “${file.name}”…` });
      const blob = await upload(`landscape-reports/${slug}/${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/blob-upload",
        contentType: file.type || undefined,
      });
      // 2) Ingest from the blob URL: extract → chunk → embed.
      setMsg({ kind: "ok", text: "Extracting, chunking and embedding — this can take a minute…" });
      const res = await fetch(`/api/admin/landscapes/${slug}/ingest`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ blobUrl: blob.url, fileName: file.name, title, year }),
      });
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
          accept=".pdf,.docx"
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
        <span className="text-[11px] text-muted">.pdf or .docx · large files OK</span>
      </div>
      {msg && (
        <p className={`text-[12.5px] leading-[1.5] ${msg.kind === "err" ? "text-red-alert" : "text-ink-soft"}`}>
          {msg.text}
        </p>
      )}
    </form>
  );
}
