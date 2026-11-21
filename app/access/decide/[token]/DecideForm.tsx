"use client";

import { useActionState } from "react";
import { decideByEmailAction, type DecideState } from "./actions";

const input = "rounded-[6px] border border-line bg-paper px-2.5 py-1.5 text-[14px] text-ink";

export function DecideForm({ token, initial }: { token: string; initial: "approve" | "decline" }) {
  const [state, action, pending] = useActionState<DecideState, FormData>(decideByEmailAction, {});
  if (state.ok) return <p role="status" className="rounded-[8px] border border-teal/30 bg-teal/10 px-4 py-3 text-[15px] text-deep-teal">{state.ok}</p>;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div className="flex flex-wrap gap-4 items-end">
        <label className="flex flex-col gap-1 text-[13px] text-muted">The link works for
          <select name="days" defaultValue="90" className={input}>
            <option value="30">30 days</option><option value="90">90 days</option>
            <option value="180">6 months</option><option value="365">1 year</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[13px] text-muted grow min-w-[220px]">Note (optional; included if you decline)
          <input name="note" maxLength={1000} className={input} />
        </label>
      </div>
      <label className="flex items-center gap-2 text-[14px] text-ink-soft">
        <input type="checkbox" name="tellThem" defaultChecked className="accent-teal" /> If declining, let them know by email
      </label>
      <div className="flex flex-wrap gap-3">
        <button name="decision" value="approve" disabled={pending}
          className={`rounded-[6px] px-4 py-2 font-mono text-[12px] uppercase tracking-[0.1em] disabled:opacity-60 ${initial === "approve" ? "bg-teal text-paper hover:bg-deep-teal" : "border border-line text-deep-teal"}`}>
          Approve and send link
        </button>
        <button name="decision" value="decline" disabled={pending}
          className={`rounded-[6px] px-4 py-2 font-mono text-[12px] uppercase tracking-[0.1em] disabled:opacity-60 ${initial === "decline" ? "bg-red-alert text-paper" : "border border-line text-ink-soft hover:text-red-alert"}`}>
          Decline
        </button>
      </div>
      {state.error && <p role="alert" className="text-[14px] text-red-alert">{state.error}</p>}
    </form>
  );
}
