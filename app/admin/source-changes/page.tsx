import Link from "next/link";
import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const metadata = { title: "Source changes · Admin" };

type Flag = { id: string; entry_id: string; slug: string; title: string; source_url: string; detected_at: string; diff_summary: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function review(form: FormData) {
  "use server";
  const session = await auth();
  const user = session?.user as { id?: string; email?: string | null; role?: string } | undefined;
  if (user?.role !== "admin" && user?.role !== "editor") return;
  const id = String(form.get("id") ?? "");
  const outcome = form.get("outcome") === "updated" ? "redrafted" : "dismissed_no_change_warranted";
  if (!UUID.test(id)) return;
  await db.execute(sql`
    UPDATE "cat".freshness_flags SET status = ${outcome}::"cat".freshness_status,
      reviewed_by_user_id = ${user.id && UUID.test(user.id) ? user.id : null}
    WHERE id = ${id}::uuid AND status = 'pending_review'`);
  await writeAudit({ actorUserId: user.id ?? null, actorEmail: user.email ?? null, action: `source_change.${outcome}`, entityType: "freshness_flag", entityId: id });
  revalidatePath("/admin/source-changes");
}

export default async function SourceChanges() {
  const flags = (await db.execute(sql`
    SELECT f.id, f.entry_id, e.slug, e.title, f.source_url, f.detected_at, f.diff_summary
    FROM "cat".freshness_flags f JOIN "cat".entries e ON e.id = f.entry_id
    WHERE f.status = 'pending_review' ORDER BY f.detected_at`) as unknown as { rows: Flag[] }).rows;
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-[28px] text-deep-teal">Source changes</h1>
        <p className="text-[14px] text-muted max-w-[760px] mt-1">
          Each week the Hub re-reads the source page behind every published entry. When a page&apos;s text changes, it
          appears here. The entry stays published; check the source, update the entry if needed, then record what you did.
        </p>
      </header>
      {flags.length === 0 ? (
        <p className="text-[14px] text-muted">No source changes waiting.</p>
      ) : (
        <ul className="rounded-[10px] border border-line divide-y divide-line">
          {flags.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <Link href={`/entry/${f.slug}`} target="_blank" className="font-serif text-[16px] text-deep-teal hover:text-teal">{f.title}</Link>
                <div className="text-[12.5px] text-muted mt-0.5">
                  {new Date(f.detected_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} ·{" "}
                  <a href={f.source_url} target="_blank" rel="noopener noreferrer" className="text-teal break-all">source page ↗</a>
                </div>
              </div>
              <form action={review} className="flex gap-2">
                <input type="hidden" name="id" value={f.id} />
                <button name="outcome" value="no_change" className="rounded-[6px] border border-line px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-soft hover:text-teal">No change needed</button>
                <button name="outcome" value="updated" className="rounded-[6px] bg-teal text-paper px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] hover:bg-deep-teal">Entry updated</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
