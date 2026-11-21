"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { createShareLink, revokeShareLink } from "@/lib/share/links";
import { writeAudit } from "@/lib/audit";

async function editor() {
  const session = await auth();
  const user = session?.user as { id?: string; email?: string | null; role?: string } | undefined;
  if (user?.role !== "admin" && user?.role !== "editor") throw new Error("Unauthorized");
  return user;
}

export type CreateState = { url?: string; expiresAt?: string; error?: string };

export async function createLinkAction(_prev: CreateState, form: FormData): Promise<CreateState> {
  let user;
  try {
    user = await editor();
  } catch {
    return { error: "You need to be signed in as an editor." };
  }
  const slug = String(form.get("landscape") ?? "");
  const all = slug === "all";
  if (!all && !LANDSCAPES[slug]) return { error: "Unknown landscape." };
  const label = String(form.get("label") ?? "").trim();
  if (!label) return { error: "Say who the link is for (it appears in the view log)." };
  const days = Number(form.get("days") ?? 30);
  try {
    const r = await createShareLink({
      scope: all ? "all_landscapes_full_table" : "landscape_full_table",
      landscapeSlug: all ? null : slug,
      label,
      days: Number.isFinite(days) ? days : 30,
      allowDownload: form.get("download") === "on",
      userId: user.id ?? null,
    });
    await writeAudit({
      actorUserId: user.id ?? null, actorEmail: user.email ?? null, action: "share_link.create", entityType: "share_link", entityId: r.id,
    }).catch(() => {});
    // The configured site address. The request's Host header is trusted only for
    // local development, so a spoofed host can't put the token on another domain.
    let base = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
    if (!/^https?:\/\/[^/]+$/.test(base)) {
      const host = (await headers()).get("host") ?? "";
      if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) {
        await revokeShareLink(r.id, user.id ?? null);
        return { error: "NEXT_PUBLIC_SITE_URL is not set on the server, so the link can't be built. Nothing was shared." };
      }
      base = `http://${host}`;
    }
    revalidatePath(`/admin/budget-tables/${slug}`);
    return { url: `${base}/share/${r.token}`, expiresAt: r.expiresAt };
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
}
