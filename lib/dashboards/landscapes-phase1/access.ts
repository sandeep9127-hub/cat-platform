import { cookies } from "next/headers";
import { auth } from "@/auth";
import { resolveShareToken, type ResolvedLink } from "@/lib/share/links";

/**
 * Who may open the "All landscapes, Phase 1" dashboard: signed-in editors and
 * admins, or someone holding a live, approved share link. A share link is
 * opened once at /share/<token>, which keeps the token in an httpOnly cookie
 * scoped to /dashboards; every visit re-checks it, so revoking or expiry takes
 * effect at once.
 */
export const DASH_PATH = "/dashboards/landscapes-phase-1";
export const SHARE_COOKIE = "cat_dash_link";

export type DashAccess =
  | { kind: "editor"; userId: string | null; email: string | null }
  | { kind: "link"; link: ResolvedLink };

export async function dashboardAccess(): Promise<DashAccess | null> {
  const session = await auth();
  const u = session?.user as { id?: string; email?: string | null; role?: string } | undefined;
  if (u && (u.role === "admin" || u.role === "editor")) return { kind: "editor", userId: u.id ?? null, email: u.email ?? null };
  const token = (await cookies()).get(SHARE_COOKIE)?.value;
  if (!token) return null;
  const link = await resolveShareToken(token);
  return link ? { kind: "link", link } : null;
}
