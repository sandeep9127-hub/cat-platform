import { createHash, randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { sendEmail } from "@/lib/notify/email";
import { createShareLink, revokeShareLink, shareEmail, shareUrl, siteUrl } from "@/lib/share/links";

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
  if (landscape !== null && !Object.hasOwn(LANDSCAPES, landscape)) return { error: "Please choose a landscape." };

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

  // Approvers get an email with one-click Approve / Decline links.
  try {
    await notifyApprovers(r.id);
  } catch (e) {
    console.error("[access] approver email failed", (e as Error).message);
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
  via?: "admin" | "email"; byEmail?: string | null;
}): Promise<{ url?: string; emailed?: string; error?: string; requesterEmail?: string }> {
  if (!UUID.test(opts.id)) return { error: "Unknown request." };
  const all = opts.landscape === "all";
  if (!all && !Object.hasOwn(LANDSCAPES, opts.landscape)) return { error: "Unknown landscape." };
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
        decision_note = ${opts.note?.slice(0, 1000) || null}, share_link_id = ${link.id}::uuid,
        decided_via = ${opts.via ?? "admin"}, decided_by_email = ${opts.byEmail ?? null}
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
  return { url, emailed, requesterEmail: req.email };
}

export async function declineAccessRequest(opts: {
  id: string; userId: string | null; note?: string | null; tellThem: boolean; via?: "admin" | "email"; byEmail?: string | null;
}): Promise<{ emailed?: string; error?: string }> {
  if (!UUID.test(opts.id)) return { error: "Unknown request." };
  const req = rows<AccessRequest>(await db.execute(sql`
    UPDATE "cat".access_requests
    SET status = 'declined', decided_by = ${opts.userId && UUID.test(opts.userId) ? opts.userId : null}, decided_at = now(),
        decision_note = ${opts.note?.slice(0, 1000) || null},
        decided_via = ${opts.via ?? "admin"}, decided_by_email = ${opts.byEmail ?? null}
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

// ─── One-click approval from email ───────────────────────────────────

const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");
const APPROVAL_LINK_DAYS = 14;

/** Who approves: ACCESS_APPROVER_EMAILS (comma-separated), else the Hub's admins and editors. */
async function approverEmails(): Promise<string[]> {
  const configured = (process.env.ACCESS_APPROVER_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter((e) => EMAIL_RE.test(e));
  if (configured.length) return [...new Set(configured)];
  return rows<{ email: string }>(await db.execute(sql`
    SELECT lower(email) AS email FROM "cat".users WHERE role IN ('admin', 'editor') AND email IS NOT NULL`)).map((u) => u.email);
}

/**
 * Email each approver their own Approve / Decline links for a request.
 * Off with ACCESS_REQUEST_EMAIL=off, or when email isn't configured.
 */
export async function notifyApprovers(requestId: string): Promise<{ sent: number; skipped?: string }> {
  if (process.env.ACCESS_REQUEST_EMAIL === "off") return { sent: 0, skipped: "ACCESS_REQUEST_EMAIL=off" };
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) return { sent: 0, skipped: "email not configured" };
  const req = rows<AccessRequest>(await db.execute(sql`SELECT * FROM "cat".access_requests WHERE id = ${requestId}::uuid AND status = 'pending'`))[0];
  if (!req) return { sent: 0, skipped: "not pending" };
  const scope = req.landscape_slug ? LANDSCAPES[req.landscape_slug]?.name ?? req.landscape_slug : "all landscapes";
  let sent = 0;
  for (const to of await approverEmails()) {
    const token = randomBytes(32).toString("base64url");
    await db.execute(sql`
      INSERT INTO "cat".access_request_tokens (token_hash, request_id, approver_email, expires_at)
      VALUES (${sha256(token)}, ${requestId}::uuid, ${to}, now() + make_interval(days => ${APPROVAL_LINK_DAYS}))`);
    const approve = await siteUrl(`/access/decide/${token}?do=approve`);
    const decline = await siteUrl(`/access/decide/${token}?do=decline`);
    if (!approve || !decline) return { sent, skipped: "NEXT_PUBLIC_SITE_URL not set" };
    // No reply-to: these emails carry approval links, so a reply (quoting them)
    // must never reach the requester. The requester's address is shown as text only.
    const res = await sendEmail({
      to,
      subject: `Approve access? ${req.organisation} wants the ${scope} investment table`,
      text: [
        `${req.name} (${req.email}) from ${req.organisation}${req.role ? `, ${req.role}` : ""} asked to view the full investment table for ${scope}.`,
        "",
        "How they'll use it:",
        req.purpose,
        "",
        `APPROVE (sends them a personal, view-only link):\n${approve}`,
        "",
        `DECLINE:\n${decline}`,
        "",
        `Each link opens a short confirmation page first. They work for ${APPROVAL_LINK_DAYS} days and stop once anyone decides.`,
        "Please don't forward this email: the links act on your behalf. To contact the requester, write to them directly.",
      ].join("\n"),
    });
    if (res === "sent") sent++;
  }
  return { sent };
}

export type ApprovalTokenInfo = { request: AccessRequest; approverEmail: string };

/** The pending request behind an approval link, or null if unknown, expired, used or already decided. */
export async function resolveApprovalToken(token: string): Promise<ApprovalTokenInfo | null> {
  if (!TOKEN_RE.test(token)) return null;
  const t = rows<{ request_id: string; approver_email: string }>(await db.execute(sql`
    SELECT request_id, approver_email FROM "cat".access_request_tokens
    WHERE token_hash = ${sha256(token)} AND used_at IS NULL AND expires_at > now()`))[0];
  if (!t) return null;
  const request = rows<AccessRequest>(await db.execute(sql`
    SELECT * FROM "cat".access_requests WHERE id = ${t.request_id}::uuid AND status = 'pending'`))[0];
  return request ? { request, approverEmail: t.approver_email } : null;
}

/** Act on an approval link (called from the confirmation page's button, never from a GET). */
export async function decideByToken(opts: { token: string; decision: "approve" | "decline"; days: number; note?: string | null; tellThem?: boolean }):
  Promise<{ ok?: string; error?: string }> {
  const info = await resolveApprovalToken(opts.token);
  if (!info) return { error: "This link has expired, was already used, or the request was already decided." };
  // The approver must still be an approver now (role removed or list changed since the email -> link is dead).
  if (!(await approverEmails()).includes(info.approverEmail.toLowerCase())) {
    return { error: "You're no longer an approver for these requests. Ask a Hub admin." };
  }
  // Spend the token first, so it can't be used twice.
  const spent = rows<{ token_hash: string }>(await db.execute(sql`
    UPDATE "cat".access_request_tokens SET used_at = now()
    WHERE token_hash = ${sha256(opts.token)} AND used_at IS NULL RETURNING token_hash`))[0];
  if (!spent) return { error: "This link was already used." };
  const r = info.request;
  if (opts.decision === "approve") {
    const res = await approveAccessRequest({
      id: r.id, days: opts.days, landscape: r.landscape_slug ?? "all", userId: null, sendLink: true,
      note: opts.note ?? null, via: "email", byEmail: info.approverEmail,
    });
    if (res.error) return { error: res.error };
    return { ok: res.emailed?.startsWith("Emailed") ? `Approved. ${r.name} has been emailed their link.` : `Approved, but the email to ${r.name} didn't go out (${res.emailed ?? "unknown"}). Open Access requests in the Hub admin to copy the link.` };
  }
  const res = await declineAccessRequest({ id: r.id, userId: null, note: opts.note ?? null, tellThem: opts.tellThem !== false, via: "email", byEmail: info.approverEmail });
  if (res.error) return { error: res.error };
  return { ok: `Declined. ${res.emailed ?? ""}`.trim() };
}
