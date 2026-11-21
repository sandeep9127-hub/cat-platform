"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { writeAudit } from "@/lib/audit";
import { generateBrief, getBrief } from "@/lib/briefs/generate";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { rateLimit } from "@/lib/security/ratelimit";

export async function generateBriefAction(form: FormData): Promise<void> {
  const session = await auth();
  const user = session?.user as { id?: string; email?: string | null; role?: string } | undefined;
  if (user?.role !== "admin" && user?.role !== "editor") return;
  const slug = String(form.get("slug") ?? "");
  const actor = { actorUserId: user.id ?? null, actorEmail: user.email ?? null };
  // Denials are logged, but at most 20 per editor per hour, and an unknown landscape's text is never stored.
  const denied = async (reason: string) => {
    const cap = await rateLimit({ key: `brief-denied:${user.id ?? user.email ?? "editor"}`, ip: "audit", limit: 20, windowSec: 3600 });
    if (!cap.ok) return;
    await writeAudit({ ...actor, action: "brief.generate.denied", entityType: "landscape",
      entityId: reason === "unknown-landscape" ? null : slug, meta: { reason, ran: false } });
  };
  if (!Object.hasOwn(LANDSCAPES, slug)) return void (await denied("unknown-landscape"));
  // Only rebuild when it's genuinely missing or out of date (the server decides, not the form),
  // and at most once per landscape every 10 minutes, so the AI budget can't be drained by clicks.
  const existing = await getBrief(slug);
  if (existing?.current) return void (await denied("already-current"));
  const limited = await rateLimit({ key: `brief:${slug}`, ip: "editor", limit: 1, windowSec: 600 });
  if (!limited.ok) return void (await denied("rate-limited"));
  const r = await generateBrief(slug, { force: true });
  await writeAudit({ actorUserId: user.id ?? null, actorEmail: user.email ?? null, action: "brief.generate", entityType: "landscape", entityId: slug, meta: { ran: true, error: r.error ?? null, costUsd: r.costUsd ?? null } });
  revalidatePath("/admin/briefs");
  revalidatePath(`/admin/briefs/${slug}`);
}
