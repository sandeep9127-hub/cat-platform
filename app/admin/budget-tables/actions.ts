"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { createShareLink, revokeShareLink, shareEmail, shareUrl } from "@/lib/share/links";
import { sendEmail } from "@/lib/notify/email";
import { writeAudit } from "@/lib/audit";

async function editor() {
  const session = await auth();
  const user = session?.user as { id?: string; email?: string | null; role?: string } | undefined;
  if (user?.role !== "admin" && user?.role !== "editor") throw new Error("Unauthorized");
  return user;
}

export type CreateState = { url?: string; expiresAt?: string; error?: string; emailed?: string };
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function createLinkAction(_prev: CreateState, form: FormData): Promise<CreateState> {
  let user;
  try {
    user = await editor();
  } catch {
    return { error: "You need to be signed in as an editor." };
  }
  const slug = String(form.get("landscape") ?? "");
  const all = slug === "all";
  if (!all && !Object.hasOwn(LANDSCAPES, slug)) return { error: "Unknown landscape." };
  const label = String(form.get("label") ?? "").trim();
  if (!label) return { error: "Say who the link is for (it appears in the view log)." };
  const days = Number(form.get("days") ?? 30);
  try {
    const r = await createShareLink({
      scope: all ? "all_landscapes_full_table" : "landscape_full_table",
      landscapeSlug: all ? null : slug,
      label,
      days: Number.isFinite(days) ? days : 30,
      userId: user.id ?? null,
    });
    await writeAudit({
      actorUserId: user.id ?? null, actorEmail: user.email ?? null, action: "share_link.create", entityType: "share_link", entityId: r.id,
    }).catch(() => {});
    const url = await shareUrl(r.token);
    if (!url) {
      await revokeShareLink(r.id, user.id ?? null);
      return { error: "NEXT_PUBLIC_SITE_URL is not set on the server, so the link can't be built. Nothing was shared." };
    }
    // Optional: email the link straight to the person (e.g. someone who asked by email).
    const emailTo = String(form.get("emailTo") ?? "").trim();
    let emailed: string | undefined;
    if (emailTo) {
      if (!EMAIL_RE.test(emailTo) || emailTo.length > 254) return { url, expiresAt: r.expiresAt, error: "That email address doesn't look right; the link was created but not sent." };
      const scopeName = all ? "all landscapes" : LANDSCAPES[slug].name;
      const res = await sendEmail({ to: emailTo, ...shareEmail({ name: "", url, scopeName, expiresAt: r.expiresAt }) });
      emailed = res === "sent" ? `Emailed to ${emailTo}.` : res === "disabled" ? "Email isn't configured on this server; send the link yourself." : `Email failed (${res.slice(8, 120)}); send the link yourself.`;
      await writeAudit({ actorUserId: user.id ?? null, actorEmail: user.email ?? null, action: "share_link.email", entityType: "share_link", entityId: r.id, meta: { result: res } });
    }
    revalidatePath(`/admin/budget-tables/${slug}`);
    revalidatePath("/admin/budget-tables");
    return { url, expiresAt: r.expiresAt, emailed };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function revokeLinkAction(form: FormData): Promise<void> {
  const user = await editor();
  const id = String(form.get("id") ?? "");
  await revokeShareLink(id, user.id ?? null);
  await writeAudit({ actorUserId: user.id ?? null, actorEmail: user.email ?? null, action: "share_link.revoke", entityType: "share_link", entityId: id }).catch(() => {});
  revalidatePath(`/admin/budget-tables/${String(form.get("landscape") ?? "")}`);
  revalidatePath("/admin/budget-tables");
}

/* ---------- Phase 1 sheet snapshots (admins only) ---------- */

export type SyncState = { error?: string };

async function admin() {
  const session = await auth();
  const user = session?.user as { id?: string; email?: string | null; role?: string } | undefined;
  if (user?.role !== "admin") throw new Error("Only admins can update the investment figures.");
  return { userId: user.id ?? null, email: user.email ?? null };
}

/** Read the sheet now, check its layout and keep it as a draft for review. Nothing changes on the site yet. */
export async function updateFromSheetAction(_prev: SyncState, _form: FormData): Promise<SyncState> {
  let id: string;
  try {
    const actor = await admin();
    const { fetchSheetLive } = await import("@/lib/dashboards/landscapes-phase1/sheet");
    const { saveDraft } = await import("@/lib/dashboards/landscapes-phase1/snapshot");
    id = await saveDraft(await fetchSheetLive(), actor);
    await writeAudit({ actorUserId: actor.userId, actorEmail: actor.email, action: "phase1.fetch", entityType: "phase1_snapshot", entityId: id }).catch(() => {});
  } catch (e) {
    return { error: `The sheet wasn't loaded: ${(e as Error).message}` };
  }
  redirect(`/admin/budget-tables?draft=${id}`);
}

async function publishOrRestore(form: FormData, action: "publish" | "restore"): Promise<SyncState> {
  const id = String(form.get("id") ?? "");
  try {
    const actor = await admin();
    const { publishSnapshot } = await import("@/lib/dashboards/landscapes-phase1/snapshot");
    await publishSnapshot(id, actor, action);
  } catch (e) {
    return { error: `Not ${action === "publish" ? "published" : "restored"}: ${(e as Error).message}` };
  }
  revalidatePath("/admin/budget-tables");
  redirect(`/admin/budget-tables?${action === "publish" ? "published" : "restored"}=${id}`);
}

export async function publishSnapshotAction(_prev: SyncState, form: FormData): Promise<SyncState> {
  return publishOrRestore(form, "publish");
}

export async function restoreSnapshotAction(_prev: SyncState, form: FormData): Promise<SyncState> {
  return publishOrRestore(form, "restore");
}
