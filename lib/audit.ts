import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";

type AuditEntry = {
  actorUserId?: string | null;
  actorEmail?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  meta?: Record<string, unknown>;
};

/**
 * Append a row to the admin audit log. Best-effort: never throws into the
 * caller's request path (a failed log shouldn't fail an approval).
 */
export async function writeAudit(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(auditLog).values({
      actorUserId: entry.actorUserId ?? null,
      actorEmail: entry.actorEmail ?? null,
      action: entry.action,
      entityType: entry.entityType ?? null,
      entityId: entry.entityId ?? null,
      meta: entry.meta ?? null,
    });
  } catch (err) {
    console.error("[audit] failed to write", entry.action, err);
  }
}
