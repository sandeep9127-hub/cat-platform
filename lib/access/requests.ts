import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { sendEmail } from "@/lib/notify/email";
import { createShareLink, revokeShareLink, shareEmail, shareUrl } from "@/lib/share/links";

/**
 * Requests to view the full investment tables. People ask through the public
 * form (or by email, recorded by an editor); an editor approves or declines.
 * Approval creates a personal, view-only, expiring share link and emails it.
 */

export type AccessRequest = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  organisation: string;
  role: string | null;
  purpose: string;
  landscape_slug: string | null;
  channel: "form" | "email";
  status: "pending" | "approved" | "declined";
  decided_at: string | null;
  decision_note: string | null;
  decided_by_email: string | null;
  share_link_id: string | null;
  link_expires_at: string | null;
  link_revoked_at: string | null;
  link_views: number | null;
  emailed_at: string | null;
};

const rows = <T>(r: unknown) => (r as { rows: T[] }).rows;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const clean = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, max);

export type RequestInput = {
  name: string; email: string; organisation: string; role?: string; purpose: string;
  landscape: string; channel?: "form" | "email"; ip?: string;
};

/** Validate and store a request. Returns an error message for the person, or the new id. */
export async function submitAccessRequest(input: RequestInput): Promise<{ id?: string; error?: string }> {
  const name = clean(input.name, 120);
  const email = clean(input.email, 254).toLowerCase();
  const organisation = clean(input.organisation, 200);
  const role = clean(input.role, 120) || null;
  const purpose = clean(input.purpose, 2000);
  const landscape = input.landscape === "all" ? null : input.landscape;
  if (name.length < 2) return { error: "Please give your name." };
  if (!EMAIL_RE.test(email)) return { error: "Please give a valid email address." };
  if (organisation.length < 2) return { error: "Please give your organisation." };
  if (purpose.length < 10) return { error: "Please say briefly how you'll use the figures (at least a sentence)." };
  if (landscape !== null && !LANDSCAPES[landscape]) return { error: "Please choose a landscape." };

  // One open request per email and landscape is enough.
  const open = rows<{ id: string }>(await db.execute(sql`
    SELECT id FROM "cat".access_requests
    WHERE lower(email) = ${email} AND status = 'pending' AND landscape_slug IS NOT DISTINCT FROM ${landscape}`))[0];
  if (open) return { id: open.id };

  const day = new Date().toISOString().slice(0, 10);
  const salt = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "cat-access";
  const ipHash = input.ip ? createHash("sha256").update(`${salt}|${day}|${input.ip}`).digest("hex") : null;
  const r = rows<{ id: string }>(await db.execute(sql`
    INSERT INTO "cat".access_requests (name, email, organisation, role, purpose, landscape_slug, channel, ip_hash)
    VALUES (${name}, ${email}, ${organisation}, ${role}, ${purpose}, ${landscape}, ${input.channel ?? "form"}, ${ipHash})
    RETURNING id`))[0];

  // Let editors know (only when switched on, like the sync digest).
  if (process.env.ACCESS_REQUEST_EMAIL === "on") {
    const to = rows<{ email: string }>(await db.execute(sql`
      SELECT email FROM "cat".users WHERE role IN ('admin', 'editor') AND email IS NOT NULL`)).map((u) => u.email);
    if (to.length) {
      await sendEmail({
        to,
        subject: `Access request: ${organisation} (${landscape ? LANDSCAPES[landscape].name : "all landscapes"})`,
        text: `${name} <${email}> from ${organisation}${role ? ` (${role})` : ""} asked to view the full investment table for ${landscape ? LANDSCAPES[landscape].name : "all landscapes"}.\n\nPurpose:\n${purpose}\n\nApprove or decline it in the Hub admin, under Access requests.`,
      });
    }
  }
  return { id: r.id };
}

export async function listAccessRequests(): Promise<AccessRequest[]> {
  return rows<AccessRequest>(await db.execute(sql`
    SELECT r.id, r.created_at, r.name, r.email, r.organisation, r.role, r.purpose, r.landscape_slug, r.channel, r.status,
           r.decided_at, r.decision_note, u.email AS decided_by_email, r.share_link_id, r.emailed_at,
           l.expires_at AS link_expires_at, l.revoked_at AS link_revoked_at,
           (SELECT count(*)::int FROM "cat".share_link_views v WHERE v.link_id = l.id) AS link_views
    FROM "cat".access_requests r
    LEFT JOIN "cat".users u ON u.id = r.decided_by
    LEFT JOIN "cat".share_links l ON l.id = r.share_link_id
    ORDER BY r.status <> 'pending', r.created_at DESC
    LIMIT 300`));
}

