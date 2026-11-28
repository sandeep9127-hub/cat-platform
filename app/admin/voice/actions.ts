"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { markVoiceTurn, SHOULD_HAVE, type ShouldHave } from "@/lib/admin/voice-turns";
import { writeAudit } from "@/lib/audit";

// A Server Action, so Next.js rejects cross-origin posts (CSRF) before this runs.
export async function markTurnAction(form: FormData): Promise<void> {
  const session = await auth();
  const user = session?.user as { id?: string; email?: string | null; role?: string } | undefined;
  if (user?.role !== "admin" && user?.role !== "editor") redirect("/signin");
  const id = form.get("id")?.toString() ?? "";
  const verdict = form.get("verdict")?.toString();
  const wrong = verdict === "wrong" ? true : verdict === "right" ? false : verdict === "clear" ? null : undefined;
  const back = safeBack(form.get("back")?.toString());
  if (wrong === undefined) redirect(back);
  const raw = form.get("should")?.toString() ?? "";
  const shouldHave = (SHOULD_HAVE as readonly string[]).includes(raw) ? (raw as ShouldHave) : null;
  const note = form.get("note")?.toString().slice(0, 300) ?? null;
  const teach = wrong === true && form.get("teach") === "on";
  const ok = await markVoiceTurn({ id, wrong, shouldHave, note, teach });
  if (ok) {
    await writeAudit({
      actorUserId: user.id ?? null, actorEmail: user.email ?? null, action: `voice_turn.${verdict}`,
      entityType: "voice_turn", entityId: id, meta: shouldHave ? { shouldHave, teach } : undefined,
    });
  }
  revalidatePath("/admin/voice");
  redirect(back);
}

/** Only ever return to the voice page itself (keeps its filters), never an outside address. */
function safeBack(v: string | undefined): string {
  return v && /^\/admin\/voice(\?[a-z0-9_=&-]*)?$/i.test(v) ? v : "/admin/voice";
}
