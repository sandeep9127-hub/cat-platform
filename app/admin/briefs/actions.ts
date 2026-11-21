"use server";

import { createHash } from "node:crypto";
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
  // Every denial is auditable. Rate-limited attempts are always logged; other denials are
  // capped at 20 per editor per hour, and reaching the cap is itself logged once, so
  // suppression is visible. The attempted landscape is kept in a cleaned, bounded form.
  const known = Object.hasOwn(LANDSCAPES, slug);
  const principal = createHash("sha256").update(`brief-denied|${user.id ?? user.email ?? "editor"}`).digest("hex").slice(0, 32);
  const denied = async (reason: string) => {
    const write = (action: string, meta: Record<string, unknown>) =>
      writeAudit({
        ...actor, action, entityType: "landscape", entityId: known ? slug : "unknown",
        meta: { reason, ran: false, ...(known ? {} : { attempted: slug.replace(/[^\w-]/g, "?").slice(0, 40) }), ...meta },
      });
    const cap = await rateLimit({ key: `brief-denied:${principal}`, ip: "audit", limit: 21, windowSec: 3600 });
    if (cap.ok && cap.remaining > 0) return write("brief.generate.denied", {});
    if (cap.ok) return write("brief.generate.denied.suppressing", { note: "further denials this hour are not logged individually" });
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
