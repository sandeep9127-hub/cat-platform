"use client";

import { useActionState } from "react";
import { requestAccessAction, type RequestState } from "./actions";

const field = "rounded-[6px] border border-line bg-paper px-3 py-2 text-[15px] text-ink w-full";
const label = "flex flex-col gap-1.5 text-[13.5px] text-ink-soft";

export function RequestAccessForm({ landscapes, initial }: { landscapes: { slug: string; name: string }[]; initial: string }) {
  const [state, action, pending] = useActionState<RequestState, FormData>(requestAccessAction, {});
  if (state.ok) {
    return (
      <div role="status" className="rounded-[10px] border border-line bg-cream px-6 py-5 space-y-2">
        <h2 className="font-serif text-[22px] text-deep-teal">Thank you. Your request is with the CAT team.</h2>
        <p className="text-[15px] text-ink-soft">
          If it&apos;s approved, you&apos;ll get an email with a personal, view-only link to the full table.
        </p>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-5 max-w-[640px]" noValidate={false}>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className={label}>Your name<input name="name" required minLength={2} maxLength={120} autoComplete="name" className={field} /></label>
        <label className={label}>Email<input name="email" type="email" required maxLength={254} autoComplete="email" className={field} /></label>
        <label className={label}>Organisation<input name="organisation" required minLength={2} maxLength={200} autoComplete="organization" className={field} /></label>
        <label className={label}>Role (optional)<input name="role" maxLength={120} autoComplete="organization-title" className={field} /></label>
      </div>
      <label className={label}>
        Which landscape
        <select name="landscape" defaultValue={initial} className={field}>
          <option value="all">All landscapes</option>
          {landscapes.map((l) => <option key={l.slug} value={l.slug}>{l.name}</option>)}
        </select>
      </label>
      <label className={label}>
        How will you use the figures?
        <textarea name="purpose" required minLength={10} maxLength={2000} rows={4} className={field}
          placeholder="e.g. Due diligence for a grant to the landscape's farmer producer organisations" />
      </label>
      {/* Not shown to people; catches form-filling bots. */}
      <div aria-hidden="true" className="absolute -left-[10000px] w-px h-px overflow-hidden">
        <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <label className="flex items-start gap-2.5 text-[14px] text-ink-soft">
        <input type="checkbox" name="consent" required className="mt-1 accent-teal" />
        I&apos;ll use the figures only for the purpose above and won&apos;t share the link.
      </label>
      {state.error && <p role="alert" className="text-[14px] text-red-alert">{state.error}</p>}
      <button disabled={pending}
        className="rounded-[6px] bg-teal text-paper px-5 py-2.5 font-mono text-[12px] uppercase tracking-[0.12em] hover:bg-deep-teal disabled:opacity-60">
        {pending ? "Sending…" : "Request access"}
      </button>
    </form>
  );
}
