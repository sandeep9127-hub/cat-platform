"use client";

import { useState } from "react";
import { finishUploadAction, startUploadAction } from "./actions";

const input = "rounded-[6px] border border-line bg-paper px-2.5 py-1.5 text-[13.5px] text-ink";
const label = "flex flex-col gap-1 text-[12.5px] text-muted";
const TYPES: Record<string, string> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word",
};

export function UploadForm({ landscapes }: { landscapes: { slug: string; name: string }[] }) {
  const [state, setState] = useState<{ busy?: string; ok?: string; error?: string }>({});

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const file = form.get("file") as File | null;
    if (!file || !file.size) return setState({ error: "Choose a PDF or Word file." });
    if (!TYPES[file.type]) return setState({ error: "Upload a PDF or a Word (.docx) file." });
    setState({ busy: "Preparing…" });
    const start = await startUploadAction({
      title: form.get("title"), landscape: form.get("landscape"), docType: form.get("docType"),
      label: form.get("label"), publishedOn: form.get("publishedOn"), sourceUrl: form.get("sourceUrl"),
      fileName: file.name, contentType: file.type, bytes: file.size,
    });
    if (start.error || !start.putUrl || !start.jobId) return setState({ error: start.error ?? "Couldn't start the upload." });
    setState({ busy: "Uploading…" });
    const put = await fetch(start.putUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file }).catch(() => null);
    if (!put || !put.ok) return setState({ error: "The upload didn't go through. Check your connection and try again." });
    setState({ busy: "Reading and indexing the document. Long reports take a few minutes…" });
    const done: { ok?: string; error?: string } = await finishUploadAction(start.jobId).catch(() => ({ error: "timeout" }));
    if (done.error === "timeout") {
      return setState({ ok: "The file is saved. It's taking longer than this page can wait, so tonight's sync will finish it; its status shows below." });
    }
    setState(done.ok ? { ok: done.ok } : { error: done.error });
  }

  return (
    <form onSubmit={submit} className="rounded-[10px] border border-line bg-cream/40 px-5 py-4 space-y-3">
      <h2 className="font-serif text-[19px] text-deep-teal">Add a document</h2>
      <p className="text-[13px] text-muted max-w-[720px]">
        For documents outside the Drive Final folder (e.g. Pangi). PDF with a text layer, or Word (.docx), up to 100 MB.
        Uploading a file with the same title again replaces the old version.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className={label}>Title<input name="title" required minLength={3} maxLength={300} className={input} /></label>
        <label className={label}>Landscape
          <select name="landscape" defaultValue="none" className={input}>
            <option value="none">None (general reference)</option>
            {landscapes.map((l) => <option key={l.slug} value={l.slug}>{l.name}</option>)}
          </select>
        </label>
        <label className={label}>Type
          <select name="docType" defaultValue="report" className={input}>
            <option value="report">Report</option><option value="lip">Landscape investment plan</option><option value="other">Other</option>
          </select>
        </label>
        <label className={label}>Version label<input name="label" maxLength={120} placeholder="e.g. Final, March 2026" className={input} /></label>
        <label className={label}>Published on (optional)<input name="publishedOn" type="date" className={input} /></label>
        <label className={label}>Source link (optional)<input name="sourceUrl" type="url" placeholder="https://" className={input} /></label>
      </div>
      <input name="file" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required className="text-[13px]" />
      <div className="flex items-center gap-3">
        <button disabled={!!state.busy} className="rounded-[6px] bg-teal text-paper px-4 py-2 font-mono text-[11px] uppercase tracking-[0.1em] hover:bg-deep-teal disabled:opacity-60">
          Upload and publish
        </button>
        {state.busy && <span role="status" className="text-[13px] text-muted">{state.busy}</span>}
        {state.ok && <span role="status" className="text-[13px] text-deep-teal">{state.ok}</span>}
        {state.error && <span role="alert" className="text-[13px] text-red-alert">{state.error}</span>}
      </div>
    </form>
  );
}
