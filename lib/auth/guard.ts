import { redirect } from "next/navigation";
import { auth } from "@/auth";

export type AdminSession = {
  user: { id?: string; email?: string | null; name?: string | null; role?: string };
};

/**
 * Server-side gate for protected admin pages and route handlers. Redirects to
 * the login page unless the caller is a signed-in editor or admin. Middleware
 * already blocks the routes; this is defence in depth + gives pages the session.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || (role !== "admin" && role !== "editor")) {
    redirect("/admin/login");
  }
  return session as AdminSession;
}

export function isAdmin(session: AdminSession | null | undefined): boolean {
  return (session?.user as { role?: string } | undefined)?.role === "admin";
}
