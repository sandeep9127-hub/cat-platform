import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * Private documents for Hub dashboards (notes, saved views), in
 * "cat".dashboard_user_docs. The owner is "user:<id>" for a signed-in editor or
 * "link:<share link id>" for an approved share-link holder; every query is
 * scoped to one owner, so nobody reads or writes another's.
 */
export type DocKind = "note" | "view";
export type UserDoc = { kind: DocKind; key: string; data: Record<string, unknown>; updated_at: string };

const OWNER = /^(user|link):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KEY = /^[\p{L}\p{N} ._:–-]{1,100}$/u;
const rows = <T>(r: unknown) => (r as { rows: T[] }).rows;

export function validKey(k: unknown): k is string {
  return typeof k === "string" && KEY.test(k);
}

export async function listDocs(owner: string, dashboard: string): Promise<UserDoc[]> {
  if (!OWNER.test(owner)) return [];
  return rows<UserDoc>(await db.execute(sql`
    SELECT kind, doc_key AS key, data, updated_at FROM "cat".dashboard_user_docs
    WHERE owner = ${owner} AND dashboard = ${dashboard} ORDER BY updated_at DESC LIMIT 500`));
}

export async function putDoc(owner: string, dashboard: string, kind: DocKind, key: string, data: Record<string, unknown>): Promise<void> {
  if (!OWNER.test(owner)) throw new Error("No owner");
  await db.execute(sql`
    INSERT INTO "cat".dashboard_user_docs (owner, dashboard, kind, doc_key, data, updated_at)
    VALUES (${owner}, ${dashboard}, ${kind}, ${key}, ${JSON.stringify(data)}::jsonb, now())
    ON CONFLICT (owner, dashboard, kind, doc_key) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`);
}

export async function deleteDoc(owner: string, dashboard: string, kind: DocKind, key: string): Promise<void> {
  if (!OWNER.test(owner)) return;
  await db.execute(sql`
    DELETE FROM "cat".dashboard_user_docs
    WHERE owner = ${owner} AND dashboard = ${dashboard} AND kind = ${kind} AND doc_key = ${key}`);
}
