"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { approveAccessRequest, declineAccessRequest, submitAccessRequest } from "@/lib/access/requests";
import { writeAudit } from "@/lib/audit";

async function editor() {
  const session = await auth();
  const user = session?.user as { id?: string; email?: string | null; role?: string } | undefined;
  if (user?.role !== "admin" && user?.role !== "editor") return null;
  return user;
}

export type DecideState = { url?: string; emailed?: string; error?: string; done?: "approved" | "declined" };

export async function decideAccessAction(_prev: DecideState, form: FormData): Promise<DecideState> {
  const user = await editor();
  if (!user) return { error: "You need to be signed in as an editor." };
  const id = String(form.get("id") ?? "");
  const note = String(form.get("note") ?? "").trim() || null;
  if (form.get("decision") === "approve") {
    const r = await approveAccessRequest({
      id, userId: user.id ?? null, note,
      days: Number(form.get("days") ?? 90) || 90,
      landscape: String(form.get("landscape") ?? "all"),
      sendLink: form.get("sendLink") === "on",
    });
    if (!r.error) {
      await writeAudit({ actorUserId: user.id ?? null, actorEmail: user.email ?? null, action: "access_request.approve", entityType: "access_request", entityId: id, meta: { emailed: r.emailed ?? null } });
      revalidatePath("/admin/access-requests");
    }
    return r.error ? { error: r.error } : { ...r, done: "approved" };
  }
  const r = await declineAccessRequest({ id, userId: user.id ?? null, note, tellThem: form.get("tellThem") === "on" });
  if (!r.error) {
    await writeAudit({ actorUserId: user.id ?? null, actorEmail: user.email ?? null, action: "access_request.decline", entityType: "access_request", entityId: id });
    revalidatePath("/admin/access-requests");
  }
  return r.error ? { error: r.error } : { ...r, done: "declined" };
}

export type RecordState = { ok?: boolean; error?: string };

/** An editor records a request that arrived by email, so it follows the same approval path. */
export async function recordEmailRequestAction(_prev: RecordState, form: FormData): Promise<RecordState> {
  const user = await editor();
  if (!user) return { error: "You need to be signed in as an editor." };
  const r = await submitAccessRequest({
    name: String(form.get("name") ?? ""), email: String(form.get("email") ?? ""),
    organisation: String(form.get("organisation") ?? ""), role: String(form.get("role") ?? ""),
    purpose: String(form.get("purpose") ?? ""), landscape: String(form.get("landscape") ?? "all"), channel: "email",
  });
  if (r.error) return { error: r.error };
  await writeAudit({ actorUserId: user.id ?? null, actorEmail: user.email ?? null, action: "access_request.record_email", entityType: "access_request", entityId: r.id ?? null });
  revalidatePath("/admin/access-requests");
  return { ok: true };
}
