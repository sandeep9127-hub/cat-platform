"use client";

import { useActionState, useState } from "react";
import { createLinkAction, type CreateState } from "./actions";

/** Creates a private link and shows it once; only its hash is stored. */
export function ShareLinkCreator({ landscape }: { landscape: string }) {
  const [state, action, pending] = useActionState<CreateState, FormData>(createLinkAction, {});
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-3">
      <form action={action} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="landscape" value={landscape} />
        <label className="flex flex-col gap-1 text-[12.5px] text-muted">
          Who is it for
          <input name="label" required maxLength={200} placeholder="e.g. Funder X, due diligence"
            className="rounded-[6px] border border-line bg-paper px-2.5 py-1.5 text-[13.5px] text-ink w-[280px]" />
        </label>
        <label className="flex flex-col gap-1 text-[12.5px] text-muted">
          Expires after
          <select name="days" defaultValue="30" className="rounded-[6px] border border-line bg-paper px-2 py-1.5 text-[13.5px] text-ink">
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="180">6 months</option>
            <option value="365">1 year</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-[13px] text-ink-soft pb-1.5">
          <input type="checkbox" name="download" className="accent-teal" /> Allow CSV download
        </label>
        <button disabled={pending}
          className="rounded-[6px] bg-teal text-paper px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.1em] hover:bg-deep-teal disabled:opacity-60">
          {pending ? "Creating…" : "Create link"}
        </button>
      </form>
      {state.error && <p className="text-[13px] text-red-alert">{state.error}</p>}
      {state.url && (
        <div className="rounded-[8px] border border-teal/30 bg-teal/10 px-4 py-3 space-y-2">
          <p className="text-[13px] text-deep-teal">
            Copy this link now. It is shown only once; if it&apos;s lost, revoke it and create a new one.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded-[6px] bg-paper border border-line px-2 py-1 text-[12.5px] break-all">{state.url}</code>
            <button type="button"
              onClick={() => navigator.clipboard.writeText(state.url!).then(() => setCopied(true))}
              className="rounded-[6px] border border-line px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.1em] text-deep-teal hover:bg-paper">
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
