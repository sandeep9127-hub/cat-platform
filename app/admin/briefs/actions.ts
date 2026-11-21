"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { writeAudit } from "@/lib/audit";
import { generateBrief } from "@/lib/briefs/generate";

export async function generateBriefAction(form: FormData): Promise<void> {
  const session = await auth();
  const user = session?.user as { id?: string; email?: string | null; role?: string } | undefined;
  if (user?.role !== "admin" && user?.role !== "editor") return;
  const slug = String(form.get("slug") ?? "");
  const r = await generateBrief(slug, { force: form.get("force") === "1" });
  await writeAudit({ actorUserId: user.id ?? null, actorEmail: user.email ?? null, action: "brief.generate", entityType: "landscape", entityId: slug, meta: { cached: r.cached ?? false, error: r.error ?? null, costUsd: r.costUsd ?? null } });
  revalidatePath("/admin/briefs");
  revalidatePath(`/admin/briefs/${slug}`);
}
