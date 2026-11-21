import { createHash, randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";

/**
 * Ask v2 reader session: a server-issued random token in an httpOnly cookie.
 * Only its sha256 is stored (cat.conversations.session_token_hash), so a
 * database leak does not let anyone read another reader's conversations.
 *
 * SameSite=Lax keeps the cookie off cross-site POSTs; the route also requires
 * a JSON content type, which forces a CORS preflight for cross-origin callers.
 */

export const ASK_COOKIE = "cat_ask_sid";
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/; // 32 random bytes, base64url
const MAX_AGE_SEC = 60 * 60 * 24 * 30;

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Reads the reader's session, or mints a new one (the caller must then set the cookie). */
export function readOrMintSession(req: NextRequest): { tokenHash: string; setCookie: string | null } {
  const existing = req.cookies.get(ASK_COOKIE)?.value;
  if (existing && TOKEN_RE.test(existing)) return { tokenHash: hashToken(existing), setCookie: null };
  const token = randomBytes(32).toString("base64url");
  return { tokenHash: hashToken(token), setCookie: sessionCookie(token) };
}

/** Reads the session without minting one (history lookups). */
export function readSession(req: NextRequest): string | null {
  const existing = req.cookies.get(ASK_COOKIE)?.value;
  return existing && TOKEN_RE.test(existing) ? hashToken(existing) : null;
}

function sessionCookie(token: string): string {
  const parts = [
    `${ASK_COOKIE}=${token}`,
    "Path=/api/agent",
    `Max-Age=${MAX_AGE_SEC}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}
