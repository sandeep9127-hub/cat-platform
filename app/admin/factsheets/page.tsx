import Link from "next/link";
import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { listFactSheets } from "@/lib/factsheet/generate";
import { FactSheetGenerator } from "@/components/admin/FactSheetGenerator";
import { auth } from "@/auth";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

async function actor() {
  const s = await auth();
  return { actorUserId: (s?.user as { id?: string })?.id ?? null, actorEmail: s?.user?.email ?? null };
}

async function setStatus(formData: FormData) {
  "use server";
  const slug = String(formData.get("slug") || "");
  const status = String(formData.get("status") || "");
  if (!slug || !["published", "flagged"].includes(status)) return;
  await db.execute(sql`UPDATE "cat".solution_factsheets SET status=${status}, updated_at=now() WHERE slug=${slug}`);
  await writeAudit({ ...(await actor()), action: `factsheet.${status}`, entityType: "solution_factsheet", entityId: slug });
  revalidatePath("/admin/factsheets");
}

async function remove(formData: FormData) {
  "use server";
  const slug = String(formData.get("slug") || "");
  if (!slug) return;
  await db.execute(sql`DELETE FROM "cat".solution_factsheets WHERE slug=${slug}`);
  await writeAudit({ ...(await actor()), action: "factsheet.deleted", entityType: "solution_factsheet", entityId: slug });
  revalidatePath("/admin/factsheets");
}

export default async function AdminFactSheets() {
  const sheets = await listFactSheets();
  const published = sheets.filter((s) => s.status === "published").length;
  const flagged = sheets.filter((s) => s.status === "flagged").length;

  return (
    <div className="space-y-6 max-w-[1000px]">
      <header>
        <span className="mono-label">Solutions Atlas</span>
        <h1 className="font-serif text-[36px] sm:text-[44px] font-normal tracking-[-0.02em] text-ink mt-2">Fact sheets</h1>
        <p className="font-serif italic text-[16px] text-ink-soft mt-2 max-w-[64ch] font-light">
          Verified, cited fact sheets for the Atlas — researched from allow-listed sources, auto-published
          when well-sourced, printable, with a Read-more link. Flagged ones need a glance.
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted mt-3">
          {published} published · {flagged} flagged · {sheets.length} total
        </p>
      </header>

      <FactSheetGenerator />

      {sheets.length === 0 ? (
        <p className="text-[13.5px] text-muted py-6">No fact sheets yet. Generate one above, or let the weekly discovery agent populate them.</p>
      ) : (
        <ul className="rounded-[10px] border border-line divide-y divide-line list-none p-0 m-0">
          {sheets.map((s) => (
            <li key={s.slug} className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={`/factsheet/${s.slug}`} target="_blank" className="font-serif text-[16px] text-deep-teal hover:text-teal no-underline">
                    {s.title}
                  </Link>
                  <span className={`font-mono text-[8.5px] uppercase tracking-[0.12em] px-2 py-0.5 rounded-full ${s.status === "published" ? "bg-teal/15 text-deep-teal" : "bg-amber/30 text-deep-teal"}`}>
                    {s.status}
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                    conf {Math.round((s.confidence ?? 0) * 100)}%
                  </span>
                  {s.edited_by_human ? (
                    <span className="font-mono text-[8.5px] uppercase tracking-[0.12em] px-2 py-0.5 rounded-full bg-line text-ink-soft">
                      human-edited
                    </span>
                  ) : null}
                </div>
                <div className="text-[12.5px] text-ink-soft mt-1">
                  {[s.lead_organisation, s.district, s.state_code].filter(Boolean).join(" · ") || "—"}
                  {s.source_url ? <> · <a href={s.source_url} target="_blank" className="text-teal">source ↗</a></> : null}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 pt-0.5">
                <Link href={`/admin/factsheets/${s.slug}/edit`} className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-deep-teal hover:text-teal no-underline">
                  Edit
                </Link>
                {s.status !== "published" ? (
                  <form action={setStatus}><input type="hidden" name="slug" value={s.slug} /><input type="hidden" name="status" value="published" />
                    <button className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-deep-teal hover:text-teal">Publish</button>
                  </form>
                ) : (
                  <form action={setStatus}><input type="hidden" name="slug" value={s.slug} /><input type="hidden" name="status" value="flagged" />
                    <button className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted hover:text-ink">Unpublish</button>
                  </form>
                )}
                <form action={remove}><input type="hidden" name="slug" value={s.slug} />
                  <button className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted hover:text-red-alert">Delete</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
