import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js config: callbacks only, NO providers. Shared by
 * `middleware.ts` (edge) and the full server config in `auth.ts`.
 *
 * The Resend email provider is deliberately NOT here: email providers require
 * a database adapter, which the edge middleware can't load (our pg pool is not
 * edge-compatible). Including it made `auth()` throw `MissingAdapter` on every
 * /admin request. Providers + adapter live only in `auth.ts` (Node runtime).
 *
 * Session strategy is JWT so middleware can authorise from the cookie without
 * a database round-trip.
 */
export const authConfig = {
  trustHost: true,
  // 7-day JWT sessions (down from the 30-day default) so a revoked or demoted
  // admin's existing token expires sooner; admins simply re-request a link.
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: {
    signIn: "/signin",
    verifyRequest: "/signin?sent=1",
    error: "/signin",
  },
  providers: [],
  callbacks: {
    // Gate /admin in middleware. Only editor/admin roles may enter; the login
    // page itself is always reachable so unauthenticated users can sign in.
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      // Gate the admin desk and its API routes; everything else is public.
      if (!pathname.startsWith("/admin") && !pathname.startsWith("/api/admin")) return true;
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