export async function approveAccessRequest(opts: {
  id: string; days: number; landscape: string; userId: string | null; sendLink: boolean; note?: string | null;
}): Promise<{ url?: string; emailed?: string; error?: string }> {
  if (!UUID.test(opts.id)) return { error: "Unknown request." };
  const all = opts.landscape === "all";
  if (!all && !LANDSCAPES[opts.landscape]) return { error: "Unknown landscape." };
  const req = rows<AccessRequest>(await db.execute(sql`
    SELECT * FROM "cat".access_requests WHERE id = ${opts.id}::uuid AND status = 'pending'`))[0];
  if (!req) return { error: "This request was already decided." };

  const link = await createShareLink({
    scope: all ? "all_landscapes_full_table" : "landscape_full_table",
    landscapeSlug: all ? null : opts.landscape,
    label: `${req.name}, ${req.organisation} (request)`.slice(0, 200),
    days: opts.days,
    userId: opts.userId,
  });
  const url = await shareUrl(link.token);
  if (!url) {
    await revokeShareLink(link.id, opts.userId);
    return { error: "NEXT_PUBLIC_SITE_URL is not set on the server, so the link can't be built. Nothing was approved." };
  }
  // Claim the request atomically, so two editors can't both approve it.
  const claimed = rows<{ id: string }>(await db.execute(sql`
    UPDATE "cat".access_requests
    SET status = 'approved', decided_by = ${opts.userId && UUID.test(opts.userId) ? opts.userId : null}, decided_at = now(),
        decision_note = ${opts.note?.slice(0, 1000) || null}, share_link_id = ${link.id}::uuid
    WHERE id = ${opts.id}::uuid AND status = 'pending'
    RETURNING id`))[0];
  if (!claimed) {
    await revokeShareLink(link.id, opts.userId);
    return { error: "This request was already decided." };
  }

  let emailed: string | undefined;
  if (opts.sendLink) {
    const scopeName = all ? "all landscapes" : LANDSCAPES[opts.landscape].name;
    const res = await sendEmail({ to: req.email, ...shareEmail({ name: req.name, url, scopeName, expiresAt: link.expiresAt }) });
    if (res === "sent") await db.execute(sql`UPDATE "cat".access_requests SET emailed_at = now() WHERE id = ${opts.id}::uuid`);
    emailed = res === "sent" ? `Emailed to ${req.email}.`
      : res === "disabled" ? "Email isn't configured on this server; send the link yourself."
      : `Email failed (${res.slice(8, 120)}); send the link yourself.`;
  }
  return { url, emailed };
}

export async function declineAccessRequest(opts: { id: string; userId: string | null; note?: string | null; tellThem: boolean }): Promise<{ emailed?: string; error?: string }> {
  if (!UUID.test(opts.id)) return { error: "Unknown request." };
  const req = rows<AccessRequest>(await db.execute(sql`
    UPDATE "cat".access_requests
    SET status = 'declined', decided_by = ${opts.userId && UUID.test(opts.userId) ? opts.userId : null}, decided_at = now(),
        decision_note = ${opts.note?.slice(0, 1000) || null}
    WHERE id = ${opts.id}::uuid AND status = 'pending'
    RETURNING name, email, landscape_slug`))[0];
  if (!req) return { error: "This request was already decided." };
  if (!opts.tellThem) return {};
  const res = await sendEmail({
    to: req.email,
    subject: "Your request to view the CAT investment tables",
    text: [
      `Dear ${req.name},`,
      "",
      "Thank you for your interest in the landscape investment plans. We aren't able to share the full investment table with you at this time.",
      ...(opts.note ? ["", opts.note] : []),
      "",
      "The summary figures stay available on the CAT Transformation Hub.",
      "",
      "Consortium for Agroecological Transformations (CAT)",
    ].join("\n"),
  });
  return { emailed: res === "sent" ? `Told ${req.email}.` : res === "disabled" ? "Email isn't configured; let them know yourself." : `Email failed; let them know yourself.` };
}
