"use client";

import { useActionState, useState } from "react";
import type { AccessRequest } from "@/lib/access/requests";
import { decideAccessAction, recordEmailRequestAction, type DecideState, type RecordState } from "./actions";

const input = "rounded-[6px] border border-line bg-paper px-2 py-1.5 text-[13px] text-ink";
const btn = "rounded-[6px] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] disabled:opacity-60";

export function PendingRequest({ r, landscapes }: { r: AccessRequest; landscapes: { slug: string; name: string }[] }) {
  const [state, action, pending] = useActionState<DecideState, FormData>(decideAccessAction, {});
  const [copied, setCopied] = useState(false);
  if (state.done) {
    return (
      <li className="rounded-[10px] border border-line bg-cream/50 px-5 py-4 space-y-2">
        <p className="text-[14px] text-deep-teal font-medium">{r.name} · {state.done === "approved" ? "approved" : "declined"}</p>
        {state.emailed && <p className="text-[13px] text-ink-soft">{state.emailed}</p>}
        {state.url && (
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded-[6px] bg-paper border border-line px-2 py-1 text-[12px] break-all">{state.url}</code>
            <button type="button" onClick={() => navigator.clipboard.writeText(state.url!).then(() => setCopied(true))}
              className={`${btn} border border-line text-deep-teal`}>{copied ? "Copied" : "Copy"}</button>
            <span className="text-[12px] text-muted">Shown once.</span>
          </div>
        )}
      </li>
    );
  }
  return (
    <li className="rounded-[10px] border border-line bg-paper px-5 py-4 space-y-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-serif text-[18px] text-deep-teal">{r.name}</span>
        <span className="text-[13.5px] text-ink-soft">{r.organisation}{r.role ? `, ${r.role}` : ""}</span>
        <span className="text-[13px] text-muted">{r.email}</span>
        <span className="ml-auto font-mono text-[11px] text-muted">
          {r.channel === "email" ? "by email · " : ""}{new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      </div>
      <p className="text-[14px] text-ink whitespace-pre-line border-l-2 border-line pl-3">{r.purpose}</p>
      <form action={action} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="id" value={r.id} />
        <label className="flex flex-col gap-1 text-[12px] text-muted">Landscape
          <select name="landscape" defaultValue={r.landscape_slug ?? "all"} className={input}>
            <option value="all">All landscapes</option>
            {landscapes.map((l) => <option key={l.slug} value={l.slug}>{l.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[12px] text-muted">Link expires after
          <select name="days" defaultValue="90" className={input}>
            <option value="30">30 days</option><option value="90">90 days</option>
            <option value="180">6 months</option><option value="365">1 year</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[12px] text-muted grow min-w-[200px]">Note (optional; included in a decline email)
          <input name="note" maxLength={1000} className={input} />
        </label>
        <div className="flex flex-col gap-1.5 text-[12.5px] text-ink-soft">
          <label className="flex items-center gap-1.5"><input type="checkbox" name="sendLink" defaultChecked className="accent-teal" />Email the link when approved</label>
          <label className="flex items-center gap-1.5"><input type="checkbox" name="tellThem" className="accent-teal" />Tell them if declined</label>
        </div>
        <button name="decision" value="approve" disabled={pending} className={`${btn} bg-teal text-paper hover:bg-deep-teal`}>Approve</button>
        <button name="decision" value="decline" disabled={pending} className={`${btn} border border-line text-ink-soft hover:text-red-alert`}>Decline</button>
      </form>
      {state.error && <p className="text-[13px] text-red-alert">{state.error}</p>}
    </li>
  );
}

export function RecordEmailRequest({ landscapes }: { landscapes: { slug: string; name: string }[] }) {
  const [state, action, pending] = useActionState<RecordState, FormData>(recordEmailRequestAction, {});
  const [open, setOpen] = useState(false);
  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className={`${btn} border border-line text-deep-teal`}>Record a request that came by email</button>;
  }
  return (
    <form action={action} className="rounded-[10px] border border-line bg-cream/50 px-5 py-4 grid sm:grid-cols-2 gap-3">
      <input name="name" required placeholder="Name" className={input} />
      <input name="email" type="email" required placeholder="Email" className={input} />
      <input name="organisation" required placeholder="Organisation" className={input} />
      <input name="role" placeholder="Role (optional)" className={input} />
      <select name="landscape" defaultValue="all" className={input}>
        <option value="all">All landscapes</option>
        {landscapes.map((l) => <option key={l.slug} value={l.slug}>{l.name}</option>)}
      </select>
      <textarea name="purpose" required minLength={10} rows={2} placeholder="Purpose, from their email" className={`${input} sm:col-span-2`} />
      <div className="sm:col-span-2 flex items-center gap-3">
        <button disabled={pending} className={`${btn} bg-teal text-paper`}>{pending ? "Saving…" : "Add to the queue"}</button>
        {state.ok && <span className="text-[13px] text-deep-teal">Added. Approve it below.</span>}
        {state.error && <span className="text-[13px] text-red-alert">{state.error}</span>}
      </div>
    </form>
  );
}
