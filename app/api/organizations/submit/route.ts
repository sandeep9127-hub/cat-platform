import { NextRequest, NextResponse } from "next/server";
import { insertSubmission, type Submission } from "@/lib/db/directory";

export const runtime = "nodejs";
export const preferredRegion = "bom1";
export const dynamic = "force-dynamic";

const str = (v: unknown, max = 400) =>
  typeof v === "string" ? v.trim().slice(0, max) || undefined : undefined;
const numOrNull = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export async function POST(req: NextRequest) {
  // Public form: cap submissions per connection (also bounds editor notification emails).
  const { getClientIp, rateLimit } = await import("@/lib/security/ratelimit");
  const limited = await rateLimit({ key: "org-submit", ip: getClientIp(req), limit: 10, windowSec: 3600 });
  if (!limited.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const submissionType = body.submissionType === "edit" ? "edit" : "new";
  const name = str(body.name, 300);
  if (!name) {
    return NextResponse.json({ error: "name_required" }, { status: 400 });
  }
  // Light honeypot / contact check: an email is requested so we can verify.
  const contactEmail = str(body.contactEmail, 200);

  const submission: Submission = {
    submissionType,
    targetOrgId: str(body.targetOrgId, 64) ?? null,
    name,
    orgType: str(body.orgType, 80),
    domains: Array.isArray(body.domains)
      ? (body.domains as unknown[]).map((d) => String(d).slice(0, 120)).slice(0, 30)
      : [],
    website: str(body.website, 300),
    // One org, many work locations. Accept a `locations` array; fall back to the
    // legacy flat fields if an older client posts a single location.
    locations: Array.isArray(body.locations)
      ? (body.locations as Record<string, unknown>[]).slice(0, 25).map((l) => ({
          state: str(l.state, 120),
          district: str(l.district, 120),
          subdistrict: str(l.subdistrict, 120),
          block: str(l.block, 120),
          // Canonical geography id from the picker — uniform tagging, no spelling drift.
          geographyId: str(l.geographyId, 64),
          latitude: numOrNull(l.latitude),
          longitude: numOrNull(l.longitude),
        }))
      : [
          {
            state: str(body.state, 120),
            district: str(body.district, 120),
            subdistrict: str(body.subdistrict, 120),
            block: str(body.block, 120),
            latitude: numOrNull(body.latitude),
            longitude: numOrNull(body.longitude),
          },
        ],
    comments: str(body.comments, 2000),
    contactPerson: str(body.contactPerson, 200),
    contactEmail,
    submitterNote: str(body.submitterNote, 2000),
  };

  try {
    await insertSubmission(submission);
    await notifyEditors(submission).catch((e) => console.error("[org-submit] editor email failed", (e as Error).message));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("organizations/submit failed:", e);
    return NextResponse.json({ error: "submit_failed" }, { status: 500 });
  }
}

/**
 * Tell the editors a submission is waiting (it used to sit unseen in the
 * queue). Off with SUBMISSION_EMAIL=off or when email isn't configured.
 */
async function notifyEditors(s: Submission): Promise<void> {
  if (process.env.SUBMISSION_EMAIL === "off") return;
  const { sql } = await import("drizzle-orm");
  const { db } = await import("@/lib/db");
  const { sendEmail } = await import("@/lib/notify/email");
  const { siteUrl } = await import("@/lib/share/links");
  const to = ((await db.execute(sql`
    SELECT email FROM "cat".users WHERE role IN ('admin', 'editor') AND email IS NOT NULL`)) as unknown as { rows: { email: string }[] })
    .rows.map((u) => u.email);
  if (!to.length) return;
  // Nothing the submitter typed goes into the email: only the count and the admin link.
  const pending = ((await db.execute(sql`
    SELECT count(*)::int AS n FROM "cat".org_submissions WHERE status = 'pending'`)) as unknown as { rows: { n: number }[] }).rows[0]?.n ?? 1;
  const link = (await siteUrl("/admin/submissions")) ?? "the Hub admin, under Submissions";
  await sendEmail({
    to,
    subject: `Organisation submissions waiting: ${pending}`,
    text: `A ${s.submissionType === "new" ? "new organisation" : "change to an organisation"} was submitted to the Organisations map. ${pending} submission${pending === 1 ? " is" : "s are"} waiting for review.\n\nReview them at ${link}.`,
  });
}
