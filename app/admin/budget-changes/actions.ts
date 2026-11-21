"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { decideChanges } from "@/lib/admin/budget-changes";
import { writeAudit } from "@/lib/audit";

// A Server Action, so Next.js rejects cross-origin posts (CSRF) before this runs.
export async function decideAction(form: FormData): Promise<void> {
  const session = await auth();
  const user = session?.user as { id?: string; email?: string | null; role?: string } | undefined;
  if (user?.role !== "admin" && user?.role !== "editor") redirect("/signin");
  const decision = form.get("decision")?.toString();
  if (decision !== "approve" && decision !== "reject") redirect("/admin/budget-changes");
  const ids = form.getAll("id").map(String);
  const note = form.get("note")?.toString() || null;
  const r = await decideChanges({ ids, decision, userId: user.id ?? null, note });
  await writeAudit({
    actorUserId: user.id ?? null, actorEmail: user.email ?? null, action: `budget_changes.${decision}`,
    entityType: "intervention_change", entityId: null, meta: { count: r.decided, landscapes: r.landscapes },
  });
  revalidatePath("/admin/budget-changes");
  redirect(`/admin/budget-changes?done=${decision}:${r.decided}`);
}
