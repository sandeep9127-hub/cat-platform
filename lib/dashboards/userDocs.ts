import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * Private per-user documents for Hub dashboards (notes, saved views), in
 * "cat".dashboard_user_docs. Every query is scoped to the signed-in user's id,
 * so one person never reads or writes another's.
 */
export type DocKind = "note" | "view";
export type UserDoc = { kind: DocKind; key: string; data: Record<string, unknown>; updated_at: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KEY = /^[\p{L}\p{N} ._:–-]{1,100}$/u;
const rows = <T>(r: unknown) => (r as { rows: T[] }).rows;

export function validKey(k: unknown): k is string {
  return typeof k === "string" && KEY.test(k);
}

export async function listDocs(userId: string, dashboard: string): Promise<UserDoc[]> {
  if (!UUID.test(userId)) return [];
  return rows<UserDoc>(await db.execute(sql`
    SELECT kind, doc_key AS key, data, updated_at FROM "cat".dashboard_user_docs
    WHERE user_id = ${userId}::uuid AND dashboard = ${dashboard} ORDER BY updated_at DESC LIMIT 500`));
}

export async function putDoc(userId: string, dashboard: string, kind: DocKind, key: string, data: Record<string, unknown>): Promise<void> {
  if (!UUID.test(userId)) throw new Error("No user");
  await db.execute(sql`
    INSERT INTO "cat".dashboard_user_docs (user_id, dashboard, kind, doc_key, data, updated_at)
    VALUES (${userId}::uuid, ${dashboard}, ${kind}, ${key}, ${JSON.stringify(data)}::jsonb, now())
    ON CONFLICT (user_id, dashboard, kind, doc_key) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`);
}

export async function deleteDoc(userId: string, dashboard: string, kind: DocKind, key: string): Promise<void> {
  if (!UUID.test(userId)) return;
  await db.execute(sql`
    DELETE FROM "cat".dashboard_user_docs
    WHERE user_id = ${userId}::uuid AND dashboard = ${dashboard} AND kind = ${kind} AND doc_key = ${key}`);
}
