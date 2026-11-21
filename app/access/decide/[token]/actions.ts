"use server";

import { headers } from "next/headers";
import { decideByToken } from "@/lib/access/requests";
import { writeAudit } from "@/lib/audit";
import { getClientIp, rateLimit } from "@/lib/security/ratelimit";

export type DecideState = { ok?: string; error?: string };

// Server Action (origin-checked). The token in the form is the approver's own link.
export async function decideByEmailAction(_prev: DecideState, form: FormData): Promise<DecideState> {
  const ip = getClientIp({ headers: await headers() } as unknown as Request);
  const limited = await rateLimit({ key: "access-decide", ip, limit: 20, windowSec: 3600 });
  if (!limited.ok) return { error: "Too many attempts. Please try again later." };
  const decision = form.get("decision") === "approve" ? "approve" : form.get("decision") === "decline" ? "decline" : null;
  if (!decision) return { error: "Choose Approve or Decline." };
  const token = String(form.get("token") ?? "");
  const r = await decideByToken({
    token, decision,
    days: Number(form.get("days") ?? 90) || 90,
    note: String(form.get("note") ?? "").trim() || null,
    tellThem: form.get("tellThem") === "on",
  });
  if (r.ok) await writeAudit({ actorEmail: null, action: `access_request.${decision}.email_link`, entityType: "access_request", entityId: null, meta: { result: r.ok } });
  return r;
}
