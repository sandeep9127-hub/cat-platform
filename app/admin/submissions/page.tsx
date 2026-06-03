import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

type Sub = {
  id: string;
  submission_type: string;
  target_org_id: string | null;
  name: string;
  org_type: string | null;
  domains: string[] | null;
  state: string | null;
  district: string | null;
  subdistrict: string | null;
  block: string | null;
  latitude: number | null;
  longitude: number | null;
  comments: string | null;
  contact_person: string | null;
  contact_email: string | null;
  submitter_note: string | null;
  status: string;
  created_at: string;
};

async function actor() {
  const session = await auth();
  return {
    id: (session?.user as { id?: string })?.id ?? null,
    email: session?.user?.email ?? null,
  };
}

/** Approve a submission: publish it into the live directory, then mark approved. */
async function approve(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  if (!id) return;
  const a = await actor();

  const r = await db.execute(sql`SELECT * FROM "cat".org_submissions WHERE id = ${id} AND status = 'pending'`);
  const sub = (r as unknown as { rows: Sub[] }).rows[0];
  if (!sub) return;

  if (sub.target_org_id) {
    // Edit suggestion: apply the submitted (non-empty) fields to the live org.
    await db.execute(sql`
      UPDATE "cat".directory_orgs SET
        name = COALESCE(NULLIF(${sub.name}, ''), name),
        org_type = COALESCE(NULLIF(${sub.org_type}, ''), org_type),
        domains = COALESCE(${sub.domains ? JSON.stringify(sub.domains) : null}::jsonb, domains),
        contact_person = COALESCE(NULLIF(${sub.contact_person}, ''), contact_person),
        contact_email = COALESCE(NULLIF(${sub.contact_email}, ''), contact_email)
      WHERE id = ${sub.target_org_id}
    `);
  } else {
    // New organisation: insert into directory + a location if we have one.
    const ins = await db.execute(sql`
      INSERT INTO "cat".directory_orgs
        (name, org_type, org_type_raw, domains, contact_person, contact_email, provenance, is_published)
      VALUES (${sub.name}, ${sub.org_type || "Other"}, ${sub.org_type || null},
              ${sub.domains ? JSON.stringify(sub.domains) : "[]"}::jsonb,
              ${sub.contact_person || null}, ${sub.contact_email || null}, 'self_submitted', true)
      RETURNING id
    `);
    const orgId = (ins as unknown as { rows: { id: string }[] }).rows[0].id;
    if (sub.state || sub.district || sub.latitude != null) {
      await db.execute(sql`
        INSERT INTO "cat".directory_locations
          (org_id, state, district, subdistrict, block, latitude, longitude)
        VALUES (${orgId}, ${sub.state}, ${sub.district}, ${sub.subdistrict}, ${sub.block},
                ${sub.latitude}, ${sub.longitude})
      `);
    }
  }

  await db.execute(sql`UPDATE "cat".org_submissions SET status = 'approved' WHERE id = ${id}`);
  await writeAudit({
    actorUserId: a.id, actorEmail: a.email,
    action: sub.target_org_id ? "submission.edit.approved" : "submission.new.approved",
    entityType: "org_submission", entityId: id,
    meta: { name: sub.name, targetOrgId: sub.target_org_id },
  });
  revalidatePath("/admin/submissions");
}

async function reject(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  if (!id) return;
  const a = await actor();
  await db.execute(sql`UPDATE "cat".org_submissions SET status = 'rejected' WHERE id = ${id} AND status = 'pending'`);
  await writeAudit({
    actorUserId: a.id, actorEmail: a.email,
    action: "submission.rejected", entityType: "org_submission", entityId: id,
  });
  revalidatePath("/admin/submissions");
}

export default async function SubmissionsPage() {
  const r = await db.execute(sql`
    SELECT * FROM "cat".org_submissions WHERE status = 'pending' ORDER BY created_at DESC
  `);
  const subs = (r as unknown as { rows: Sub[] }).rows;

  const counts = await db.execute(sql`
    SELECT status, count(*)::int n FROM "cat".org_submissions GROUP BY status
  `);
  const byStatus = Object.fromEntries(
    (counts as unknown as { rows: { status: string; n: number }[] }).rows.map((x) => [x.status, x.n])
  );

  return (
    <div className="space-y-6 max-w-[900px]">
      <header>
        <span className="mono-label">Review queue</span>
        <h1 className="font-serif text-[36px] sm:text-[44px] font-normal tracking-[-0.02em] text-ink mt-2">
          Organisation submissions
        </h1>
        <p className="font-serif italic text-[16px] text-ink-soft mt-2 max-w-[64ch] font-light">
          New organisations and edit suggestions from the public Organizations Atlas. Approving
          publishes straight into the live directory.
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted mt-3">
          {subs.length} pending · {byStatus.approved ?? 0} approved · {byStatus.rejected ?? 0} rejected
        </p>
      </header>

      {subs.length === 0 ? (
        <div className="rounded-[10px] border border-line bg-cream p-8 text-center">
          <p className="font-serif italic text-[17px] text-ink-soft">Nothing waiting for review.</p>
          <p className="text-[13px] text-muted mt-1">
            Submissions from the Organizations Atlas “Add or update an organisation” form land here.
          </p>
        </div>
      ) : (
        <ul className="space-y-4 list-none p-0 m-0">
          {subs.map((s) => (
            <li key={s.id} className="rounded-[10px] border border-line bg-paper p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full bg-amber/25 text-deep-teal">
                    {s.target_org_id ? "Edit suggestion" : "New organisation"}
                  </span>
                  <h2 className="font-serif text-[20px] text-ink mt-2">{s.name || "(no name)"}</h2>
                  <div className="text-[13px] text-ink-soft mt-1">
                    {[s.org_type, s.district, s.state].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <form action={approve}>
                    <input type="hidden" name="id" value={s.id} />
                    <button className="px-3.5 py-2 rounded-[6px] bg-deep-teal text-paper font-mono text-[10px] uppercase tracking-[0.12em] hover:bg-teal transition-colors">
                      Approve
                    </button>
                  </form>
                  <form action={reject}>
                    <input type="hidden" name="id" value={s.id} />
                    <button className="px-3.5 py-2 rounded-[6px] border border-line text-muted font-mono text-[10px] uppercase tracking-[0.12em] hover:text-red-alert hover:border-red-alert transition-colors">
                      Reject
                    </button>
                  </form>
                </div>
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 mt-4 text-[13px]">
                {s.domains && s.domains.length > 0 && (
                  <Field label="Domains" value={s.domains.join(", ")} wide />
                )}
                {s.contact_person && <Field label="Contact" value={s.contact_person} />}
                {s.contact_email && <Field label="Email" value={s.contact_email} />}
                {(s.block || s.subdistrict) && (
                  <Field label="Locality" value={[s.subdistrict, s.block].filter(Boolean).join(", ")} />
                )}
                {s.latitude != null && (
                  <Field label="Coordinates" value={`${s.latitude}, ${s.longitude}`} />
                )}
                {s.comments && <Field label="Notes" value={s.comments} wide />}
                {s.submitter_note && <Field label="Submitter note" value={s.submitter_note} wide />}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Field({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className="text-ink mt-0.5">{value}</dd>
    </div>
  );
}
