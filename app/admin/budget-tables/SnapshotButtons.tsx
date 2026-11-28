"use client";

import { useActionState } from "react";
import { publishSnapshotAction, restoreSnapshotAction, updateFromSheetAction, type SyncState } from "./actions";

const BTN = "rounded-[6px] px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.1em] disabled:opacity-60";

export function UpdateFromSheet() {
  const [state, action, pending] = useActionState<SyncState, FormData>(updateFromSheetAction, {});
  return (
    <form action={action} className="space-y-2">
      <button disabled={pending} className={`${BTN} bg-teal text-paper hover:bg-deep-teal`}>
        {pending ? "Reading the sheet…" : "Update from sheet"}
      </button>
      {state.error && <p className="text-[13px] text-red-alert max-w-[760px]" role="alert">{state.error}</p>}
    </form>
  );
}

export function PublishSnapshot({ id }: { id: string }) {
  const [state, action, pending] = useActionState<SyncState, FormData>(publishSnapshotAction, {});
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <button disabled={pending} className={`${BTN} bg-teal text-paper hover:bg-deep-teal`}>
        {pending ? "Publishing… (rebuilding Ask's budget passages)" : "Publish this update"}
      </button>
      {state.error && <p className="text-[13px] text-red-alert" role="alert">{state.error}</p>}
    </form>
  );
}

export function RestoreSnapshot({ id }: { id: string }) {
  const [state, action, pending] = useActionState<SyncState, FormData>(restoreSnapshotAction, {});
  return (
    <form action={action} className="inline">
      <input type="hidden" name="id" value={id} />
      <button disabled={pending} className="font-mono text-[11px] uppercase tracking-[0.1em] text-teal hover:text-deep-teal disabled:opacity-60">
        {pending ? "Restoring…" : "Restore"}
      </button>
      {state.error && <span className="ml-2 text-[12px] text-red-alert" role="alert">{state.error}</span>}
    </form>
  );
}
