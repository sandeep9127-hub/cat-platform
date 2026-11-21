import { createHash, randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * Private share links for the full investment table.
 * The URL carries a random 256-bit token; only its sha256 is stored, so the
 * database can't be used to rebuild a link. Every link expires (max 366 days),
 * can be revoked, and logs each view and download (IP stored only as a salted
 * hash that changes daily).
 */

export type ShareScope = "landscape_full_table" | "all_landscapes_full_table";

export type ShareLink = {
  id: string;
  scope: ShareScope;
  landscape_slug: string | null;
  label: string;
  allow_download: boolean;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  created_by_email: string | null;
  views: number;
  last_viewed_at: string | null;
};

const rows = <T>(r: unknown) => (r as { rows: T[] }).rows;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

export async function createShareLink(opts: {
  scope: ShareScope;
  landscapeSlug: string | null;
  label: string;
  days: number;
  allowDownload: boolean;
  userId: string | null;
}): Promise<{ token: string; id: string; expiresAt: string }> {
  const label = opts.label.trim().slice(0, 200);
  if (!label) throw new Error("Say who the link is for");
  const days = Math.min(365, Math.max(1, Math.floor(opts.days)));
  if (opts.scope === "landscape_full_table" && !opts.landscapeSlug) throw new Error("Landscape missing");
  const token = randomBytes(32).toString("base64url"); // 43 chars
  const r = rows<{ id: string; expires_at: string }>(await db.execute(sql`
    INSERT INTO "cat".share_links (token_hash, scope, landscape_slug, label, allow_download, created_by, expires_at)
    VALUES (${sha256(token)}, ${opts.scope}, ${opts.scope === "landscape_full_table" ? opts.landscapeSlug : null},
            ${label}, ${opts.allowDownload}, ${opts.userId && UUID.test(opts.userId) ? opts.userId : null},
            now() + make_interval(days => ${days}))
    RETURNING id, expires_at`))[0];
  return { token, id: r.id, expiresAt: r.expires_at };
}

export async function listShareLinks(landscapeSlug?: string | null): Promise<ShareLink[]> {
  const where = landscapeSlug
    ? sql`WHERE l.landscape_slug = ${landscapeSlug} OR l.scope = 'all_landscapes_full_table'`
    : sql``;
  return rows<ShareLink>(await db.execute(sql`
    SELECT l.id, l.scope, l.landscape_slug, l.label, l.allow_download, l.created_at, l.expires_at, l.revoked_at,
           u.email AS created_by_email,
           (SELECT count(*)::int FROM "cat".share_link_views v WHERE v.link_id = l.id) AS views,
           (SELECT max(viewed_at) FROM "cat".share_link_views v WHERE v.link_id = l.id) AS last_viewed_at
    FROM "cat".share_links l LEFT JOIN "cat".users u ON u.id = l.created_by
    ${where}
    ORDER BY l.revoked_at IS NOT NULL, l.expires_at < now(), l.created_at DESC`));
}

export async function revokeShareLink(id: string, userId: string | null): Promise<void> {
  if (!UUID.test(id)) return;
  await db.execute(sql`
    UPDATE "cat".share_links SET revoked_at = now(), revoked_by = ${userId && UUID.test(userId) ? userId : null}
    WHERE id = ${id}::uuid AND revoked_at IS NULL`);
}

export type ResolvedLink = { id: string; scope: ShareScope; landscape_slug: string | null; label: string; allow_download: boolean; expires_at: string };

/** The live link for a token, or null if unknown, expired or revoked. */
export async function resolveShareToken(token: string): Promise<ResolvedLink | null> {
  if (!TOKEN_RE.test(token)) return null;
  return rows<ResolvedLink>(await db.execute(sql`
    SELECT id, scope, landscape_slug, label, allow_download, expires_at
    FROM "cat".share_links
    WHERE token_hash = ${sha256(token)} AND revoked_at IS NULL AND expires_at > now()
    LIMIT 1`))[0] ?? null;
}

export async function logShareView(linkId: string, ip: string, userAgent: string | null, action: "view" | "download"): Promise<void> {
  const day = new Date().toISOString().slice(0, 10);
  const salt = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "cat-share";
  try {
    await db.execute(sql`
      INSERT INTO "cat".share_link_views (link_id, ip_hash, user_agent, action)
      VALUES (${linkId}::uuid, ${sha256(`${salt}|${day}|${ip}`)}, ${userAgent?.slice(0, 300) ?? null}, ${action})`);
  } catch (e) {
    console.error("[share] view log failed", (e as Error).message);
  }
}
