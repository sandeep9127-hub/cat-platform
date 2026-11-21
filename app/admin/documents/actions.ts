"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { writeAudit } from "@/lib/audit";
import { confirmUpload, processUploadJob, startUpload, validateUploadMeta } from "@/lib/ingest/uploads";

async function editor() {
  const session = await auth();
  const user = session?.user as { id?: string; email?: string | null; role?: string } | undefined;
  return user?.role === "admin" || user?.role === "editor" ? user : null;
}

export async function startUploadAction(meta: Record<string, unknown>): Promise<{ jobId?: string; putUrl?: string; error?: string }> {
  const user = await editor();
  if (!user) return { error: "You need to be signed in as an editor." };
  const v = validateUploadMeta(meta as never);
  if (!v.meta) return { error: v.error };
  try {
    const r = await startUpload(v.meta, user.id ?? null);
    await writeAudit({ actorUserId: user.id ?? null, actorEmail: user.email ?? null, action: "document.upload_started", entityType: "job", entityId: r.jobId, meta: { title: v.meta.title } });
    return r;
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Verify the stored file and process it now; if this request runs out of time, the nightly sync finishes it. */
export async function finishUploadAction(jobId: string): Promise<{ ok?: string; error?: string }> {
  const user = await editor();
  if (!user) return { error: "You need to be signed in as an editor." };
  const c = await confirmUpload(jobId);
  if (c.error) return c;
  const r = await processUploadJob(jobId);
  await writeAudit({ actorUserId: user.id ?? null, actorEmail: user.email ?? null, action: r.ok ? "document.published" : "document.upload_failed", entityType: "job", entityId: jobId, meta: r });
  revalidatePath("/admin/documents");
  return r;
}
