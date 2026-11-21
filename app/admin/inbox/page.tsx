import Link from "next/link";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { KIND_LABEL, listInbox, updateInboxItem, type InboxKind } from "@/lib/admin/inbox";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inbox · Admin" };

async function act(form: FormData) {
  "use server";
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (user?.role !== "admin" && user?.role !== "editor") return;
  const kind = String(form.get("kind") ?? "") as InboxKind;
  const refId = String(form.get("ref") ?? "");
  const title = String(form.get("title") ?? "");
  const op = String(form.get("op") ?? "");
  if (op === "assign") await updateInboxItem({ kind, refId, title, actorId: user.id ?? null, assignTo: user.id ?? null });
  if (op === "unassign") await updateInboxItem({ kind, refId, title, actorId: user.id ?? null, assignTo: null });
  if (op === "snooze") await updateInboxItem({ kind, refId, title, actorId: user.id ?? null, snoozeDays: 7 });
  if (op === "unsnooze") await updateInboxItem({ kind, refId, title, actorId: user.id ?? null, snoozeDays: null });
  revalidatePath("/admin/inbox");
}

const DAY = 86_400_000;

export default async function Inbox({ searchParams }: { searchParams: Promise<{ kind?: string; mine?: string; snoozed?: string }> }) {
  const sp = await searchParams;
  const session = await auth();
  const me = (session?.user as { id?: string } | undefined)?.id ?? null;
  const all = await listInbox();
  const now = Date.now();
  const isSnoozed = (s: string | null) => !!s && new Date(s).getTime() > now;
  const visible = all.filter((i) =>
    (!sp.kind || i.kind === sp.kind) && (!sp.mine || i.assigned_to === me) && (sp.snoozed ? isSnoozed(i.snoozed_until) : !isSnoozed(i.snoozed_until)));
  const counts = new Map<string, number>();
  for (const i of all) if (!isSnoozed(i.snoozed_until)) counts.set(i.kind, (counts.get(i.kind) ?? 0) + 1);
  const mineCount = all.filter((i) => i.assigned_to === me && !isSnoozed(i.snoozed_until)).length;
  const snoozedCount = all.filter((i) => isSnoozed(i.snoozed_until)).length;
  const chip = (href: string, label: string, n: number, on: boolean) => (
    <Link href={href} className={`rounded-full border px-3 py-1 text-[12.5px] ${on ? "bg-teal text-paper border-teal" : "border-line text-ink-soft hover:border-teal"}`}>
      {label} <span className="tabular-nums opacity-80">{n}</span>
    </Link>
  );

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-serif text-[28px] text-deep-teal">Inbox</h1>
        <p className="text-[14px] text-muted max-w-[760px] mt-1">
          Everything waiting for an editor, oldest first. Open an item to decide it on its own screen. Amber means waiting
          3+ days, red 7+.
        </p>
      </header>
      <nav className="flex flex-wrap gap-2">
        {chip("/admin/inbox", "All", all.length - snoozedCount, !sp.kind && !sp.mine && !sp.snoozed)}
        {chip("/admin/inbox?mine=1", "Assigned to me", mineCount, !!sp.mine)}
        {(Object.keys(KIND_LABEL) as InboxKind[]).filter((k) => counts.get(k)).map((k) =>
          chip(`/admin/inbox?kind=${k}`, KIND_LABEL[k], counts.get(k) ?? 0, sp.kind === k))}
        {snoozedCount > 0 && chip("/admin/inbox?snoozed=1", "Snoozed", snoozedCount, !!sp.snoozed)}
      </nav>
      {visible.length === 0 ? (
        <p className="text-[14px] text-muted">Nothing here. All caught up.</p>
      ) : (
        <ul className="rounded-[10px] border border-line divide-y divide-line">
          {visible.map((i) => {
            const age = Math.floor((now - new Date(i.created_at).getTime()) / DAY);
            const tone = age >= 7 ? "bg-red-alert/10 text-red-alert border-red-alert/30" : age >= 3 ? "bg-amber/20 text-deep-teal border-amber/40" : "bg-paper text-muted border-line";
            const assignable = i.kind !== "budget_changes";
            return (
              <li key={`${i.kind}:${i.ref_id}`} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <span className={`rounded-[5px] border px-1.5 py-0.5 font-mono text-[11px] tabular-nums ${tone}`}>{age}d</span>
                <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted min-w-[150px]">{KIND_LABEL[i.kind]}</span>
                <Link href={i.href} className="min-w-0 flex-1 text-[14px] text-ink hover:text-teal">
                  {i.title}
                  {i.detail ? <span className="text-muted text-[12.5px]"> · {i.detail}</span> : null}
                </Link>
                {i.assigned_email && <span className="text-[12px] text-muted">{i.assigned_to === me ? "You" : i.assigned_email}</span>}
                {assignable && (
                  <form action={act} className="flex gap-1.5">
                    <input type="hidden" name="kind" value={i.kind} />
                    <input type="hidden" name="ref" value={i.ref_id} />
                    <input type="hidden" name="title" value={i.title.slice(0, 200)} />
                    {i.assigned_to === me
                      ? <button name="op" value="unassign" className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted hover:text-ink">Unassign</button>
                      : <button name="op" value="assign" className="font-mono text-[11px] uppercase tracking-[0.08em] text-deep-teal hover:text-teal">Take it</button>}
                    {isSnoozed(i.snoozed_until)
                      ? <button name="op" value="unsnooze" className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted hover:text-ink">Unsnooze</button>
                      : <button name="op" value="snooze" className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted hover:text-ink">Snooze 7d</button>}
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
