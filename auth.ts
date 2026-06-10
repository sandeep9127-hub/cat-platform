import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, accounts, sessions, verificationTokens } from "@/lib/db/schema";
import { authConfig } from "@/auth.config";
import { verifyPassword } from "@/lib/auth/password";
import { rateLimit, getClientIp } from "@/lib/security/ratelimit";

/**
 * Full server-side Auth.js instance. Adds the Drizzle adapter (for user +
 * verification-token persistence) and an allowlist sign-in check on top of the
 * edge-safe `authConfig`. Imported only from Node contexts (route handlers,
 * server components), never from middleware.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // The email provider + adapter live only here (Node runtime), not in the
  // edge middleware config — see the note in auth.config.ts.
  providers: [
    // Primary: email + password for admins/editors.
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(creds, req) {
        const email = String(creds?.email ?? "").trim().toLowerCase();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;
        // Throttle by IP so the login form can't be brute-forced.
        const ip = getClientIp(req as Request);
        const limited = await rateLimit({ key: "signin-pw", ip, limit: 8, windowSec: 600 });
        if (!limited.ok) return null;
        const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        // Only admins/editors with a set password can log in. Return null (not
        // an error) on any failure so we never reveal which part was wrong.
        if (!u || (u.role !== "admin" && u.role !== "editor")) return null;
        if (!verifyPassword(password, u.passwordHash)) return null;
        return { id: u.id, email: u.email, name: u.name, role: u.role };
      },
    }),
    // Fallback / recovery: one-time email sign-in link (also used to set a
    // password the first time, since a password reset always needs email).
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.RESEND_FROM_EMAIL,
    }),
  ],
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  callbacks: {
    ...authConfig.callbacks,
    // Allowlist: a magic link only grants access to accounts that have been
    // pre-provisioned with an editor or admin role. Everyone else is denied,
    // even though the adapter may have created a stray reader row.
    async signIn({ user }) {
      if (!user?.email) return false;
      const rows = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.email, user.email))
        .limit(1);
      const role = rows[0]?.role;
      return role === "admin" || role === "editor";
    },
  },
});
