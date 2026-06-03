import type { NextAuthConfig } from "next-auth";
import Resend from "next-auth/providers/resend";

/**
 * Edge-safe Auth.js config: providers + callbacks that never touch the
 * database. Shared by `middleware.ts` (runs on the edge) and the full
 * server config in `auth.ts` (which adds the Drizzle adapter).
 *
 * Session strategy is JWT so the middleware can authorise requests from the
 * cookie without a database round-trip (our pg pool is not edge-compatible).
 * The Drizzle adapter is still used by `auth.ts` to persist users and the
 * magic-link verification tokens.
 */
export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/admin/login",
    verifyRequest: "/admin/login?sent=1",
    error: "/admin/login",
  },
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.RESEND_FROM_EMAIL,
    }),
  ],
  callbacks: {
    // Gate /admin in middleware. Only editor/admin roles may enter; the login
    // page itself is always reachable so unauthenticated users can sign in.
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      if (!pathname.startsWith("/admin")) return true;
      if (pathname === "/admin/login") return true;
      const role = (auth?.user as { role?: string } | undefined)?.role;
      return role === "admin" || role === "editor";
    },
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role ?? "reader";
        token.uid = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string | undefined;
        (session.user as { id?: string }).id = token.uid as string | undefined;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
